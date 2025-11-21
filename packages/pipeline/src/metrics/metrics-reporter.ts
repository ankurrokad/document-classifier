import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { createClient } from 'redis';

// Load .env file
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

interface JobMetrics {
  jobId: string;
  documentId: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  stages?: {
    ocr?: number;
    classification?: number;
    extraction?: number;
    matching?: number;
  };
}

export class MetricsReporter {
  private redisClient: ReturnType<typeof createClient> | null = null;
  private readonly CHANNEL = 'metrics:worker:jobs';

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      const client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT || 6379),
        },
      });

      client.on('error', (err) => {
        console.error('[MetricsReporter] Redis error:', err);
      });

      await client.connect();
      this.redisClient = client;
      console.log('[MetricsReporter] Connected to Redis for metrics');
    } catch (error) {
      console.error('[MetricsReporter] Failed to connect to Redis:', error);
      // Continue without metrics reporting
    }
  }

  async reportJobStart(jobId: string, documentId: string): Promise<void> {
    // Job start is tracked, but we don't need to report it immediately
    // We'll report when the job completes
  }

  async reportJobComplete(metrics: JobMetrics): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      return;
    }

    try {
      await this.redisClient.publish(
        this.CHANNEL,
        JSON.stringify({
          type: 'job_complete',
          data: metrics,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error('[MetricsReporter] Failed to publish metrics:', error);
    }
  }

  async close(): Promise<void> {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
  }
}

