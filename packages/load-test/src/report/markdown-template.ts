import { TestReport, EndpointStats } from './report-generator';
import { generateTimeSeriesChart, generateDistributionChart } from './chart-utils';

export function generateMarkdownReport(report: TestReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# Load Test Report');
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  const startDate = new Date(report.startTime).toISOString();
  const endDate = new Date(report.endTime).toISOString();
  const durationSeconds = Math.round(report.duration / 1000);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const durationSecs = durationSeconds % 60;
  
  lines.push(`**Test Date:** ${startDate}`);
  lines.push(`**Duration:** ${durationMinutes}m ${durationSecs}s`);
  lines.push(`**Status:** ${report.summary.successRate >= 95 ? '✅ PASS' : '⚠️ WARNING'}`);
  lines.push('');

  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Requests | ${report.summary.totalRequests.toLocaleString()} |`);
  lines.push(`| Success Rate | ${report.summary.successRate.toFixed(2)}% |`);
  lines.push(`| Avg Response Time | ${report.summary.avgResponseTime.toFixed(0)}ms |`);
  lines.push(`| P95 Response Time | ${report.summary.p95.toFixed(0)}ms |`);
  lines.push(`| Requests/Second | ${report.summary.requestsPerSecond.toFixed(2)} |`);
  lines.push('');

  lines.push('---');
  lines.push('');

  // Performance Health Summary
  const uxScore = calculateUXScore(report);
  const healthStatus = uxScore >= 80 ? '✅ HEALTHY' : uxScore >= 60 ? '⚠️ DEGRADED' : '❌ CRITICAL';
  
  lines.push('## Performance Health');
  lines.push('');
  lines.push(`**Overall Health Score:** ${uxScore}/100 - ${healthStatus}`);
  lines.push('');
  
  // Calculate individual health indicators
  const maxEventLoopLag = report.systemSnapshots.length > 0
    ? Math.max(...report.systemSnapshots.map(s => s.eventLoopLag))
    : 0;
  const avgApiResponse = report.summary.avgResponseTime;
  const maxQueueDepth = report.systemSnapshots.length > 0
    ? Math.max(...report.systemSnapshots.map(s => s.queue.waiting))
    : 0;
  const avgCpu = report.systemSnapshots.length > 0
    ? report.systemSnapshots.reduce((sum, s) => sum + s.cpu, 0) / report.systemSnapshots.length
    : 0;
  
  lines.push('| Metric | Value | Status |');
  lines.push('|--------|-------|--------|');
  lines.push(`| Event Loop Lag (max) | ${maxEventLoopLag.toFixed(2)}ms | ${maxEventLoopLag < 10 ? '✅ Good' : maxEventLoopLag < 50 ? '⚠️ Elevated' : '❌ Critical'} |`);
  lines.push(`| API Response Time (avg) | ${avgApiResponse.toFixed(0)}ms | ${avgApiResponse < 200 ? '✅ Fast' : avgApiResponse < 500 ? '⚠️ Moderate' : '❌ Slow'} |`);
  lines.push(`| Queue Depth (max) | ${maxQueueDepth} | ${maxQueueDepth < 10 ? '✅ Normal' : maxQueueDepth < 30 ? '⚠️ Backlogged' : '❌ Overloaded'} |`);
  lines.push(`| CPU Usage (avg) | ${avgCpu.toFixed(1)}% | ${avgCpu < 70 ? '✅ Normal' : avgCpu < 85 ? '⚠️ High' : '❌ Critical'} |`);
  lines.push('');

  lines.push('---');
  lines.push('');

  // User Experience Impact
  lines.push('## User Experience Impact');
  lines.push('');
  lines.push('This section translates technical metrics into real-world user experience:');
  lines.push('');
  
  // Response time impact
  lines.push('### Response Time Impact');
  lines.push('');
  if (avgApiResponse < 200) {
    lines.push('- ✅ **Fast Response (< 200ms)**: Users experience instant feedback. Feels snappy and responsive.');
  } else if (avgApiResponse < 500) {
    lines.push('- ⚠️ **Moderate Response (200-500ms)**: Users notice slight delay but acceptable for most operations.');
  } else if (avgApiResponse < 1000) {
    lines.push('- ⚠️ **Slow Response (500-1000ms)**: Users experience noticeable delay. May feel sluggish.');
  } else {
    lines.push('- ❌ **Very Slow Response (> 1000ms)**: Users experience significant delay. Poor user experience.');
  }
  lines.push(`- **P95 Response Time**: ${report.summary.p95.toFixed(0)}ms - ${report.summary.p95 < 500 ? '95% of users experience fast responses' : report.summary.p95 < 1000 ? '95% of users experience acceptable delays' : '95% of users experience slow responses'}`);
  lines.push('');

  // Event loop lag impact
  lines.push('### Event Loop Lag Impact');
  lines.push('');
  if (maxEventLoopLag < 10) {
    lines.push('- ✅ **Healthy (< 10ms)**: No blocking detected. All operations remain responsive.');
  } else if (maxEventLoopLag < 50) {
    lines.push('- ⚠️ **Elevated (10-50ms)**: Minor blocking. Some operations may feel slightly delayed.');
  } else if (maxEventLoopLag < 100) {
    lines.push('- ⚠️ **High (50-100ms)**: Noticeable blocking. Users may experience delays in UI interactions.');
  } else {
    lines.push('- ❌ **Critical (> 100ms)**: Severe blocking. Users experience significant delays and potential timeouts.');
  }
  lines.push(`- **Max Event Loop Lag**: ${maxEventLoopLag.toFixed(2)}ms during test`);
  lines.push('');

  // Queue depth impact
  lines.push('### Queue Processing Impact');
  lines.push('');
  if (maxQueueDepth < 10) {
    lines.push('- ✅ **Normal Queue (< 10 jobs)**: Documents process quickly. Users see results promptly.');
  } else if (maxQueueDepth < 30) {
    lines.push('- ⚠️ **Backlogged (10-30 jobs)**: Some delay in processing. Users may wait longer for results.');
  } else if (maxQueueDepth < 50) {
    lines.push('- ⚠️ **Heavy Backlog (30-50 jobs)**: Significant delay. Users experience long wait times.');
  } else {
    lines.push('- ❌ **Overloaded (> 50 jobs)**: System struggling. Users experience very long wait times or timeouts.');
  }
  lines.push(`- **Max Queue Depth**: ${maxQueueDepth} jobs waiting`);
  lines.push('');

  // Concurrent users estimate
  const estimatedConcurrentUsers = estimateConcurrentUsers(report);
  lines.push('### Estimated Capacity');
  lines.push('');
  lines.push(`Based on this test configuration (${report.config.concurrency} concurrent requests):`);
  lines.push(`- **Test Load**: Simulated ${report.config.concurrency} concurrent users`);
  lines.push(`- **Success Rate**: ${report.summary.successRate.toFixed(1)}% - ${report.summary.successRate >= 99 ? 'Excellent reliability' : report.summary.successRate >= 95 ? 'Good reliability' : 'Needs improvement'}`);
  if (uxScore >= 80) {
    lines.push(`- **Capacity Assessment**: ✅ System can handle ${report.config.concurrency}+ concurrent users with good performance`);
  } else if (uxScore >= 60) {
    lines.push(`- **Capacity Assessment**: ⚠️ System handles ${report.config.concurrency} concurrent users but performance is degraded`);
  } else {
    lines.push(`- **Capacity Assessment**: ❌ System struggles with ${report.config.concurrency} concurrent users. Consider optimization or scaling.`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');

  // Test Configuration
  lines.push('## Test Configuration');
  lines.push('');
  lines.push('| Parameter | Value |');
  lines.push('|-----------|-------|');
  lines.push(`| Concurrency | ${report.config.concurrency} |`);
  lines.push(`| Total Requests | ${report.config.totalRequests || 'All files'} |`);
  lines.push(`| Test Duration | ${report.config.duration ? `${report.config.duration}s` : 'N/A'} |`);
  lines.push(`| Randomize | ${report.config.randomize ? 'Yes' : 'No'} |`);
  lines.push(`| Delay Range | ${report.config.delayRange ? `${report.config.delayRange[0]}-${report.config.delayRange[1]}ms` : 'N/A'} |`);
  lines.push(`| Include Health Check | ${report.config.includeHealthCheck ? 'Yes' : 'No'} |`);
  lines.push(`| API Base URL | ${report.config.apiBaseUrl} |`);
  lines.push('');

  lines.push('---');
  lines.push('');

  // Request Statistics
  lines.push('## Request Statistics');
  lines.push('');

  lines.push('### Overall Performance');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Requests | ${report.summary.totalRequests.toLocaleString()} |`);
  lines.push(`| Successful | ${report.summary.successful.toLocaleString()} (${report.summary.successRate.toFixed(2)}%) |`);
  lines.push(`| Failed | ${report.summary.failed.toLocaleString()} (${(100 - report.summary.successRate).toFixed(2)}%) |`);
  lines.push(`| Min Response Time | ${report.summary.minResponseTime.toFixed(0)}ms |`);
  lines.push(`| Max Response Time | ${report.summary.maxResponseTime.toFixed(0)}ms |`);
  lines.push(`| Average Response Time | ${report.summary.avgResponseTime.toFixed(0)}ms |`);
  lines.push(`| Median (P50) | ${report.summary.p50.toFixed(0)}ms |`);
  lines.push(`| P95 | ${report.summary.p95.toFixed(0)}ms |`);
  lines.push(`| P99 | ${report.summary.p99.toFixed(0)}ms |`);
  lines.push(`| P99.9 | ${report.summary.p99_9.toFixed(0)}ms |`);
  lines.push(`| Requests/Second (avg) | ${report.summary.requestsPerSecond.toFixed(2)} |`);
  lines.push('');

  // Response Time Distribution
  const responseTimes = report.requests
    .filter(r => r.statusCode >= 200 && r.statusCode < 300)
    .map(r => r.responseTime);

  if (responseTimes.length > 0) {
    lines.push('### Response Time Distribution');
    lines.push('');
    lines.push('```');
    lines.push(generateDistributionChart(responseTimes, 10));
    lines.push('```');
    lines.push('');
  }

  // Requests Per Second Over Time
  if (report.requests.length > 0) {
    const timestamps = report.requests.map(r => r.timestamp);
    const rpsValues = new Array(timestamps.length).fill(1); // Each request counts as 1
    
    lines.push('### Requests Per Second Over Time');
    lines.push('');
    lines.push('```');
    lines.push(generateTimeSeriesChart(timestamps, rpsValues, 10));
    lines.push('```');
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // System Metrics
  lines.push('## System Metrics');
  lines.push('');

  if (report.systemSnapshots.length > 0) {
    const cpuValues = report.systemSnapshots.map(s => s.cpu);
    const memValues = report.systemSnapshots.map(s => s.memory.used / 1024 / 1024); // MB
    const lagValues = report.systemSnapshots.map(s => s.eventLoopLag);
    const timestamps = report.systemSnapshots.map(s => s.timestamp);

    // CPU Usage
    lines.push('### CPU Usage Over Time');
    lines.push('');
    lines.push('```');
    lines.push(generateTimeSeriesChart(timestamps, cpuValues, 30));
    lines.push('```');
    lines.push('');

    // Memory Usage
    const memStart = memValues[0] || 0;
    const memPeak = Math.max(...memValues);
    const memEnd = memValues[memValues.length - 1] || 0;

    lines.push('### Memory Usage');
    lines.push('');
    lines.push('| Metric | Start | Peak | End | Change |');
    lines.push('|--------|-------|------|-----|--------|');
    lines.push(`| Heap Used | ${memStart.toFixed(0)} MB | ${memPeak.toFixed(0)} MB | ${memEnd.toFixed(0)} MB | ${(memEnd - memStart).toFixed(0)} MB |`);
    lines.push('');

    // Event Loop Lag
    const avgLag = lagValues.length > 0
      ? lagValues.reduce((a, b) => a + b, 0) / lagValues.length
      : 0;
    const maxLag = Math.max(...lagValues);

    lines.push('### Event Loop Lag');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Average Lag | ${avgLag.toFixed(2)}ms |`);
    lines.push(`| Max Lag | ${maxLag.toFixed(2)}ms |`);
    lines.push('');

    if (maxLag > 100) {
      lines.push('⚠️ **Warning:** Event loop lag exceeded 100ms threshold');
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  // Queue Metrics
  lines.push('## Queue Metrics');
  lines.push('');

  if (report.systemSnapshots.length > 0) {
    const waitingValues = report.systemSnapshots.map(s => s.queue.waiting);
    const activeValues = report.systemSnapshots.map(s => s.queue.active);
    const completedValues = report.systemSnapshots.map(s => s.queue.completed);
    const timestamps = report.systemSnapshots.map(s => s.timestamp);

    const maxWaiting = Math.max(...waitingValues);
    const maxActive = Math.max(...activeValues);
    const finalCompleted = completedValues[completedValues.length - 1] || 0;

    lines.push('### Queue Depth Over Time');
    lines.push('');
    lines.push('```');
    lines.push(generateTimeSeriesChart(timestamps, waitingValues, 30));
    lines.push('```');
    lines.push('');

    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Max Waiting | ${maxWaiting} |`);
    lines.push(`| Max Active | ${maxActive} |`);
    lines.push(`| Final Completed | ${finalCompleted} |`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // API Endpoint Analysis
  lines.push('## API Endpoint Analysis');
  lines.push('');

  for (const [key, stats] of report.endpointStats.entries()) {
    lines.push(`### ${stats.method} ${stats.endpoint}`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Requests | ${stats.total} |`);
    lines.push(`| Success Rate | ${stats.successRate.toFixed(2)}% |`);
    lines.push(`| Avg Response Time | ${stats.avgResponseTime.toFixed(0)}ms |`);
    lines.push(`| P95 Response Time | ${stats.p95.toFixed(0)}ms |`);
    lines.push(`| P99 Response Time | ${stats.p99.toFixed(0)}ms |`);
    lines.push('');

    if (stats.statusCodes.size > 0) {
      lines.push('**Status Codes:**');
      for (const [code, count] of stats.statusCodes.entries()) {
        lines.push(`- ${code}: ${count}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  // Error Analysis
  lines.push('## Error Analysis');
  lines.push('');

  if (report.errors.byStatusCode.size > 0) {
    lines.push('### Error Breakdown');
    lines.push('');
    lines.push('| Status Code | Count | Percentage |');
    lines.push('|------------|-------|------------|');
    
    for (const [code, count] of report.errors.byStatusCode.entries()) {
      const percentage = (count / report.summary.totalRequests) * 100;
      lines.push(`| ${code} | ${count} | ${percentage.toFixed(2)}% |`);
    }
    lines.push('');
  }

  if (report.errors.timeline.length > 0) {
    lines.push('### Error Timeline');
    lines.push('');
    lines.push('| Time (s) | Errors |');
    lines.push('|----------|--------|');
    
    for (const entry of report.errors.timeline) {
      const seconds = Math.floor((entry.timestamp - report.startTime) / 1000);
      lines.push(`| ${seconds} | ${entry.count} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Raw Data References
  const reportBaseName = `load-test-${new Date(report.startTime).toISOString().replace(/[:.]/g, '-').slice(0, -5)}`;
  lines.push('## Raw Data');
  lines.push('');
  lines.push(`- **JSON Export:** \`${report.config.outputDir}/${reportBaseName}.json\``);
  lines.push(`- **CSV Export:** \`${report.config.outputDir}/${reportBaseName}.csv\``);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`*Report generated at: ${new Date().toISOString()}*`);
  lines.push(`*Test ID: ${reportBaseName}*`);

  return lines.join('\n');
}

function calculateUXScore(report: TestReport): number {
  let score = 100;
  
  // Event loop lag penalty (max -30 points)
  const maxEventLoopLag = report.systemSnapshots.length > 0
    ? Math.max(...report.systemSnapshots.map(s => s.eventLoopLag))
    : 0;
  if (maxEventLoopLag > 100) score -= 30;
  else if (maxEventLoopLag > 50) score -= 15;
  else if (maxEventLoopLag > 10) score -= 5;
  
  // API response time penalty (max -30 points)
  const avgApiResponse = report.summary.avgResponseTime;
  if (avgApiResponse > 1000) score -= 30;
  else if (avgApiResponse > 500) score -= 15;
  else if (avgApiResponse > 200) score -= 5;
  
  // Queue depth penalty (max -20 points)
  const maxQueueDepth = report.systemSnapshots.length > 0
    ? Math.max(...report.systemSnapshots.map(s => s.queue.waiting))
    : 0;
  if (maxQueueDepth > 50) score -= 20;
  else if (maxQueueDepth > 30) score -= 10;
  else if (maxQueueDepth > 10) score -= 5;
  
  // CPU usage penalty (max -20 points)
  const avgCpu = report.systemSnapshots.length > 0
    ? report.systemSnapshots.reduce((sum, s) => sum + s.cpu, 0) / report.systemSnapshots.length
    : 0;
  if (avgCpu > 90) score -= 20;
  else if (avgCpu > 80) score -= 10;
  else if (avgCpu > 70) score -= 5;
  
  // Success rate penalty
  if (report.summary.successRate < 95) score -= 10;
  else if (report.summary.successRate < 99) score -= 5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function estimateConcurrentUsers(report: TestReport): number {
  // Simple estimation based on response time and success rate
  const baseCapacity = report.config.concurrency;
  const successRateFactor = report.summary.successRate / 100;
  const responseTimeFactor = report.summary.avgResponseTime < 500 ? 1 : 0.8;
  
  return Math.round(baseCapacity * successRateFactor * responseTimeFactor);
}

