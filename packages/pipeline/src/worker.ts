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
import { DocumentModel, PatientModel, connectMongoDB } from '@doc-clf/dal';
import { OCRProcessor } from './processors/ocr.processor';
import { ClassifyProcessor } from './processors/classify.processor';
import { ExtractProcessor } from './processors/extract.processor';
import { MatchProcessor } from './processors/match.processor';
import { MetricsReporter } from './metrics/metrics-reporter';

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
const patientModel = new PatientModel();
const storage = new MinioStorage();
const metricsReporter = new MetricsReporter();

const worker = new Worker(
  'doc:process',
  async (job) => {
    const { documentId } = job.data;
    const jobId = job.id?.toString() || `job-${Date.now()}`;
    const startTime = Date.now();
    console.log('[worker] processing document', documentId);

    try {
      await metricsReporter.reportJobStart(jobId, documentId);
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

      // Stage 2: Classification
      try {
        await documentModel.addProcessingLog(documentId, 'classification', 'Starting classification');
        const classifyProcessor = new ClassifyProcessor();
        const classification = classifyProcessor.classify(ocrResult.rawText);
        await documentModel.updateClassification(
          documentId,
          classification.label,
          classification.confidence
        );
        console.log(`[worker] Classified document ${documentId} as ${classification.label}`);
      } catch (error: any) {
        console.error(`[worker] Classification error for document ${documentId}:`, error);
        await documentModel.updateErrorStatus(
          documentId,
          'classification',
          error.message || String(error)
        );
        // Continue pipeline even if classification fails
      }

      // Stage 3: Extraction
      try {
        // Get the document again to get classification
        const docWithClassification = await documentModel.findById(documentId);
        const docType = docWithClassification?.classification?.label || 'unknown';

        await documentModel.addProcessingLog(documentId, 'extraction', 'Starting field extraction');
        const extractProcessor = new ExtractProcessor();
        const extractedData = extractProcessor.extract(ocrResult.rawText, docType);
        
        // Preserve rawText from OCR
        extractedData.rawText = ocrResult.rawText;
        
        await documentModel.updateExtractedDataAndStatus(documentId, extractedData);
        console.log(`[worker] Extracted fields for document ${documentId}`);
      } catch (error: any) {
        console.error(`[worker] Extraction error for document ${documentId}:`, error);
        await documentModel.updateErrorStatus(
          documentId,
          'extraction',
          error.message || String(error)
        );
        // Continue pipeline even if extraction fails
      }

      // Stage 4: Patient Matching
      try {
        // Get the document again to get extracted data
        const docWithExtracted = await documentModel.findById(documentId);
        
        if (docWithExtracted?.extracted) {
          await documentModel.addProcessingLog(documentId, 'matching', 'Starting patient matching');
          const matchProcessor = new MatchProcessor(patientModel);
          const matchResult = await matchProcessor.match(docWithExtracted.extracted);
          
          await documentModel.updatePatientMatch(
            documentId,
            matchResult.patientId,
            matchResult.matchMethod,
            matchResult.confidence
          );

          // If patient matched, add document to patient's documents array
          if (matchResult.patientId) {
            await patientModel.addDocument(matchResult.patientId, documentId);
            console.log(`[worker] Matched document ${documentId} to patient ${matchResult.patientId}`);
          } else {
            console.log(`[worker] No patient match found for document ${documentId}`);
          }
        }
      } catch (error: any) {
        console.error(`[worker] Matching error for document ${documentId}:`, error);
        await documentModel.updateErrorStatus(
          documentId,
          'matching',
          error.message || String(error)
        );
        // Continue pipeline even if matching fails
      }

      // Stage 5: Mark as complete
      await documentModel.markComplete(documentId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Report metrics
      await metricsReporter.reportJobComplete({
        jobId,
        documentId,
        startTime,
        endTime,
        duration,
        success: true,
      });
      
      console.log(`[worker] Processing complete for document ${documentId}`);
    } catch (error: any) {
      console.error(`[worker] Error processing document ${documentId}:`, error);

      // Report failed job metrics
      const endTime = Date.now();
      const duration = endTime - startTime;
      await metricsReporter.reportJobComplete({
        jobId,
        documentId,
        startTime,
        endTime,
        duration,
        success: false,
      });

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
