import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DashboardController } from './controllers/dashboard.controller';
import { MetricsGateway } from './gateways/metrics.gateway';
import { MetricsCollectorService } from './services/metrics-collector.service';
import { SystemMetricsService } from './services/system-metrics.service';
import { QueueMetricsService } from './services/queue-metrics.service';
import { WorkerMetricsSubscriberService } from './services/worker-metrics-subscriber.service';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

@Module({
  controllers: [DashboardController],
  providers: [
    MetricsCollectorService,
    SystemMetricsService,
    QueueMetricsService,
    WorkerMetricsSubscriberService,
    MetricsGateway,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [MetricsCollectorService],
})
export class MetricsModule {}

