import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { MinioStorage } from '@doc-clf/storage';

// Load .env file from root directory
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
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

export class MinioFileReader {
  private storage: MinioStorage;
  private bucket: string;

  constructor() {
    this.storage = new MinioStorage();
    this.bucket = process.env.MINIO_BUCKET_SYNTHETIC || 'documents-synth';
    
    if (!process.env.MINIO_BUCKET_SYNTHETIC) {
      console.warn(`MINIO_BUCKET_SYNTHETIC not set, using default: ${this.bucket}`);
    }
  }

  async listSyntheticFiles(): Promise<string[]> {
    const files = await this.storage.listObjects(this.bucket);
    
    // Shuffle for randomness
    const shuffled = [...files];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  async downloadFile(key: string): Promise<Buffer> {
    return await this.storage.download(this.bucket, key);
  }
}

