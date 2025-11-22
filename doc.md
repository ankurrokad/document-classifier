# 1. **What Is This Project?**

Healthcare clinics and pharmacies receive dozens–hundreds of documents daily (fax/email). Staff manually review, classify, and attach them to patient charts — a slow, error-prone workflow.

The **Clinical Document Intelligence Pipeline (CDIP)** automates this entire process by:

1. **Uploading** PDFs into object storage
2. **Reading** documents with OCR (Optical Character Recognition)
3. **Classifying** document type (prescription, lab report, clinical note)
4. **Extracting** structured clinical fields (patient name, health card, medications, etc.)
5. **Matching** documents to the correct patient automatically
6. **Storing** structured results for easy access

This MVP demonstrates a **scalable, cloud-native, AI-powered document ingestion system** for healthcare.

---

# 2. **How It Works**

## The Pipeline Flow

```
Upload PDF → Store in Object Storage → Queue for Processing
    ↓
Worker picks up job → Download PDF → Preprocess → OCR
    ↓
Classify Document Type → Extract Fields → Match Patient
    ↓
Store Results → Update Status → Done!
```

## Key Features

- **Automated Classification** - Instantly identifies document types using rule-based keyword matching (ML models planned)
- **Intelligent Extraction** - Pulls out patient names, health card numbers, medications, provider info, and dates using regex-based extraction
- **Smart Patient Matching** - Automatically links documents to the correct patient using health card numbers (exact match) and fuzzy name/DOB matching
- **Queue-Based Processing** - Handles high volumes with scalable worker architecture
- **Real-Time Monitoring** - Live metrics dashboard with WebSocket updates showing queue status, processing times, system health, and API performance
- **Production-Ready Architecture** - Stateless backend, object storage, metadata in database, comprehensive monitoring

---

# 3. **System Architecture**

```
                    +-----------------------------+
                    |        REST API (NestJS)     |
                    |  Upload, Status, Metrics    |
                    |  Patient & Document APIs    |
                    +-------------+---------------+
                                  |
                                  | (1) Upload PDF to storage
                                  v
                          +-------+-------+
                          |    MinIO      |
                          |  (S3 API)     |
                          |  Object Storage
                          +-------+-------+
                                  |
                                  | (2) Store metadata
                                  v
                         +--------+---------+
                         |  MongoDB Atlas   |
                         |  Document &      |
                         |  Patient Data    |
                         |  (Cloud)         |
                         +--------+--------+
                                  |
                                  | (3) Enqueue processing job
                                  v
                         +--------+----------+
                         |  Redis Queue      |
                         |  (Local + BullMQ) |
                         +--------+----------+
                                  |
                                  v
                      +-----------+-------------+
                      |   Worker Pool (Node.js) |
                      +-----------+-------------+
                                  |
          -----------------------------------------------------
          |               |                |                 |
          v               v                v                 v
      Download        OCR          Classification     Extraction
    PDF from Storage  (Tesseract)   (rules + ML)      + Matching
          |
          v
    Upload processed artifacts → Update MongoDB → Report Metrics → Done!
```

**Metrics & Monitoring:**
- Real-time dashboard at `/dashboard` with live WebSocket updates
- API endpoint at `/api/metrics` for programmatic access
- Tracks queue status, processing times, system health, and API performance
- Metrics interceptor automatically tracks all API requests

**Architecture Principles:**
- **Stateless Backend** - No file storage on server disk
- **Metadata in Database** - Fast queries and relationships
- **Files in Object Storage** - Scalable, cloud-ready
- **Queue-Based Processing** - Handles bursts and scales horizontally

---

# 4. **Technology Stack**

## Backend & API
- **NestJS** - Modern Node.js framework for scalable APIs
- **TypeScript** - Type-safe development
- **MongoDB** - Document database for metadata and patient records

