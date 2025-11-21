import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient } from 'redis';
import { MetricsCollectorService } from './metrics-collector.service';

@Injectable()
export class WorkerMetricsSubscriberService
  implements OnModuleInit, OnModuleDestroy
{
  private subscriber: ReturnType<typeof createClient> | null = null;
  private readonly CHANNEL = 'metrics:worker:jobs';

  constructor(private metricsCollector: MetricsCollectorService) {}

  async onModuleInit() {
    try {
      const client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT || 6379),
        },
      });

      client.on('error', (err) => {
        console.error('[WorkerMetricsSubscriber] Redis error:', err);
      });

      await client.connect();
      this.subscriber = client;

      // Subscribe to worker metrics channel
      await this.subscriber.subscribe(this.CHANNEL, (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'job_complete') {
            this.handleJobComplete(data.data);
          }
        } catch (error) {
          console.error(
            '[WorkerMetricsSubscriber] Failed to parse message:',
            error,
          );
        }
      });

      console.log('[WorkerMetricsSubscriber] Subscribed to worker metrics');
    } catch (error) {
      console.error(
        '[WorkerMetricsSubscriber] Failed to connect to Redis:',
        error,
      );
      // Continue without worker metrics subscription
    }
  }

  async onModuleDestroy() {
    if (this.subscriber && this.subscriber.isOpen) {
      await this.subscriber.quit();
    }
  }

  private handleJobComplete(metrics: {
    jobId: string;
    documentId: string;
    startTime: number;
    endTime: number;
    duration: number;
    success: boolean;
  }): void {
    // Record job metrics in the collector
    this.metricsCollector.recordJobStart(metrics.jobId, metrics.startTime);
    this.metricsCollector.recordJobComplete(
      metrics.jobId,
      metrics.success,
      metrics.endTime,
    );
  }
}

