import { LoadTestRunner } from '../load-runner';
import { RequestResult } from '../api-client';
import { SystemSnapshot } from '../metrics-collector';
import { generateMarkdownReport } from './markdown-template';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestConfig {
  concurrency: number;
  totalRequests?: number;
  duration?: number;
  randomize: boolean;
  delayRange?: [number, number];
  testName?: string;
  includeHealthCheck: boolean;
  apiBaseUrl: string;
  outputDir: string;
}

export interface TestReport {
  config: TestConfig;
  startTime: number;
  endTime: number;
  duration: number;
  requests: RequestResult[];
  systemSnapshots: SystemSnapshot[];
  summary: {
    totalRequests: number;
    successful: number;
    failed: number;
    successRate: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    p99_9: number;
    requestsPerSecond: number;
  };
  endpointStats: Map<string, EndpointStats>;
  errors: ErrorBreakdown;
}

export interface EndpointStats {
  endpoint: string;
  method: string;
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50: number;
  p95: number;
  p99: number;
  statusCodes: Map<number, number>;
}

export interface ErrorBreakdown {
  byStatusCode: Map<number, number>;
  byEndpoint: Map<string, number>;
  timeline: Array<{ timestamp: number; count: number }>;
}

export class ReportGenerator {
  generateReport(runner: LoadTestRunner): TestReport {
    const requests = runner.getRequests();
    const snapshots = runner.getSnapshots();
    const config = runner.getConfig();

    // Calculate summary statistics
    const responseTimes = requests
      .filter(r => r.statusCode >= 200 && r.statusCode < 300)
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    const successful = requests.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failed = requests.length - successful;

    const summary = {
      totalRequests: requests.length,
      successful,
      failed,
      successRate: requests.length > 0 ? (successful / requests.length) * 100 : 0,
      avgResponseTime: responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0,
      minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
      maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
      p50: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99),
      p99_9: this.calculatePercentile(responseTimes, 99.9),
      requestsPerSecond: runner.getDuration() > 0
        ? requests.length / (runner.getDuration() / 1000)
        : 0,
    };

    // Calculate endpoint statistics
    const endpointStats = this.calculateEndpointStats(requests);

    // Calculate error breakdown
    const errors = this.calculateErrorBreakdown(requests);

    return {
      config,
      startTime: runner.getStartTime(),
      endTime: runner.getEndTime(),
      duration: runner.getDuration(),
      requests,
      systemSnapshots: snapshots,
      summary,
      endpointStats,
      errors,
    };
  }

  async generateMarkdown(report: TestReport): Promise<string> {
    return generateMarkdownReport(report);
  }

  async exportJson(report: TestReport, filePath: string): Promise<void> {
    // Convert Maps to objects for JSON serialization
    const reportJson = {
      ...report,
      endpointStats: Object.fromEntries(
        Array.from(report.endpointStats.entries()).map(([key, value]) => [
          key,
          {
            ...value,
            statusCodes: Object.fromEntries(value.statusCodes),
          },
        ])
      ),
      errors: {
        byStatusCode: Object.fromEntries(report.errors.byStatusCode),
        byEndpoint: Object.fromEntries(report.errors.byEndpoint),
        timeline: report.errors.timeline,
      },
    };

    await fs.writeFile(filePath, JSON.stringify(reportJson, null, 2), 'utf-8');
  }

  async exportCsv(report: TestReport, filePath: string): Promise<void> {
    const lines: string[] = [];
    
    // CSV header
    lines.push('timestamp,endpoint,method,statusCode,responseTime,error,requestId,documentId');

    // CSV rows
    for (const request of report.requests) {
      const row = [
        request.timestamp.toString(),
        request.endpoint,
        request.method,
        request.statusCode.toString(),
        request.responseTime.toString(),
        request.error || '',
        request.requestId,
        request.documentId || '',
      ].map(field => `"${field.replace(/"/g, '""')}"`).join(',');
      lines.push(row);
    }

    await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
  }

  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateEndpointStats(requests: RequestResult[]): Map<string, EndpointStats> {
    const statsMap = new Map<string, EndpointStats>();

    for (const request of requests) {
      const key = `${request.method} ${request.endpoint}`;
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          endpoint: request.endpoint,
          method: request.method,
          total: 0,
          successful: 0,
          failed: 0,
          successRate: 0,
          avgResponseTime: 0,
          minResponseTime: Infinity,
          maxResponseTime: 0,
          p50: 0,
          p95: 0,
          p99: 0,
          statusCodes: new Map(),
        });
      }

      const stats = statsMap.get(key)!;
      stats.total++;
      if (request.statusCode >= 200 && request.statusCode < 300) {
        stats.successful++;
      } else {
        stats.failed++;
      }

      // Update status code count
      const codeCount = stats.statusCodes.get(request.statusCode) || 0;
      stats.statusCodes.set(request.statusCode, codeCount + 1);
    }

    // Calculate derived statistics for each endpoint
    for (const [key, stats] of statsMap.entries()) {
      const endpointRequests = requests.filter(
        r => `${r.method} ${r.endpoint}` === key
      );
      const responseTimes = endpointRequests
        .filter(r => r.statusCode >= 200 && r.statusCode < 300)
        .map(r => r.responseTime)
        .sort((a, b) => a - b);

      stats.successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;
      stats.avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
      stats.minResponseTime = responseTimes.length > 0 ? responseTimes[0] : 0;
      stats.maxResponseTime = responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0;
      stats.p50 = this.calculatePercentile(responseTimes, 50);
      stats.p95 = this.calculatePercentile(responseTimes, 95);
      stats.p99 = this.calculatePercentile(responseTimes, 99);
    }

    return statsMap;
  }

  private calculateErrorBreakdown(requests: RequestResult[]): ErrorBreakdown {
    const byStatusCode = new Map<number, number>();
    const byEndpoint = new Map<string, number>();
    const errorTimeline: Array<{ timestamp: number; count: number }> = [];
    const timelineMap = new Map<number, number>();

    for (const request of requests) {
      if (request.statusCode >= 400 || request.error) {
        // Count by status code
        const codeCount = byStatusCode.get(request.statusCode) || 0;
        byStatusCode.set(request.statusCode, codeCount + 1);

        // Count by endpoint
        const endpointKey = `${request.method} ${request.endpoint}`;
        const endpointCount = byEndpoint.get(endpointKey) || 0;
        byEndpoint.set(endpointKey, endpointCount + 1);

        // Timeline (bucket by 10 seconds)
        const bucket = Math.floor(request.timestamp / 10000) * 10000;
        const bucketCount = timelineMap.get(bucket) || 0;
        timelineMap.set(bucket, bucketCount + 1);
      }
    }

    // Convert timeline map to array
    const sortedBuckets = Array.from(timelineMap.entries()).sort((a, b) => a[0] - b[0]);
    for (const [timestamp, count] of sortedBuckets) {
      errorTimeline.push({ timestamp, count });
    }

    return {
      byStatusCode,
      byEndpoint,
      timeline: errorTimeline,
    };
  }
}