## Processing & AI
- **pdfjs-dist** - PDF text extraction for text-based PDFs
- **Tesseract.js** - OCR engine for scanned documents (planned)
- **BullMQ** - Job queue for distributed processing
- **Redis** - Queue backend, caching, and metrics pub/sub

## Storage & Infrastructure
- **MinIO** - S3-compatible object storage (Docker) - replaceable with AWS S3, GCP, Azure
- **MongoDB Atlas** - Cloud-hosted MongoDB database
- **Redis** - Local Redis instance for queue backend and metrics pub/sub
- **Socket.IO** - WebSocket server for real-time metrics updates

## Architecture
- **Monorepo** - pnpm workspace with 5 packages:
  - `@doc-clf/backend` - NestJS API server
  - `@doc-clf/pipeline` - Worker processes
  - `@doc-clf/storage` - Shared storage utilities
  - `@doc-clf/dal` - Data Access Layer (MongoDB schemas and models)
  - `@doc-clf/synth-data` - Synthetic data generator

---

# 5. **What Gets Extracted**

From each document, the system extracts:

- **Patient Information**
  - Full name
  - Health card number
  - Date of birth

- **Document Details**
  - Document type (prescription, lab report, clinical note)
  - Provider information
  - Document date

- **Clinical Data** (depending on document type)
  - Medications (for prescriptions)
  - Lab values (for lab reports)
  - Clinical notes (for clinic notes)

- **Raw Text** - Full OCR output for reference

---

# 6. **Current Status - Version 1.0** 🎉

## ✅ Completed

- Monorepo structure and package organization
- MinIO storage integration
- Document upload API endpoint
- MongoDB document schema and DAL (Data Access Layer)
- Queue infrastructure (BullMQ + Redis)
- Complete pipeline processors:
  - **OCR Processor** - PDF text extraction using pdfjs-dist
  - **Classification Processor** - Rule-based document type classification
  - **Extraction Processor** - Field extraction (patient name, health card, DOB, medications, provider)
  - **Match Processor** - Patient matching via health card and fuzzy name/DOB matching
- Worker architecture with full pipeline execution
- Patient management endpoints (list, get, create)
- Document retrieval endpoints (list, get with filtering)
- **Metrics & Monitoring System**:
  - Real-time metrics dashboard (`/dashboard`)
  - WebSocket gateway for live updates
  - API metrics tracking (request rates, response times)
  - Queue metrics (waiting, active, completed jobs)
  - System metrics (memory, CPU, event loop lag)
  - Processing metrics (avg time, percentiles, job counts)
- Synthetic data generator for testing
- Infrastructure setup (MinIO via Docker Compose, MongoDB Atlas, local Redis)
- **Performance Optimization & Scalability**:
  - Multi-worker scaling with PM2 cluster mode
  - Load testing and performance validation
  - Queue optimization (eliminated overload bottleneck)
  - Production-ready architecture with 80/100 health score
  - Handles 200+ concurrent users with excellent performance

## 🎯 Version 1.0 Performance Achievements

We've achieved **production-ready performance** through comprehensive load testing and optimization:

- **Queue Optimization**: Reduced queue depth from 265 jobs (overloaded) to manageable levels (96% improvement)
- **Worker Scaling**: Implemented 4-worker parallel processing architecture using PM2 cluster mode
- **CPU Efficiency**: Improved from 99.4% (critical) to 86.1% CPU usage through better resource distribution
- **Job Completion**: Achieved 99.4% completion rate (497/500 jobs) even under high concurrent load
- **Response Times**: Maintained excellent API performance - 155ms average, 238ms P95
- **System Health**: Improved from 60/100 (DEGRADED) to 80/100 (HEALTHY) status
- **Scalability**: System validated to handle 200+ concurrent users with healthy performance metrics

📊 **For detailed performance analysis and optimization journey, see**: [Load Test Performance Analysis](../.docs/LOAD_TEST_ANALYSIS.md)

## 🚧 In Progress

