import * as dotenv from 'dotenv';

// Load .env file from root directory
// When running with pnpm from root, process.cwd() should be the project root
const envPath = `${process.cwd()}/.env`;
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  dotenv.config({ override: true });
}

import { genPatient } from './utils/patient';
import { makePrescriptionDoc } from './templates/prescription';
import { makeLabReport } from './templates/lab-report';
import { makeClinicNote } from './templates/clinic-note';
import { MinioStorage } from '@doc-clf/storage';

const UPLOAD = (process.env.SYNTH_UPLOAD_TO_MINIO || 'false') === 'true';
const COUNT = Number(process.env.SYNTH_DOC_COUNT || 200);
const bucket = process.env.MINIO_BUCKET_ORIGINAL || 'documents-original';

const minio = new MinioStorage();

async function run() {
  for (let i=0;i<COUNT;i++) {
    const patient = genPatient();
    const typeRoll = Math.random();
    let buf: Buffer;
    let meta: any = { patient, docType: '' };

    if (typeRoll < 0.45) {
      buf = await makePrescriptionDoc(patient);
      meta.docType = 'prescription';
    } else if (typeRoll < 0.8) {
      buf = await makeLabReport(patient);
      meta.docType = 'lab_report';
    } else {
      buf = await makeClinicNote(patient);
      meta.docType = 'clinic_note';
    }

    const fileName = `${meta.docType}_${i}_${patient.firstName}_${patient.lastName}.pdf`;
    const baseName = fileName.replace(/\.pdf$/, '');
    const jsonContent = JSON.stringify(meta, null, 2);

    if (UPLOAD) {
      // Create folder structure: documents/original/{baseName}/{baseName}.pdf
      const pdfKey = `documents/original/${baseName}/${fileName}`;
      const jsonKey = `documents/original/${baseName}/${baseName}.json`;
      
      await minio.uploadBuffer(bucket, pdfKey, buf, { 'x-amz-meta-doctype': meta.docType });
      
      const jsonBuffer = Buffer.from(jsonContent, 'utf-8');
      await minio.uploadBuffer(bucket, jsonKey, jsonBuffer, { 'x-amz-meta-doctype': meta.docType });
    }

    if (i % 25 === 0) console.log(`Generated ${i}/${COUNT}`);
  }
  console.log('Done generating dataset');
}

run().catch(err=>{ console.error(err); process.exit(1); });
