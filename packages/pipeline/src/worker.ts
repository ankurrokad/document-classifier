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
import mongoose from 'mongoose';
import { MinioStorage } from '@doc-clf/storage';

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

mongoose.connect(process.env.MONGO_URI!);
const storage = new MinioStorage();

const worker = new Worker(
  'doc:process',
  async (job) => {
    const { documentId } = job.data;
    console.log('[worker] processing document', documentId);

    // TODO: load PDF from MinIO → OCR → classify → extract → upload artifacts → update Mongo
  },
  {
    connection: { host: process.env.REDIS_HOST!, port: redisPort },
  }
);

console.log('Worker started...');