- ML classification model training (currently using rule-based)
- Processed artifacts storage (OCR results, extracted data)
- Enhanced patient matching confidence scoring

## 📋 Planned for Version 2.0

Version 2.0 will transform CDIP into a **full-featured application** with enhanced capabilities:

- **Full-Featured Application**: Complete web UI, user workflows, and enhanced user experience
- Advanced ML classification models
- Image preprocessing for scanned documents (deskew, grayscale)
- Tesseract OCR integration for scanned PDFs
- Processed artifacts storage in MinIO
- Batch processing optimizations
- Error recovery and retry mechanisms
- Enhanced integrations and features

---

# 7. **What's Next - Version 2.0**

Version 1.0 has achieved **production-ready performance** with excellent scalability and reliability. Version 2.0 will focus on transforming CDIP into a **full-featured application** with comprehensive UI, enhanced workflows, and advanced capabilities.

## Immediate Next Steps for v2.0

1. **Enhance OCR Pipeline**
   - Add image preprocessing for scanned documents (deskew, grayscale)
   - Integrate Tesseract OCR for scanned PDFs (currently using pdfjs-dist for text-based PDFs)
   - Improve OCR confidence scoring

2. **Improve Classification System**
   - Train ML model on synthetic dataset
   - Enhance rule-based patterns
   - Implement multi-classifier ensemble approach

3. **Enhance Field Extraction**
   - Improve regex patterns for better accuracy
   - Add extraction for lab values (for lab reports)
   - Extract clinical notes (for clinic notes)
   - Handle edge cases and variations

4. **Refine Patient Matching**
   - Improve fuzzy matching algorithms
   - Add confidence threshold tuning
   - Handle partial matches and edge cases
   - Add match history and audit trail

5. **Storage & Artifacts**
   - Store processed artifacts in MinIO
   - Cache OCR results for reprocessing
   - Implement artifact versioning

6. **API Enhancements**
   - Add patient chart endpoint (all documents for a patient)
   - Add document download endpoint
   - Implement advanced filtering and search
   - Add pagination improvements

## Future Enhancements (v2.0+)

- **Full Web Application**: Complete UI for document management, patient charts, and workflows
- Multi-tenant support
- Advanced analytics and reporting
- Integration with EMR systems
- Enhanced user experience and workflows
- Production deployment optimizations

---

# 8. **Performance Goals - Version 1.0 Achievements**

## ✅ Achieved in v1.0

- ⚡ **API Response Time**: 155ms average, 238ms P95 (excellent performance)
- 📊 **Scalability**: Validated to handle 200+ concurrent users with healthy performance
- 🎯 **Job Completion**: 99.4% completion rate under high load
- 💪 **System Health**: 80/100 health score (production-ready)
- ⚙️ **Queue Performance**: Eliminated overload, manageable queue depth
- 🔄 **Worker Scaling**: 4-worker parallel processing architecture

## Future Goals (v2.0+)

- ⚡ **Processing Time**: < 10 seconds per document
- 🎯 **Classification Accuracy**: 90%+ on synthetic data
- 👤 **Patient Matching**: 95%+ accuracy
- 📊 **Scalability**: Handle 5,000+ documents per day with multi-worker setup

---

# 9. **Project Goals**

## What This Project Demonstrates

- **Production-Ready Architecture** - Scalable, cloud-native design patterns
- **AI/ML Integration** - Document classification and intelligent extraction
- **Queue-Based Processing** - Handling high-volume workloads
- **Modern Tech Stack** - TypeScript, NestJS, MongoDB, Redis, MinIO
- **Best Practices** - Monorepo, type safety, stateless design

## Scope (MVP)

- ✅ Single-tenant system
- ✅ Healthcare documents only (prescriptions, lab reports, clinic notes)
- ✅ Local development environment
- ❌ Multi-tenant support (future)
- ❌ Production HIPAA/PHIPA compliance (future)
- ❌ Complete UI platform (future)

---
