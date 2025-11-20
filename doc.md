---

# 📘 **DESIGN DOCUMENT — Clinical Document Intelligence Pipeline (CDIP)**

**Author:** Ankur Rokad
**Version:** MVP v1.1 (with MinIO)
**Date:** 2025
**Scope:** Backend + AI Pipeline (UI later)
**Tech:** Node.js, TypeScript, NestJS, MongoDB, Redis, BullMQ, MinIO, Tesseract

---

# 1. **Overview**

Healthcare clinics and pharmacies receive dozens–hundreds of documents daily (fax/email). Staff manually review, classify, and attach them to patient charts — a slow, error-prone workflow.

The **Clinical Document Intelligence Pipeline (CDIP)** automates this by:

1. Uploading PDFs into object storage (MinIO)
2. Running OCR
3. Classifying document type (prescription, lab report, clinical note)
4. Extracting structured clinical fields
5. Matching the document to the correct patient
6. Storing structured results in MongoDB
7. Scaling with queue-driven workers (BullMQ)

This MVP is **single tenant** and limited to **healthcare documents only**.
The system demonstrates scalable, cloud-native, AI-powered document ingestion.

---

# 2. **Goals & Non-Goals**

## Goals (MVP)

- PDF upload → MinIO storage
- MongoDB metadata store
- OCR with Tesseract
- Document classification (rules + ML model)
- Clinical extraction (name, HCN, DOB, meds, provider, date)
- Patient matching (fuzzy match)
- Queue-based processing with BullMQ workers
- Synthetic document dataset
- Local development stack with Docker Compose
- Full design doc & architecture diagrams

## Non-Goals (MVP)

- Multi-tenant support
- HIPAA/PHIPA auditing
- Complete UI platform
- Real clinic datasets
- Production scaling
- S3/Cloud storage (MinIO simulates it locally)

---

# 3. **System Architecture (with MinIO)**

```
                    +-----------------------------+
                    |        REST API (Nest)      |
                    |  POST /documents/upload     |
                    +-------------+---------------+
                                  |
                                  | (1) Upload directly to MinIO bucket
                                  v
                          +-------+-------+
                          |    MinIO      |
                          |  (S3 API)     |
                          +-------+-------+
                                  |
                                  | (2) Create Document metadata
                                  v
                         +--------+---------+
                         |   MongoDB Atlas   |
                         +--------+----------+
                                  |
                                  | (3) Enqueue job with documentId
                                  v
                         +--------+----------+
                         |     Redis Queue   |
                         |      (BullMQ)     |
                         +--------+----------+
                                  |
                                  v
                      +-----------+-------------+
                      |   Worker Pool (Node)    |
                      +-----------+-------------+
                                  |
          -----------------------------------------------------
          |               |                |                 |
          v               v                v                 v
      Download        OCR Stage       Classification     Extraction
    PDF from MinIO    (Tesseract)     (rules + ML)      + Matching
          |
          v
 Upload processed artifacts back to MinIO (png pages)
          |
          v
 Update MongoDB → status=done, attach patientId
```

This is a **production-style architectural pattern**:

- Metadata in DB
- Files in object storage
- Queue-based processing
- Stateless backend

---

# 4. **Component-Level Architecture**

## 4.1 Backend API (NestJS)

Responsibilities:

- Generate unique object key for upload
- Upload PDF to MinIO bucket
- Create Document record in Mongo
- Push processing job to BullMQ
- Expose API to get document status & patient chart

**No file storage on backend disk** → backend is fully stateless.

---

## 4.2 MinIO Object Storage (S3-Compatible)

Used for:

- Raw PDF storage
- Intermediate image artifacts (converted pages)
- Future: extracted JSON artifacts, logs, reports

Buckets:

- `documents-original`
- `documents-processed`

Object keys:

- `documents/original/<documentId>.pdf`
- `documents/processed/<documentId>/page-1.png`

Advantages:

- Production-like storage
- Replaceable with AWS S3 / GCP / Azure in seconds
- Cursor agent can handle S3-style operations
- Worker nodes can scale horizontally

---

## 4.3 MongoDB Metadata Store

Collections:

- **patients**
- **documents**
- **jobs** (optional)

Stores:

- PDF object key (not file)
- classification
- OCR text
- extracted fields
- matchedPatientId
- processing logs

---

## 4.4 Redis Queue + BullMQ

1 queue: `doc:process` (MVP)
later split into stages.

Each job = `{ documentId }`
Retry: 3 attempts
Backoff: 5s → 15s → 60s

Concurrency: 3 workers (local)

---

## 4.5 Worker Pipeline (Pipeline Package)

Stages:

1. **downloadFromMinIO**
2. **preprocessPDF**
3. **runOCR**
4. **classifyDocument**
5. **extractFields**
6. **matchPatient**
7. **uploadProcessedArtifactsToMinIO**
8. **updateMongo**

Workers are **stateless**, enabling horizontal scaling.

---

# 5. Pipeline Stage Specifications

## 5.1 Stage 1 — Download PDF from MinIO

Use MinIO client library:

```ts
minioClient.getObject(bucket, objectKey);
```

Download PDF to temp folder or in-memory buffer.

---

