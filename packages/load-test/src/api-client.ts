import axios, { AxiosInstance } from 'axios';
import pLimit from 'p-limit';
import FormData from 'form-data';

export interface RequestResult {
  timestamp: number;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  error?: string;
  requestId: string;
  documentId?: string;
}

export class LoadTestApiClient {
  private client: AxiosInstance;
  private limit: ReturnType<typeof pLimit>;
  private requestCounter = 0;

  constructor(baseUrl: string = 'http://localhost:3000', concurrency: number = 10) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000, // 30 second timeout
    });
    this.limit = pLimit(concurrency);
  }

  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<RequestResult> {
    const requestId = `req-${++this.requestCounter}-${Date.now()}`;
    const startTime = Date.now();
    
    try {
      const response = await this.limit(() => {
        if (method === 'GET') {
          return this.client.get<T>(endpoint, { headers });
        } else {
          return this.client.post<T>(endpoint, data, { headers });
        }
      });

      const responseTime = Date.now() - startTime;
      
      return {
        timestamp: startTime,
        endpoint,
        method,
        statusCode: response.status,
        responseTime,
        requestId,
        documentId: (response.data as any)?.documentId,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = error.response?.status || 0;
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';

      return {
        timestamp: startTime,
        endpoint,
        method,
        statusCode,
        responseTime,
        error: errorMessage,
        requestId,
      };
    }
  }

  async uploadDocument(file: Buffer, filename: string): Promise<RequestResult> {
    // Use form-data for Node.js
    const form = new FormData();
    form.append('file', file, {
      filename: filename,
      contentType: 'application/pdf',
    });

    const headers = form.getHeaders();
    return this.makeRequest('POST', '/documents', form, headers);
  }

  async getHealthQuick(): Promise<RequestResult> {
    return this.makeRequest('GET', '/documents/health/quick');
  }

  async getDocument(id: string): Promise<RequestResult> {
    return this.makeRequest('GET', `/documents/${id}`);
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

