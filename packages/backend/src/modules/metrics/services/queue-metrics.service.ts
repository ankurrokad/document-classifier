import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MetricsCollectorService } from './metrics-collector.service';

@Injectable()
export class QueueMetricsService implements OnModuleInit {
  private queue: Queue;
  private lastCompletedCount = 0;
  private lastCheckTime = Date.now();

  constructor(private metricsCollector: MetricsCollectorService) {}

  onModuleInit() {
    this.queue = new Queue('doc:process', {
      connection: {
        host: process.env.REDIS_HOST!,
        port: Number(process.env.REDIS_PORT!),
      },
    });
  }

  async getQueueMetrics() {
    if (!this.queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        jobsPerMinute: 0,
      };
    }

    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    // Calculate jobs per minute
    const now = Date.now();
    const elapsed = (now - this.lastCheckTime) / 1000 / 60; // minutes
    const completedDelta = completed - this.lastCompletedCount;
    const jobsPerMinute = elapsed > 0 ? completedDelta / elapsed : 0;

    this.lastCompletedCount = completed;
    this.lastCheckTime = now;

    // Get job counts from collector (since dashboard opened)
    const jobCounts = this.metricsCollector.getJobCounts();

    return {
      waiting,
      active,
      completed: jobCounts.completed, // Since dashboard opened
      failed: jobCounts.failed, // Since dashboard opened
      jobsPerMinute: Math.max(0, jobsPerMinute),
    };
  }

  async getActiveWorkersCount(): Promise<number> {
    if (!this.queue) {
      return 0;
    }
    try {
      const workers = await this.queue.getWorkers();
      return workers.length;
    } catch (error) {
      // If queue is not accessible, return 0
      return 0;
    }
  }
}

