import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { MetricsCollectorService } from '../services/metrics-collector.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsCollector: MetricsCollectorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.metricsCollector.recordApiRequest(duration);
      }),
    );
  }
}

