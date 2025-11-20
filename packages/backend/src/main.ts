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

// Validate required environment variables
const requiredEnvVars = ['MONGO_URI', 'REDIS_HOST', 'REDIS_PORT', 'MINIO_ENDPOINT', 'MINIO_ACCESS_KEY', 'MINIO_SECRET_KEY', 'MINIO_BUCKET_ORIGINAL'];
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

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(3000);
  console.log('API running on http://localhost:3000');
}
bootstrap();
