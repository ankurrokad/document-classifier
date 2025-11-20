# ✅ **CURSOR AGENT INSTRUCTION (Strict Version)**

**Copy/paste exactly as-is.**
Use this as `agent-rules.md`.

---

# **Cursor Agent Instructions — Clinical Document Intelligence Pipeline (CDIP)**

**Author:** Ankur Rokad
**Purpose:** Cursor should help implement code in the existing architecture — not redesign it.
**Scope:** Backend, Worker pipeline, MinIO integration, processing modules.

---

## 🔒 **1. Architecture Rules (MUST FOLLOW)**

1. **Do NOT change directory structure** unless I explicitly request it.
2. **Do NOT rename packages**, modules, or folders.
3. **Do NOT introduce new frameworks or libraries** unless I approve.
4. **Follow the existing design doc exactly** when adding code.
5. **All files must remain inside `/packages/backend`, `/packages/pipeline`, or `/packages/libs`**.
6. **Backend must remain NestJS** — no Express rewrites.
7. **Pipeline must remain BullMQ worker** — no alternative queue systems.
8. **MinIO must remain the only storage layer** — no filesystem writes unless the design doc specifies temp-only.
9. **Mongo must remain the metadata store** — no ORM migrations or schema redesigns.
10. **Document schema fields MUST NOT be removed or renamed**.

---

## 🧩 **2. Implementation Style Requirements**

1. Write **small, focused modules** — never giant functions.
2. Use **TypeScript types everywhere** (interfaces or zod optional).
3. Prefer **async/await** over callbacks.
4. Never suppress TypeScript errors with `// @ts-ignore`.
5. Add **comments for complex logic** (classification, extraction).
6. All processors (OCR / classify / extract / match) must be **pure functions** without I/O — the worker orchestrates them.
7. Workers must remain **stateless** — always fetch from MinIO + Mongo.
8. Add clear **`processingLogs` entries** in each pipeline stage.

---

## 🔁 **3. How Cursor Should Work With Me**

Cursor should:

* **Ask for confirmation** before generating large files
* **Ask for approval** before touching multiple files
* **Show a diff plan** if changes affect more than one module
* **Keep PR-sized changes** (small, incremental commits)
* **Never auto-generate the entire pipeline at once**

I want precise control over the system.

---

## 📌 **4. Allowed Agent Tasks**

Cursor is allowed to:

✔ Implement controllers, services, and schemas in `/packages/backend`
✔ Implement pipeline stages in `/packages/pipeline/processors`
✔ Add helper utilities under `/packages/libs`
✔ Implement MinIO upload/download utilities
✔ Add integration tests (only under a `/tests` folder if requested)
✔ Add synthetic data generator logic
✔ Fix TypeScript or logic errors when asked

---

## 🚫 **5. Forbidden Tasks**

Cursor is NOT allowed to:

❌ Change the high-level architecture
❌ Move or rename directories
❌ Replace MinIO with AWS/GCP/Azure storage
❌ Replace BullMQ with other queue libraries
❌ Replace NestJS with Express/Fastify
❌ Modify docker-compose.yml without explicit instruction
❌ Remove required fields from the Document or Patient schemas
❌ Invent additional microservices
❌ Generate frontend code unless explicitly asked

---

## 🧠 **6. Pipeline Implementation Rules**

Each pipeline stage must be implemented in this order:

1. **downloadFromMinIO**
2. **preprocessPDF**
3. **runOCR**
4. **classifyDocument**
5. **extractFields**
6. **matchPatient**
7. **uploadProcessedArtifacts** (MinIO)
8. **updateMongoRecord**

Cursor must follow this sequence exactly.

---

## 🧪 **7. Quality Bar**

All Cursor code must:

* Compile without errors
* Follow TypeScript best practices
* Use NestJS dependency injection correctly
* Be modular and testable
* Have clean logs
* Not exceed 200–300 lines per file
* Not put worker logic in controllers
* Keep business logic out of controllers (use services)
* Not mix pipeline logic into the backend

---

## 🏗 **8. How to Request Work From Cursor**

When I say:

> “Implement OCR stage”
> Cursor should only modify:

```
packages/pipeline/src/processors/ocr.processor.ts
packages/pipeline/src/worker.ts (integration only)
packages/libs/pdf/*
```

When I say:

> “Add upload endpoint validation”
> Cursor modifies:

```
packages/backend/src/modules/documents/*
```

And nowhere else.

---

## 🔐 **9. Environment Variable Handling**

Cursor must always:

* Read from `process.env`
* Never hardcode credentials
* Use the `.env.example` structure

---

## ⭐ **10. Guiding Principle**

**Cursor is a junior engineer.
I am the senior engineer.
Cursor should implement — not architect — the system.**

---