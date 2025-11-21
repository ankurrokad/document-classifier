export function generateAsciiChart(
  data: number[],
  labels: string[],
  maxWidth: number = 50
): string {
  if (data.length === 0 || labels.length !== data.length) {
    return 'No data available';
  }

  const maxValue = Math.max(...data);
  if (maxValue === 0) {
    return 'All values are zero';
  }

  const lines: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const barLength = Math.round((value / maxValue) * maxWidth);
    const bar = '█'.repeat(barLength);
    const label = labels[i].padEnd(15);
    lines.push(`${label} |${bar} ${value.toFixed(2)}`);
  }

  return lines.join('\n');
}

export function generateTimeSeriesChart(
  timestamps: number[],
  values: number[],
  bucketSize: number = 60 // seconds
): string {
  if (timestamps.length === 0 || timestamps.length !== values.length) {
    return 'No data available';
  }

  // Group data into buckets
  const buckets: Map<number, { sum: number; count: number }> = new Map();
  const startTime = timestamps[0];
  const endTime = timestamps[timestamps.length - 1];

  for (let i = 0; i < timestamps.length; i++) {
    const time = timestamps[i];
    const value = values[i];
    const bucket = Math.floor((time - startTime) / (bucketSize * 1000));

    if (!buckets.has(bucket)) {
      buckets.set(bucket, { sum: 0, count: 0 });
    }

    const bucketData = buckets.get(bucket)!;
    bucketData.sum += value;
    bucketData.count += 1;
  }

  // Convert to arrays for charting
  const bucketLabels: string[] = [];
  const bucketValues: number[] = [];
  const sortedBuckets = Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);

  for (const [bucket, data] of sortedBuckets) {
    const bucketStart = startTime + bucket * bucketSize * 1000;
    const minutes = Math.floor((bucketStart - startTime) / 1000 / 60);
    bucketLabels.push(`${minutes}m`);
    bucketValues.push(data.sum / data.count);
  }

  return generateAsciiChart(bucketValues, bucketLabels, 40);
}

export function generateDistributionChart(
  values: number[],
  buckets: number = 10
): string {
  if (values.length === 0) {
    return 'No data available';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const bucketSize = range / buckets;

  const bucketCounts: number[] = new Array(buckets).fill(0);
  const bucketLabels: string[] = [];

  for (const value of values) {
    let bucketIndex = Math.floor((value - min) / bucketSize);
    if (bucketIndex >= buckets) bucketIndex = buckets - 1;
    bucketCounts[bucketIndex]++;
  }

  for (let i = 0; i < buckets; i++) {
    const bucketMin = min + i * bucketSize;
    const bucketMax = min + (i + 1) * bucketSize;
    bucketLabels.push(`${bucketMin.toFixed(0)}-${bucketMax.toFixed(0)}`);
  }

  return generateAsciiChart(bucketCounts, bucketLabels, 40);
}

