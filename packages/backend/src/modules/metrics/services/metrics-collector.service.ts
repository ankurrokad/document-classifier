import { Injectable } from '@nestjs/common';

interface JobRecord {
  jobId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
}

@Injectable()
export class MetricsCollectorService {
  private jobRecords = new Map<string, JobRecord>();
  private processingTimes: number[] = [];
  private apiRequests: number[] = [];
  private requestCount = 0;
  private sessionStartTime = Date.now();
  private completedJobs = 0;
  private failedJobs = 0;

  private readonly MAX_HISTORY_SIZE = parseInt(
    process.env.METRICS_HISTORY_SIZE || '1000',
    10,
  );

  recordJobStart(jobId: string, timestamp: number = Date.now()): void {
    this.jobRecords.set(jobId, {
      jobId,
      startTime: timestamp,
      success: false,
    });
  }

  recordJobComplete(
    jobId: string,
    success: boolean,
    timestamp: number = Date.now(),
  ): void {
    const record = this.jobRecords.get(jobId);
    if (!record) {
      return;
    }

    const duration = timestamp - record.startTime;
    record.endTime = timestamp;
    record.duration = duration;
    record.success = success;

    if (success) {
      this.completedJobs++;
      this.addProcessingTime(duration);
    } else {
      this.failedJobs++;
    }

    // Clean up old records (keep last N)
    if (this.jobRecords.size > this.MAX_HISTORY_SIZE) {
      const oldestKey = Array.from(this.jobRecords.keys())[0];
      this.jobRecords.delete(oldestKey);
    }
  }

  recordApiRequest(duration: number): void {
    this.requestCount++;
    this.addApiRequestTime(duration);
  }

  private addProcessingTime(duration: number): void {
    this.processingTimes.push(duration);
    if (this.processingTimes.length > this.MAX_HISTORY_SIZE) {
      this.processingTimes.shift();
    }
  }

  private addApiRequestTime(duration: number): void {
    this.apiRequests.push(duration);
    if (this.apiRequests.length > this.MAX_HISTORY_SIZE) {
      this.apiRequests.shift();
    }
  }

  getProcessingMetrics() {
    if (this.processingTimes.length === 0) {
      return {
        avgTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        totalProcessed: this.completedJobs,
      };
    }

    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      avgTime: sum / sorted.length,
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      totalProcessed: this.completedJobs,
    };
  }

  getApiMetrics() {
    const elapsedMinutes = (Date.now() - this.sessionStartTime) / 1000 / 60;
    const requestsPerMinute =
      elapsedMinutes > 0 ? this.requestCount / elapsedMinutes : 0;

    const avgResponseTime =
      this.apiRequests.length > 0
        ? this.apiRequests.reduce((a, b) => a + b, 0) / this.apiRequests.length
        : 0;

    return {
      requestsPerMinute,
      avgResponseTime,
      totalRequests: this.requestCount,
    };
  }

  getJobCounts() {
    return {
      completed: this.completedJobs,
      failed: this.failedJobs,
    };
  }

  resetMetrics(): void {
    this.jobRecords.clear();
    this.processingTimes = [];
    this.apiRequests = [];
    this.requestCount = 0;
    this.sessionStartTime = Date.now();
    this.completedJobs = 0;
    this.failedJobs = 0;
  }

  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

