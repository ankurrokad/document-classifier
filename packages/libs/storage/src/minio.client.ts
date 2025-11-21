// @ts-ignore - minio doesn't have TypeScript types
import * as Minio from 'minio';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env file if not already loaded
// This ensures the storage library can work independently when imported
// We check if env vars are missing, and if so, try to load from .env file
if (!process.env.MINIO_ENDPOINT || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
  // Try multiple possible paths to find the root .env file
  // This works whether running from root, packages, or compiled dist folders
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'), // Current working directory
    path.resolve(process.cwd(), '../.env'), // One level up
    path.resolve(process.cwd(), '../../.env'), // Two levels up (from packages/*)
    path.resolve(process.cwd(), '../../../.env'), // Three levels up (from packages/libs/*)
    path.resolve(__dirname, '../../../../.env'), // From dist folder (compiled)
    path.resolve(__dirname, '../../../.env'), // Alternative from dist
  ];

  let envPath: string | undefined;
  for (const envFile of possiblePaths) {
    if (fs.existsSync(envFile)) {
      envPath = envFile;
      break;
    }
  }

  if (envPath) {
    dotenv.config({ path: envPath, override: false });
  } else {
    // Fallback: try default location
    dotenv.config({ override: false });
  }
}

export class MinioStorage {
  private client: Minio.Client;

  constructor() {
    // Validate required MinIO environment variables
    const required = ['MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY'];
    const missing = required.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      throw new Error(`MinioStorage: Missing required environment variables: ${missing.join(', ')}`);
    }

    const port = process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000;
    if (isNaN(port)) {
      throw new Error(`MinioStorage: MINIO_PORT must be a number, got: ${process.env.MINIO_PORT}`);
    }

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT!,
      port: port,
      useSSL: process.env.MINIO_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY!,
      secretKey: process.env.MINIO_SECRET_KEY!,
    });
  }

  async ensureBucket(bucket: string) {
    const exists = await this.client.bucketExists(bucket).catch(() => false);
    if (!exists) {
      await this.client.makeBucket(bucket);
    }
  }

  async uploadBuffer(bucket: string, key: string, buffer: Buffer, metadata?: Record<string, string>) {
    await this.ensureBucket(bucket);
    return this.client.putObject(bucket, key, buffer, buffer.length, metadata || {});
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async listObjects(bucket: string, prefix?: string): Promise<string[]> {
    await this.ensureBucket(bucket);
    const objects: string[] = [];
    const stream = this.client.listObjects(bucket, prefix || '', true);
    
    return new Promise((resolve, reject) => {
      stream.on('data', (obj: any) => {
        if (obj.name && obj.name.endsWith('.pdf')) {
          objects.push(obj.name);
        }
      });
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }
}

