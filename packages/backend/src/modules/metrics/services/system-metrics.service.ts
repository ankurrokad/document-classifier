import { Injectable } from '@nestjs/common';

@Injectable()
export class SystemMetricsService {
  private lastCpuUsage = process.cpuUsage();
  private lastCheck = Date.now();
  private eventLoopLag = 0;

  constructor() {
    // Start measuring event loop lag periodically
    this.startEventLoopLagMeasurement();
  }

  getMemoryMetrics() {
    const memUsage = process.memoryUsage();
    return {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      external: memUsage.external,
    };
  }

  getCpuMetrics(): number {
    const current = process.cpuUsage(this.lastCpuUsage);
    const elapsed = (Date.now() - this.lastCheck) * 1000; // microseconds

    if (elapsed === 0) {
      return 0;
    }

    const totalCpu = current.user + current.system;
    const percent = (totalCpu / elapsed) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCheck = Date.now();

    return Math.min(100, Math.max(0, percent));
  }

  getEventLoopLag(): number {
    return this.eventLoopLag;
  }

  private startEventLoopLagMeasurement(): void {
    const measure = () => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const delta = process.hrtime.bigint() - start;
        this.eventLoopLag = Number(delta) / 1000000; // Convert to milliseconds
        measure(); // Continue measuring
      });
    };
    measure();
  }
}