## 5.2 Stage 2 — Preprocess PDF

- Render pages at 300 DPI
- Convert to grayscale PNG
- Deskew via Sharp
- Store processed PNG pages → upload back to MinIO

This aids OCR quality.

---

## 5.3 Stage 3 — OCR (Tesseract)

Process each image:

- extract text
- produce `rawText`
- cleanup whitespace/line breaks

Store text in Mongo.

---

## 5.4 Stage 4 — Classification

Hybrid:

### Rule-based

- header keywords
- Rx patterns
- lab values
- note markers

### ML-based

TF-IDF + logistic regression on synthetic dataset.

### Optional LLM fallback

When confidence < threshold.

Stored in Mongo as:

```ts
classification: {
  label: 'prescription' | 'lab_report' | 'clinic_note',
  confidence: number
}
```

---

## 5.5 Stage 5 — Extraction

Fields extracted:

- patientName
- healthCard
- dob
- provider
- document date
- medications[] (if prescription)

Use regex + heuristics + optional LLM parsing.

---

## 5.6 Stage 6 — Patient Matching

Priority:

1. HealthCard exact match
2. Name + DOB fuzzy match
3. Manual-review flag if uncertain

Similarity threshold ≥ 0.85

---

## 5.7 Stage 7 — Upload Processed Artifacts to MinIO

Upload extracted page images:

```
documents/processed/<documentId>/page-1.png
```

Store keys in:

```ts
documentStorage.processedObjectKeys[]
```

---

## 5.8 Stage 8 — Update MongoDB

Set:

- status
- extracted fields
- classification
- matchedPatientId
- timestamps

Add entries to `processingLogs[]`.

---

# 6. Data Models (MongoDB)

## Patient

```ts
{
  _id,
  firstName,
  lastName,
  dob,
  healthCard,
  aliases: [],
  createdAt,
  updatedAt
}
```

## Document

```ts
{
  _id,
  originalObjectKey: string,
  processedObjectKeys: string[],
  status: 'uploaded' | 'processing' | 'done' | 'error',

  classification: {
    label: string,
    confidence: number
  },

  extracted: {
    patientName,
    healthCard,
    dob,
    provider,
    medications: [...],
    rawText: string
  },

  matchedPatientId: ObjectId | null,
  processingLogs: [{ ts, step, message }],
  createdAt,
  updatedAt
}
```

---

# 7. Updated API Endpoints

### `POST /api/documents`

- Receives PDF
- Upload directly → MinIO
- Create Document metadata
- Push job to queue

### `GET /api/documents/:id`

Returns document + extracted fields + link to files.

### `GET /api/patients`

List all patients.

### `GET /api/patients/:id`

Detailed chart with associated docs.

---

# 8. Synthetic Dataset (updated for MinIO)

Instead of storing locally, provide a script to:

- generate PDFs
- upload them automatically to MinIO
- store metadata in `/sample-data` for ML training

---

# 9. Docker Compose Stack (Updated)

Services:

- `api`
- `worker`
- `mongo`
- `redis`
- `minio`
- `minio-console`

MinIO config:

- Access key
- Secret key
- Exposed on port `9000`
- Console on `9001`

---

# 10. Performance Targets (Unchanged)

- < 10 sec processing per document
- 90% classification accuracy (synthetic)
- 95% patient matching accuracy
- Scalability to 5k docs/day with multi-worker setup

---

# 11. Security Considerations (Updated)

- No PHI in real usage
- MinIO buckets should have bucket-level policies (private)
- Pre-signed URLs for any future direct-access
- Encrypted environment variables

---

# 12. Roadmap (Updated to include MinIO changes)

## Week 1

- Setup monorepo
- Setup MinIO + buckets
- Implement synthetic data generator that uploads to MinIO

## Week 2

- Upload endpoint → MinIO
- Document metadata creation
- Basic queue

## Week 3

- PDF download → preprocess → upload processed images to MinIO
- OCR

## Week 4

- Classification
- Extraction

## Week 5

- Patient matching
- Final pipeline assembly

## Week 6

- Documentation
- Architecture diagrams
- 100-document batch test
- Publish repo

---

# 13. Final Diagram (MinIO Version)

```
                        ┌──────────────────────┐
                        │  NestJS API Server   │
                        │  /documents/upload   │
                        └───────────┬──────────┘
                                    │
                                    ▼
                     ┌─────────────────────────────┐
                     │        MinIO (S3 API)       │
                     │ documents-original/         │
                     │ documents-processed/        │
                     └───────────┬─────────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │    MongoDB Atlas    │
                      │ Document metadata   │
                      └──────────┬──────────┘
                                 │
                                 ▼
                        ┌───────────────────┐
                        │    Redis Queue    │
                        │      BullMQ       │
                        └────────┬──────────┘
                                 │
                    ┌───────────▼───────────┐
                    │    Worker Pool (TS)    │
                    └───────────┬───────────┘
                                ...
 Preprocess      OCR        Classify      Extract       Match      Save
  ┌──────▶───────▶──────────▶────────────▶────────────▶──────────▶───────┐
  │                                                                │
  │                     Upload processed images to MinIO           │
  └────────────────────────────────────────────────────────────────┘
```

---
