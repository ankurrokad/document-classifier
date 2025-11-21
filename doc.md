---
# 📘 **Clinical Document Intelligence Pipeline (CDIP)**

**Author:** Ankur Rokad  
**Version:** MVP v1.1  
**Date:** 2025  
**Tech Stack:** Node.js, TypeScript, NestJS, MongoDB, Redis, BullMQ, MinIO, Tesseract

---

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

- **Automated Classification** - Instantly identifies document types using rule-based and ML approaches
- **Intelligent Extraction** - Pulls out patient names, health card numbers, medications, provider info, and dates
- **Smart Patient Matching** - Automatically links documents to the correct patient using health card numbers and fuzzy name matching
- **Queue-Based Processing** - Handles high volumes with scalable worker architecture
- **Production-Ready Architecture** - Stateless backend, object storage, metadata in database

---

# 3. **System Architecture**

```
                    +-----------------------------+
                    |        REST API (NestJS)     |
                    |  Upload & Status Endpoints  |
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
    Upload processed artifacts → Update MongoDB → Done!
```

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
- **Tesseract.js** - OCR engine for text extraction
- **BullMQ** - Job queue for distributed processing
- **Redis** - Queue backend and caching

## Storage & Infrastructure
- **MinIO** - S3-compatible object storage (Docker) - replaceable with AWS S3, GCP, Azure
- **MongoDB Atlas** - Cloud-hosted MongoDB database
- **Redis** - Local Redis instance for queue backend

## Architecture
- **Monorepo** - pnpm workspace with 4 packages:
  - `@doc-clf/backend` - NestJS API server
  - `@doc-clf/pipeline` - Worker processes
  - `@doc-clf/storage` - Shared storage utilities
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

# 6. **Current Status**

## ✅ Completed

- Monorepo structure and package organization
- MinIO storage integration
- Document upload API endpoint
- MongoDB document schema
- Queue infrastructure (BullMQ + Redis)
- Worker skeleton and architecture
- Synthetic data generator for testing
- Infrastructure setup (MinIO via Docker Compose, MongoDB Atlas, local Redis)

## 🚧 In Progress

- Pipeline processors (OCR, classification, extraction, matching)
- Patient schema and endpoints
- Document retrieval endpoints

## 📋 Planned

- Complete all 8 pipeline stages
- ML classification model training
- Patient matching algorithm
- Processed artifacts storage
- Batch testing and optimization

---

# 7. **What's Next**

## Immediate Next Steps

1. **Complete OCR Pipeline**
   - Implement PDF download from MinIO
   - Add image preprocessing (deskew, grayscale)
   - Integrate Tesseract OCR

2. **Build Classification System**
   - Rule-based classification (keywords, patterns)
   - Train ML model on synthetic dataset
   - Implement confidence scoring

3. **Field Extraction**
   - Regex-based extraction for structured fields
   - Patient name, health card, DOB parsing
   - Medication extraction for prescriptions

4. **Patient Matching**
   - Health card exact matching
   - Name + DOB fuzzy matching
   - Similarity threshold tuning

5. **Complete API**
   - Document retrieval endpoint
   - Patient endpoints (list, detail, chart)
   - Error handling and validation

## Future Enhancements

- Multi-tenant support
- Web UI for document management
- Advanced analytics and reporting
- Integration with EMR systems
- Production deployment optimizations

---

# 8. **Performance Goals**

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
