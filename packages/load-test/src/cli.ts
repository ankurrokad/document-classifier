import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { LoadTestRunner } from './load-runner';
import { ReportGenerator } from './report/report-generator';
import * as process from 'process';

// Load .env file from root directory
const possiblePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../../../.env'),
  path.resolve(__dirname, '../../../../.env'),
];

let envPath: string | undefined;
for (const envFile of possiblePaths) {
  if (fs.existsSync(envFile)) {
    envPath = envFile;
    break;
  }
}

if (envPath) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Parse command-line arguments
function parseArgs(): {
  concurrency?: number;
  duration?: number;
  totalRequests?: number;
  outputDir?: string;
  apiUrl?: string;
  includeHealthCheck?: boolean;
} {
  const args: any = {};
  
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    
    if (arg === '--concurrency' && i + 1 < process.argv.length) {
      args.concurrency = parseInt(process.argv[++i], 10);
    } else if (arg === '--duration' && i + 1 < process.argv.length) {
      args.duration = parseInt(process.argv[++i], 10);
    } else if (arg === '--total-requests' && i + 1 < process.argv.length) {
      args.totalRequests = parseInt(process.argv[++i], 10);
    } else if (arg === '--output-dir' && i + 1 < process.argv.length) {
      args.outputDir = process.argv[++i];
    } else if (arg === '--api-url' && i + 1 < process.argv.length) {
      args.apiUrl = process.argv[++i];
    } else if (arg === '--health-check') {
      args.includeHealthCheck = true;
    }
  }
  
  return args;
}

async function main() {
  const cliArgs = parseArgs();

  // Default configuration
  const config = {
    concurrency: cliArgs.concurrency || 10,
    totalRequests: cliArgs.totalRequests,
    duration: cliArgs.duration,
    randomize: true,
    delayRange: [100, 500] as [number, number],
    testName: undefined,
    includeHealthCheck: cliArgs.includeHealthCheck || false,
    apiBaseUrl: cliArgs.apiUrl || 'http://localhost:3000',
    outputDir: cliArgs.outputDir || 'reports',
  };

  console.log('='.repeat(60));
  console.log('Load Test Configuration');
  console.log('='.repeat(60));
  console.log(JSON.stringify(config, null, 2));
  console.log('='.repeat(60));
  console.log('');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
    console.log(`[CLI] Created output directory: ${config.outputDir}`);
  }

  // Create runner and run test
  const runner = new LoadTestRunner(config);

  try {
    await runner.run();

    // Generate report
    console.log('[CLI] Generating report...');
    const reportGenerator = new ReportGenerator();
    const report = reportGenerator.generateReport(runner);

    // Generate markdown
    const markdown = await reportGenerator.generateMarkdown(report);
    const reportBaseName = `load-test-${new Date(report.startTime).toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
    const markdownPath = path.join(config.outputDir, `${reportBaseName}.md`);
    await fs.promises.writeFile(markdownPath, markdown, 'utf-8');
    console.log(`[CLI] Markdown report saved: ${markdownPath}`);

    console.log('');
    console.log('='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`);
    console.log(`Avg Response Time: ${report.summary.avgResponseTime.toFixed(0)}ms`);
    console.log(`P95 Response Time: ${report.summary.p95.toFixed(0)}ms`);
    console.log(`Requests/Second: ${report.summary.requestsPerSecond.toFixed(2)}`);
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('[CLI] Test failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[CLI] Fatal error:', error);
  process.exit(1);
});

