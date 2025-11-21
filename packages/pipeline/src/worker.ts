import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file from root directory
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];

let envPath: string | undefined;
for (const envFile of possiblePaths) {
  if (fs.existsSync(envFile)) {
    envPath = envFile;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import { Worker } from 'bullmq';
import { MinioStorage } from '@doc-clf/storage';
import { DocumentModel, connectMongoDB } from '@doc-clf/dal';
import { OCRProcessor } from './processors/ocr.processor';

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'REDIS_HOST', 'REDIS_PORT'];
const missing = requiredEnvVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
  console.error('Please check your .env file. See .env.example for reference.');
  process.exit(1);
}

// Validate Redis port is a number
const redisPort = Number(process.env.REDIS_PORT);
if (isNaN(redisPort)) {
  console.error(`ERROR: REDIS_PORT must be a number, got: ${process.env.REDIS_PORT}`);
  process.exit(1);
}

// Connect to MongoDB and initialize models
connectMongoDB().catch((err) => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

const documentModel = new DocumentModel();
const storage = new MinioStorage();

const worker = new Worker(
  'doc:process',
  async (job) => {
    const { documentId } = job.data;
    console.log('[worker] processing document', documentId);

    try {
      // Load document from MongoDB
      const doc = await documentModel.findById(documentId);
      
      if (!doc) {
        throw new Error(`Document ${documentId} not found`);
      }

      if (!doc.originalObjectKey) {
        throw new Error(`Document ${documentId} missing originalObjectKey`);
      }

      // Update status to processing and log start
      await documentModel.updateStatus(documentId, 'processing', {
        step: 'ocr',
        message: 'Starting OCR processing',
      });

      // Initialize OCR processor
      const ocrProcessor = new OCRProcessor(storage);

      // Run OCR processing
      const ocrResult = await ocrProcessor.process(documentId, doc.originalObjectKey);

      // Log intermediate steps
      await documentModel.addProcessingLog(documentId, 'ocr', `Downloaded PDF (${doc.originalObjectKey})`);
      await documentModel.addProcessingLog(documentId, 'ocr', `Converted PDF to ${ocrResult.pageCount} page(s)`);

      // Update document with OCR results
      await documentModel.updateOCRResults(
        documentId,
        ocrResult.rawText,
        ocrResult.pageCount,
        ocrResult.confidence
      );

      console.log(`[worker] OCR complete for document ${documentId}`);
    } catch (error: any) {
      console.error(`[worker] Error processing document ${documentId}:`, error);

      // Update document with error status and log
      try {
        await documentModel.updateErrorStatus(
          documentId,
          'ocr',
          error.message || String(error)
        );
      } catch (updateError) {
        console.error(`[worker] Failed to update error status for document ${documentId}:`, updateError);
      }

      // Re-throw error so BullMQ can handle retries
      throw error;
    }
  },
  {
    connection: { host: process.env.REDIS_HOST!, port: redisPort },
  }
);

console.log('Worker started...');
