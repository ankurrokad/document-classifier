import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MetricsCollectorService } from '../services/metrics-collector.service';
import { SystemMetricsService } from '../services/system-metrics.service';
import { QueueMetricsService } from '../services/queue-metrics.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MetricsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL_MS = parseInt(
    process.env.METRICS_UPDATE_INTERVAL || '2000',
    10,
  );

  constructor(
    private metricsCollector: MetricsCollectorService,
    private systemMetrics: SystemMetricsService,
    private queueMetrics: QueueMetricsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`[Metrics] Client connected: ${client.id}`);

    // Reset metrics when first client connects
    if (this.server.sockets.sockets.size === 1) {
      this.metricsCollector.resetMetrics();
    }

    // Send initial metrics
    this.sendMetrics(client);

    // Start periodic updates if not already running
    if (!this.updateInterval) {
      this.startPeriodicUpdates();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Metrics] Client disconnected: ${client.id}`);

    // Stop updates if no clients connected
    if (this.server.sockets.sockets.size === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      if (this.server.sockets.sockets.size > 0) {
        await this.broadcastMetrics();
      }
    }, this.UPDATE_INTERVAL_MS);
  }

  private async sendMetrics(client: Socket) {
    const metrics = await this.collectMetrics();
    client.emit('metrics', metrics);
  }

  private async broadcastMetrics() {
    const metrics = await this.collectMetrics();
    this.server.emit('metrics', metrics);
  }

  private async collectMetrics() {
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

