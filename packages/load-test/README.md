# Load Test Package

This package provides load testing capabilities for the document classifier API. It simulates concurrent document uploads and generates comprehensive performance reports.

## Prerequisites

- Node.js (v20 or higher)
- Synthetic test files generated in `.data` folder (see [Generating Test Data](#generating-test-data))
- Running document classifier API instance

## Generating Test Data

Before running load tests, you need to generate synthetic documents. From the project root:

```bash
# Generate patients first (if not already done)
pnpm gen:patients 100

# Generate synthetic documents (saves to .data/documents/original/)
pnpm gen:documents
```

This will create PDF files in the `.data/documents/original/` folder structure at the project root. The load test reads from this local directory instead of MinIO for optimal performance.

## Installation

From the project root, install dependencies:

```bash
npm install
```

Or from the load-test package directory:

```bash
cd packages/load-test
npm install
```

## Usage

### Basic Usage

Run the load test with default settings:

```bash
npm start
```

This will:
- Use 10 concurrent requests
- Read all PDF files from `.data/documents/original/` directory
- Test against `http://localhost:3000`
- Save reports to the `reports` directory

### Command-Line Options

The load test supports several command-line arguments:

| Option | Description | Default |
|--------|-------------|---------|
| `--concurrency` | Number of concurrent requests | `10` |
| `--duration` | Test duration in seconds | Unlimited |
| `--total-requests` | Maximum number of requests to send | All files in `.data` directory |
| `--api-url` | Base URL of the API to test | `http://localhost:3000` |
| `--output-dir` | Directory to save reports | `reports` |
| `--health-check` | Include health check requests (10% probability) | Disabled |

### Examples

#### Run with custom concurrency

```bash
npm start -- --concurrency 20
```

#### Run for a specific duration

```bash
npm start -- --duration 60
```

This will run the test for 60 seconds.

#### Limit total requests

```bash
npm start -- --total-requests 100
```

This will send at most 100 requests.

#### Test against a different API

```bash
npm start -- --api-url http://localhost:8080
```

#### Combine multiple options

```bash
npm start -- --concurrency 15 --duration 120 --total-requests 200 --api-url http://localhost:3000 --output-dir ./test-results
```

#### Include health check requests

```bash
npm start -- --health-check --concurrency 10
```

## How It Works

1. **File Reading**: The test reads PDF files from the local `.data/documents/original/` directory at the project root. This eliminates MinIO dependency for load testing and provides better performance on local machines.

2. **Concurrent Uploads**: Documents are uploaded concurrently based on the `--concurrency` setting. The test maintains a pool of concurrent requests.

3. **Metrics Collection**: System metrics (CPU, memory, etc.) are collected every 2 seconds during the test.

4. **Request Tracking**: Each request's response time, status code, and result are tracked.

5. **Report Generation**: After the test completes, reports are generated in multiple formats:
   - **Markdown** (`.md`): Human-readable report with charts and statistics
   - **JSON** (`.json`): Machine-readable data export
   - **CSV** (`.csv`): Spreadsheet-compatible data export

## Report Output

Reports are saved in the output directory (default: `reports/`) with filenames like:
- `load-test-2024-01-15T10-30-00.md`
- `load-test-2024-01-15T10-30-00.json`
- `load-test-2024-01-15T10-30-00.csv`

### Report Contents

The reports include:
- **Summary Statistics**:
  - Total requests
  - Success rate
  - Average response time
  - P95 response time
  - Requests per second
- **Request Distribution**: Breakdown by status code
- **Response Time Distribution**: Histogram of response times
- **System Metrics**: CPU and memory usage over time
- **Timeline**: Request timeline visualization

## Building

To compile TypeScript to JavaScript:

```bash
npm run build
```

The compiled output will be in the `dist/` directory.

## Troubleshooting

### Error: Local data directory not found

If you see an error about the local data directory not being found:

1. Generate synthetic documents first:
   ```bash
   pnpm gen:documents
   ```

2. Verify that `.data/documents/original/` directory exists at the project root

3. Ensure the directory contains PDF files

### No PDF files found in local data directory

Verify that:
- The `.data/documents/original/` directory exists at the project root
- The directory contains PDF files (generated using `pnpm gen:documents`)
- You have read permissions for the `.data` directory

### Connection errors

Check that:
- The API server is running at the specified URL
- Network connectivity is available
- Firewall rules allow connections

## Notes

- The test includes random delays (100-500ms) between requests to simulate realistic load patterns
- Health check requests (if enabled) are sent with a 10% probability during the test
- The test will stop early if either the duration limit or total requests limit is reached

