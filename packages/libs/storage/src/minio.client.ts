// @ts-ignore - minio doesn't have TypeScript types
import * as Minio from 'minio';

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

  async uploadBuffer(bucket: string, key: string, buffer: Buffer) {
    return this.client.putObject(bucket, key, buffer);
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
}

