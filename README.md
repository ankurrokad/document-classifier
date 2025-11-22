# 🏥 Clinical Document Intelligence Pipeline (CDIP)

> **Transform healthcare document chaos into organized, actionable insights — automatically.**

Healthcare clinics and pharmacies receive hundreds of documents every day. Manually sorting, classifying, and filing them is time-consuming, error-prone, and takes staff away from what matters most: patient care.

**CDIP automates this entire process.** Upload a PDF, and watch as our intelligent pipeline automatically reads, understands, classifies, and matches documents to the right patients — in seconds, not hours.

---

## 📋 Table of Contents

- [About the Project](#about-the-project)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## About the Project

CDIP is an intelligent document processing pipeline designed for healthcare environments. It automatically:

- **Reads** documents using PDF text extraction (pdfjs-dist) and OCR (planned for scanned documents)
- **Classifies** document types (prescriptions, lab reports, clinical notes) using rule-based keyword matching
- **Extracts** structured data (patient names, health card numbers, medications, provider info, dates, etc.)
- **Matches** documents to the correct patient records using health card numbers and fuzzy name/DOB matching
- **Stores** everything in a searchable, organized format
- **Monitors** system health and performance with a real-time metrics dashboard

Built with a **production-ready architecture** featuring:
- Stateless backend API
- Queue-based processing for scalability
- Object storage for files
- Metadata in MongoDB for fast queries
- Real-time metrics dashboard and monitoring
- Complete document processing pipeline (OCR, classification, extraction, matching)

---

## Tech Stack

### Backend & API
- **NestJS** - Modern Node.js framework
- **TypeScript** - Type-safe development
- **MongoDB** - Document database
- **Mongoose** - MongoDB ODM

### Processing & Queue
- **BullMQ** - Job queue system
- **Redis** - Queue backend and metrics pub/sub
- **pdfjs-dist** - PDF text extraction
- **Tesseract.js** - OCR engine (for scanned documents - planned)
- **Sharp** - Image processing (planned)

### Storage
- **MinIO** - S3-compatible object storage

### Architecture
- **pnpm workspaces** - Monorepo management
- **Docker Compose** - MinIO container orchestration
- **Socket.IO** - WebSocket server for real-time metrics

### Monitoring & Metrics
- **Real-time Dashboard** - Live metrics visualization
- **WebSocket Gateway** - Real-time updates
- **Metrics API** - Programmatic access to system metrics

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** package manager ([Installation Guide](https://pnpm.io/installation))
- **Docker** and **Docker Compose** ([Download Docker Desktop](https://www.docker.com/products/docker-desktop)) - For MinIO
- **MongoDB Atlas Account** ([Sign up](https://www.mongodb.com/cloud/atlas)) - Cloud database
- **Redis** - Installed locally ([Installation Guide](https://redis.io/docs/getting-started/))
- **PM2** (optional, for production worker management) - Install globally: `npm install -g pm2`
- **Git** (for cloning the repository)

### Verify Installation

```bash
node --version    # Should be v18+
pnpm --version    # Should be 8.0+
docker --version  # Should be 20.0+
docker-compose --version
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ankurrokad/document-classifier.git
cd document-classifier
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies for all packages in the monorepo.

### 3. Start Infrastructure Services

#### Start MinIO (Docker)

Start MinIO using Docker Compose:

```bash
docker-compose up -d
```

This starts:
- **MinIO** S3 API on port `9000`
- **MinIO Console** on port `9001` (UI for managing buckets)

Access MinIO Console at `http://localhost:9001` (login: `minioadmin` / `minioadmin123`)

#### Setup MongoDB Atlas

1. Create a MongoDB Atlas account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user and get your connection string
4. Add your connection string to `.env` (see Configuration section below)

#### Setup Local Redis

Install and start Redis locally:

**Windows:**
- Download from [redis.io/download](https://redis.io/download) or use WSL
- Or install via Chocolatey: `choco install redis-64`

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env  # If you have an example file
# Or create .env manually
```

Add the following environment variables:

```env
# MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/document-classifier?retryWrites=true&w=majority

# Redis (Local)
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO (Docker)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET_ORIGINAL=documents-original
MINIO_SSL=false

# Optional: Synthetic Data Generation
SYNTH_UPLOAD_TO_MINIO=true
SYNTH_DOC_COUNT=200
```

**Notes:**
- Replace `MONGO_URI` with your actual MongoDB Atlas connection string
- Redis runs locally on default port `6379`
- MinIO credentials match the default Docker Compose setup

---

## Running the Application

The application consists of two main processes that need to run simultaneously:

### Option 1: Development Mode (Using pnpm)

For development and testing, you can run both processes using pnpm:

#### 1. Start the API Server

In your first terminal:

```bash
pnpm dev:api
```

This will:
- Build the storage library
- Start the NestJS API server
- Run on `http://localhost:3000`

You should see:
```
API running on http://localhost:3000
```

#### 2. Start the Worker

In a second terminal:

```bash
pnpm dev:worker
```

This will:
- Build the storage library
- Start a single BullMQ worker process
- Connect to Redis and begin processing jobs

You should see:
```
Worker started...
```

### Option 2: Production Mode with PM2 (Recommended for Performance)

For better performance and throughput, use PM2 to run multiple worker instances and manage both apps:

**Prerequisites:**
- Install PM2 globally: `npm install -g pm2`
- Build all packages: `pnpm build:all`

**Start all apps:**
```bash
pm2 start ecosystem.config.js
```

This will:
- Start the API server (1 instance)
- Start 4 worker instances in parallel
- Auto-restart apps on crashes
- Log all output to `logs/` directory

**Start individual apps:**
```bash
pm2 start ecosystem.config.js --only doc-api      # Start only API server
pm2 start ecosystem.config.js --only doc-worker    # Start only workers
```

**Manage apps:**
```bash
pm2 status                    # Check status of all apps
pm2 logs                      # View logs from all apps
pm2 logs doc-api              # View API logs only
pm2 logs doc-worker           # View worker logs only
pm2 restart doc-api           # Restart API server
pm2 restart doc-worker        # Restart all workers
pm2 stop doc-api              # Stop API server
pm2 stop doc-worker           # Stop all workers
pm2 stop all                  # Stop all apps
pm2 delete all                # Remove all apps from PM2
```

**Note:** PM2 mode is recommended when processing high volumes of documents or when you need better performance. The development mode is suitable for testing and development. You can also mix approaches - for example, run the API with `pnpm dev:api` and workers with PM2.

### 3. Verify Everything is Running

- **API**: Visit `http://localhost:3000` (should respond or show 404 for unknown routes)
- **Metrics Dashboard**: Visit `http://localhost:3000/dashboard` (real-time monitoring dashboard)
- **MinIO Console**: Visit `http://localhost:9001` (login with `minioadmin` / `minioadmin123`)
- **MongoDB Atlas**: Check your Atlas dashboard to verify cluster is running
- **Redis**: Run `redis-cli ping` (should return `PONG`)

---

## Project Structure

```
document-classifier/
├── packages/
│   ├── backend/              # NestJS API server
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── documents/    # Document upload & retrieval
│   │   │   │   ├── patients/     # Patient management
│   │   │   │   └── metrics/      # Metrics dashboard & monitoring
│   │   │   └── schemas/           # MongoDB schemas (legacy, using DAL now)
│   │   └── package.json
│   │
│   ├── pipeline/            # Worker processes
│   │   ├── src/
│   │   │   ├── processors/        # Pipeline stage processors
│   │   │   │   ├── ocr.processor.ts
│   │   │   │   ├── classify.processor.ts
│   │   │   │   ├── extract.processor.ts
│   │   │   │   └── match.processor.ts
│   │   │   ├── metrics/           # Metrics reporting
│   │   │   └── worker.ts          # BullMQ worker
│   │   └── package.json
│   │
│   ├── libs/
│   │   ├── storage/         # Shared MinIO client
│   │   │   ├── src/
│   │   │   │   └── minio.client.ts
│   │   │   └── package.json
│   │   └── dal/             # Data Access Layer
│   │       ├── src/
│   │       │   ├── schemas/       # MongoDB schemas
│   │       │   ├── models/        # Data models
│   │       │   └── connection.ts
│   │       └── package.json
│   │
│   └── synth-data/          # Synthetic data generator
│       ├── src/
│       │   ├── templates/         # Document templates
│       │   └── generate.ts
│       └── package.json
│
├── docker-compose.yaml      # Infrastructure services
├── package.json            # Root package.json (workspace config)
├── pnpm-workspace.yaml     # Workspace configuration
└── .env                    # Environment variables (create this)
```

---

## API Endpoints

### Document Endpoints

#### Upload Document

Upload a PDF document for processing.

```bash
POST /documents
Content-Type: multipart/form-data

# Using curl
curl -X POST http://localhost:3000/documents \
  -F "file=@path/to/document.pdf"

# Response
{
  "documentId": "507f1f77bcf86cd799439011"
}
```

#### Get Document

Retrieve a single document by ID with full details.

```bash
GET /documents/:id

# Using curl
curl http://localhost:3000/documents/507f1f77bcf86cd799439011

# Response
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "originalObjectKey": "documents/original/507f1f77bcf86cd799439011.pdf",
  "classification": {
    "label": "prescription",
    "confidence": 85
  },
  "extractedData": {
    "patientName": "John Doe",
    "healthCard": "1234567890",
    "dob": "1990-01-01T00:00:00.000Z",
    "medications": [...]
  },
  "matchedPatientId": {...},
  "processingLogs": [...]
}
```

#### List Documents

List all documents with pagination and filtering.

```bash
GET /documents?limit=50&skip=0&status=completed&type=prescription

# Query Parameters:
# - limit: Number of results (default: 50)
# - skip: Number of results to skip (default: 0)
# - status: Filter by status (uploaded, processing, completed, failed)
# - type: Filter by document type (prescription, lab_report, clinic_note)

# Response
{
  "documents": [...],
  "total": 150,
  "limit": 50,
  "skip": 0
}
```

### Patient Endpoints

#### List Patients

List all patients with pagination.

```bash
GET /patients?limit=50&skip=0

# Response
{
  "patients": [...],
  "total": 75,
  "limit": 50,
  "skip": 0
}
```

#### Get Patient

Retrieve a single patient by ID with associated documents.

```bash
GET /patients/:id

# Response
{
  "_id": "507f1f77bcf86cd799439012",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "dob": "1990-01-01T00:00:00.000Z",
  "healthCard": "1234567890",
  "documents": [...]
}
```

#### Create Patient

Create a new patient record.

```bash
POST /patients
Content-Type: application/json

# Request Body
{
  "firstName": "John",
  "lastName": "Doe",
  "dob": "1990-01-01",
  "healthCard": "1234567890"
}

# Response
{
  "_id": "507f1f77bcf86cd799439012",
  "firstName": "John",
  "lastName": "Doe",
  ...
}
```

### Metrics Endpoints

#### Metrics Dashboard

Access the real-time metrics dashboard in your browser.

```bash
GET /dashboard
```

Visit `http://localhost:3000/dashboard` to see:
- Queue metrics (waiting, active, completed jobs)
- Processing metrics (avg time, percentiles, job counts)
- System metrics (memory, CPU, event loop lag)
- API metrics (requests per minute, response times)
- Active worker count

The dashboard uses WebSocket for real-time updates (updates every 2 seconds by default).

#### Metrics API

Get metrics data programmatically.

```bash
GET /api/metrics

# Response
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "queue": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3
  },
  "processing": {
    "avgTime": 8500,
    "p50": 8000,
    "p95": 12000,
    "p99": 15000,
    "totalProcessed": 150
  },
  "system": {
    "memory": {...},
    "cpu": {...},
    "eventLoopLag": 2.5
  },
  "api": {
    "requestsPerMinute": 12.5,
    "avgResponseTime": 45,
    "totalRequests": 500
  },
  "workers": {
    "active": 2
  }
}
```

---

## Development

### Available Scripts

#### Root Level

```bash
# Development
pnpm dev:api          # Start API server in watch mode
pnpm dev:worker       # Start worker in watch mode

# Build
pnpm build:dal        # Build DAL library
pnpm build:storage    # Build storage library
pnpm build:synth-data # Build synthetic data generator
pnpm build:backend    # Build backend (includes dependencies)
pnpm build:pipeline   # Build pipeline (includes dependencies)
pnpm build:all        # Build all packages

# Data Generation
pnpm gen:data         # Generate and upload synthetic documents

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier
```

#### Package Level

You can also run scripts in specific packages:

```bash
# From root
pnpm --filter backend start:dev
pnpm --filter pipeline start:dev
pnpm --filter @doc-clf/synth-data gen
```

### Building for Production

```bash
# Build all packages
pnpm build:backend
pnpm build:pipeline

# Run production builds
node packages/backend/dist/main.js
node packages/pipeline/dist/worker.js
```

### Generating Synthetic Data

To generate test documents:

```bash
# Make sure MinIO is running
docker-compose up -d

# Generate and upload documents
pnpm gen:data
```

This will:
- Generate PDFs (prescriptions, lab reports, clinic notes)
- Upload them to MinIO
- Include JSON metadata files

Configure the count via `SYNTH_DOC_COUNT` in `.env`.

---

## Configuration

### Environment Variables

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `REDIS_HOST` | Redis hostname (local) | `localhost` |
| `REDIS_PORT` | Redis port (local) | `6379` |
| `MINIO_ENDPOINT` | MinIO server hostname (Docker) | `localhost` |
| `MINIO_PORT` | MinIO server port (Docker) | `9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin123` |
| `MINIO_BUCKET_ORIGINAL` | Bucket for original documents | `documents-original` |
| `MINIO_SSL` | Use SSL for MinIO | `false` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SYNTH_UPLOAD_TO_MINIO` | Upload synthetic data to MinIO | `false` |
| `SYNTH_DOC_COUNT` | Number of synthetic documents to generate | `200` |
| `METRICS_HISTORY_SIZE` | Maximum number of metrics records to keep in memory | `1000` |
| `METRICS_UPDATE_INTERVAL` | Dashboard WebSocket update interval (ms) | `2000` |

### MinIO Bucket Setup

The storage library automatically creates buckets if they don't exist. However, you can also manage them via the MinIO Console:

1. Visit `http://localhost:9001`
2. Login with `minioadmin` / `minioadmin123`
3. Create buckets manually if needed:
   - `documents-original` (for uploaded PDFs)
   - `documents-processed` (for processed artifacts - future)

### MongoDB Atlas Setup

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster (free M0 tier is sufficient for development)
3. Create a database user:
   - Go to Database Access → Add New Database User
   - Choose password authentication
   - Save the username and password
4. Whitelist your IP:
   - Go to Network Access → Add IP Address
   - Add `0.0.0.0/0` for development (or your specific IP)
5. Get your connection string:
   - Go to Clusters → Connect → Connect your application
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Add your database name: `?retryWrites=true&w=majority` → `document-classifier?retryWrites=true&w=majority`
6. Add the connection string to your `.env` file as `MONGO_URI`

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use

If you see port conflicts:

```bash
# Check what's using the port
# Windows
netstat -ano | findstr :3000
# Mac/Linux
lsof -i :3000

# Stop the conflicting process or change ports in .env
```

#### 2. MongoDB Atlas Connection Failed

```bash
# Verify your connection string in .env
# Format: mongodb+srv://username:password@cluster.mongodb.net/database

# Check if your IP is whitelisted in Atlas
# Go to Network Access in Atlas dashboard

# Test connection string
mongosh "your-connection-string-here"
```

#### 3. Redis Connection Failed

```bash
# Check if Redis is running locally
redis-cli ping
# Should return: PONG

# If not running, start Redis:
# Mac: brew services start redis
# Linux: sudo systemctl start redis
# Windows: Start Redis service or use WSL
```

#### 4. MinIO Connection Failed

```bash
# Check if MinIO is running
docker ps | grep minio

# Verify MinIO is accessible
curl http://localhost:9000/minio/health/live
```

#### 5. Missing Environment Variables

The application will exit with a clear error message if required environment variables are missing. Check your `.env` file is in the root directory and contains all required variables.

#### 6. Build Errors

If you see build errors:

```bash
# Clean and rebuild
rm -rf node_modules packages/*/node_modules packages/*/dist
pnpm install
pnpm build:storage
```

#### 7. Worker Not Processing Jobs

- Verify Redis is running and accessible
- Check worker logs for errors
- Ensure the queue name matches (`doc:process`)
- Verify MongoDB connection in worker

### Getting Help

- Check the [Design Document](./doc.md) for architecture details
- Review package-specific README files (if available)
- Check Docker logs: `docker-compose logs`
- Verify all services are running: `docker-compose ps`

---

## Current Status

### ✅ Completed Features

- **Complete Pipeline**: OCR, classification, extraction, and matching processors
- **API Endpoints**: Document upload, retrieval, listing, and patient management
- **Metrics Dashboard**: Real-time monitoring with WebSocket updates
- **Data Access Layer**: Centralized MongoDB schemas and models
- **Queue Processing**: Full BullMQ integration with Redis

### 🚧 In Progress

- ML classification model training
- Processed artifacts storage
- Enhanced error handling and retry mechanisms

### 📋 Planned

- Tesseract OCR for scanned documents
- Image preprocessing (deskew, grayscale)
- Advanced ML models
- Batch processing optimizations
- Unit and integration tests

---

## License

This project is private and for educational/demonstration purposes.

---

**Ready to get started? Follow the [Installation](#installation) steps above!** 🚀
