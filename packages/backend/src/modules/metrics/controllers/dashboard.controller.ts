import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { MetricsCollectorService } from '../services/metrics-collector.service';
import { SystemMetricsService } from '../services/system-metrics.service';
import { QueueMetricsService } from '../services/queue-metrics.service';

@Controller()
export class DashboardController {
  private dashboardHtml: string;

  constructor(
    private metricsCollector: MetricsCollectorService,
    private systemMetrics: SystemMetricsService,
    private queueMetrics: QueueMetricsService,
  ) {
    // Load HTML template once at initialization
    // Try multiple paths to handle both dev and production
    const possiblePaths = [
      // Development: from src/modules/metrics/controllers/
      join(__dirname, '../views/dashboard.html'),
      // Production: from dist/modules/metrics/controllers/ -> go to src
      join(__dirname.replace(/dist[\\/]modules/, 'src/modules'), '../views/dashboard.html'),
      // Alternative: absolute path from project root
      join(process.cwd(), 'packages/backend/src/modules/metrics/views/dashboard.html'),
      // Fallback: if running from dist, try going up to project root
      join(__dirname, '../../../../src/modules/metrics/views/dashboard.html'),
    ];

    let loaded = false;
    for (const viewsPath of possiblePaths) {
      try {
        this.dashboardHtml = readFileSync(viewsPath, 'utf-8');
        console.log(`[Dashboard] Loaded template from: ${viewsPath}`);
        loaded = true;
        break;
      } catch (error) {
        // Try next path
        continue;
      }
    }

    if (!loaded) {
      console.error(`[Dashboard] Failed to load template. Tried paths:`, possiblePaths);
      console.error(`[Dashboard] __dirname: ${__dirname}`);
      console.error(`[Dashboard] process.cwd(): ${process.cwd()}`);
      // Fallback: provide a minimal error page
      this.dashboardHtml = '<html><body><h1>Dashboard template not found</h1><p>Check console for path details</p></body></html>';
    }
  }

  @Get('dashboard')
  getDashboard(@Res() res: Response) {
    res.send(this.dashboardHtml);
  }

  @Get('api/metrics')
  async getMetrics() {
    const [queue, processing, system, api, workers] = await Promise.all([
      this.queueMetrics.getQueueMetrics(),
      Promise.resolve(this.metricsCollector.getProcessingMetrics()),
      Promise.resolve({
        memory: this.systemMetrics.getMemoryMetrics(),
        cpu: this.systemMetrics.getCpuMetrics(),
        eventLoopLag: this.systemMetrics.getEventLoopLag(),
      }),
      Promise.resolve(this.metricsCollector.getApiMetrics()),
      this.queueMetrics.getActiveWorkersCount(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      queue,
      processing,
      system,
      api,
      workers: {
        active: workers,
      },
    };
  }


}

