import { LocalFileReader } from './local-file-reader';
import { LoadTestApiClient, RequestResult } from './api-client';
import { SystemMetricsCollector, SystemSnapshot } from './metrics-collector';
import { TestConfig } from './report/report-generator';

export class LoadTestRunner {
  private config: TestConfig;
  private fileReader: LocalFileReader;
  private apiClient: LoadTestApiClient;
  private metricsCollector: SystemMetricsCollector;
  private requests: RequestResult[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private isRunning: boolean = false;

  constructor(config: TestConfig) {
    this.config = config;
    this.fileReader = new LocalFileReader();
    this.apiClient = new LoadTestApiClient(config.apiBaseUrl, config.concurrency);
    this.metricsCollector = new SystemMetricsCollector(config.apiBaseUrl);
  }

  async run(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Test is already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();

    try {
      console.log('[LoadTest] Starting load test...');
      console.log(`[LoadTest] Configuration:`, {
        concurrency: this.config.concurrency,
        totalRequests: this.config.totalRequests,
        duration: this.config.duration,
        includeHealthCheck: this.config.includeHealthCheck,
      });

      // Step 1: Read files from local data directory
      console.log('[LoadTest] Reading files from local data directory...');
      const files = await this.fileReader.listSyntheticFiles();
      console.log(`[LoadTest] Found ${files.length} PDF files`);

      if (files.length === 0) {
        throw new Error('No PDF files found in local data directory. Please generate synthetic documents first using: pnpm gen:documents');
      }

      // Limit files if totalRequests is specified
      const filesToUse = this.config.totalRequests
        ? files.slice(0, this.config.totalRequests)
        : files;

      // Step 2: Start metrics collection
      console.log('[LoadTest] Starting metrics collection...');
      await this.metricsCollector.startCollecting(2000);

      // Step 3: Run concurrent uploads
      console.log('[LoadTest] Starting concurrent uploads...');
      const uploadPromises: Promise<void>[] = [];
      let requestCount = 0;
      const maxRequests = this.config.totalRequests || filesToUse.length;
      const endTime = this.config.duration
        ? this.startTime + this.config.duration * 1000
        : Infinity;

      for (let i = 0; i < filesToUse.length && requestCount < maxRequests; i++) {
        // Check if we've exceeded duration
        if (Date.now() >= endTime) {
          break;
        }

        const fileKey = filesToUse[i];
        const filename = fileKey.split('/').pop() || `file-${i}.pdf`;

        // Add random delay if configured
        if (this.config.delayRange && this.config.randomize && i > 0) {
          const delay = Math.random() * (this.config.delayRange[1] - this.config.delayRange[0]) + this.config.delayRange[0];
          await this.apiClient.delay(delay);
        }

        // Upload document
        const uploadPromise = (async () => {
          try {
            const fileBuffer = await this.fileReader.downloadFile(fileKey);
            const result = await this.apiClient.uploadDocument(fileBuffer, filename);
            this.requests.push(result);
            requestCount++;

            // Optionally test health check
            if (this.config.includeHealthCheck && Math.random() < 0.1) {
              const healthResult = await this.apiClient.getHealthQuick();
              this.requests.push(healthResult);
            }
          } catch (error) {
            console.error(`[LoadTest] Error uploading file ${fileKey}:`, error);
          }
        })();

        uploadPromises.push(uploadPromise);

        // If we've reached concurrency limit, wait for one to complete
        if (uploadPromises.length >= this.config.concurrency) {
          const completedIdx = await Promise.race(
            uploadPromises.map((p, idx) => p.then(() => idx).catch(() => idx))
          );
          uploadPromises.splice(completedIdx, 1);
        }
      }

      // Wait for all remaining uploads to complete
      await Promise.all(uploadPromises);

      // Step 4: Stop metrics collection
      this.metricsCollector.stopCollecting();
      this.endTime = Date.now();

      console.log(`[LoadTest] Test completed. Total requests: ${this.requests.length}`);
      console.log(`[LoadTest] Duration: ${(this.endTime - this.startTime) / 1000}s`);

      this.isRunning = false;
    } catch (error) {
      this.metricsCollector.stopCollecting();
      this.endTime = Date.now();
      this.isRunning = false;
      throw error;
    }
  }

  getRequests(): RequestResult[] {
    return [...this.requests];
  }

  getSnapshots(): SystemSnapshot[] {
    return this.metricsCollector.getSnapshots();
  }

  getConfig(): TestConfig {
    return { ...this.config };
  }

  getStartTime(): number {
    return this.startTime;
  }

  getEndTime(): number {
    return this.endTime;
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }
}

