import axios, { AxiosInstance } from 'axios';

export interface SystemSnapshot {
  timestamp: number;
  cpu: number;
  memory: {
    used: number;
    total: number;
    external: number;
  };
  eventLoopLag: number;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    jobsPerMinute: number;
  };
  workers: {
    active: number;
  };
  api: {
    requestsPerMinute: number;
    avgResponseTime: number;
    totalRequests: number;
  };
}

export class SystemMetricsCollector {
  private client: AxiosInstance;
  private snapshots: SystemSnapshot[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
    });
  }

  async startCollecting(intervalMs: number = 2000): Promise<void> {
    // Collect initial snapshot
    await this.collectSnapshot();

    // Set up interval
    this.intervalId = setInterval(async () => {
      await this.collectSnapshot();
    }, intervalMs);
  }

  stopCollecting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async collectSnapshot(): Promise<void> {
    try {
      const response = await this.client.get('/api/metrics');
      const metrics = response.data;

      const snapshot: SystemSnapshot = {
        timestamp: Date.now(),
        cpu: metrics.system?.cpu || 0,
        memory: metrics.system?.memory || { used: 0, total: 0, external: 0 },
        eventLoopLag: metrics.system?.eventLoopLag || 0,
        queue: metrics.queue || {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          jobsPerMinute: 0,
        },
        workers: metrics.workers || { active: 0 },
        api: metrics.api || {
          requestsPerMinute: 0,
          avgResponseTime: 0,
          totalRequests: 0,
        },
      };

      this.snapshots.push(snapshot);
    } catch (error) {
      console.error('[MetricsCollector] Failed to collect snapshot:', error);
    }
  }

  getSnapshots(): SystemSnapshot[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots = [];
  }
}

