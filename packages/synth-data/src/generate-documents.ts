import * as dotenv from "dotenv";

// Load .env file from root directory
const envPath = `${process.cwd()}/.env`;
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  dotenv.config({ override: true });
}

import { makePrescriptionDoc } from "./templates/prescription";
import { makeLabReport } from "./templates/lab-report";
import { makeClinicNote } from "./templates/clinic-note";
import { MinioStorage } from "@doc-clf/storage";
import {
  connectMongoDB,
  disconnectMongoDB,
  PatientModel,
} from "@doc-clf/dal";

const bucket = process.env.MINIO_BUCKET_SYNTHETIC || "documents-synth";

const minio = new MinioStorage();
const patientModel = new PatientModel();

// Convert MongoDB patient to format expected by templates
function formatPatientForTemplate(patient: any) {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    fullName: patient.fullName,
    dob:
      patient.dob instanceof Date
        ? patient.dob.toISOString().split("T")[0]
        : new Date(patient.dob).toISOString().split("T")[0],
    healthCard: patient.healthCard,
  };
}

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await connectMongoDB();
    console.log("Connected to MongoDB");

    console.log("Fetching patients from MongoDB...");
    // Fetch all patients without limit
    const model = patientModel.getModel();
    const patients = await model.find().lean();
    console.log(`Found ${patients.length} patients`);

    if (patients.length === 0) {
      console.log(
        "No patients found. Please generate patients first using: pnpm gen:patients <count>"
      );
      await disconnectMongoDB();
      return;
    }

    let totalDocs = 0;
    let docCounter = 0;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const patientFormatted = formatPatientForTemplate(patient);

      // Generate random number of documents per patient (1-5)
      const numDocs = 1 + Math.floor(Math.random() * 5);

      for (let j = 0; j < numDocs; j++) {
        const typeRoll = Math.random();
        let buf: Buffer;
        let meta: any = { patient: patientFormatted, docType: "" };

        // Same distribution: 45% prescription, 35% lab-report, 20% clinic-note
        if (typeRoll < 0.45) {
          buf = await makePrescriptionDoc(patientFormatted);
          meta.docType = "prescription";
        } else if (typeRoll < 0.8) {
          buf = await makeLabReport(patientFormatted);
          meta.docType = "lab_report";
        } else {
          buf = await makeClinicNote(patientFormatted);
          meta.docType = "clinic_note";
        }

        const fileName = `${meta.docType}_${docCounter}_${patientFormatted.firstName}_${patientFormatted.lastName}.pdf`;
        const baseName = fileName.replace(/\.pdf$/, "");
        const jsonContent = JSON.stringify(meta, null, 2);

        // Create folder structure: documents/original/{baseName}/{baseName}.pdf
        const pdfKey = `documents/original/${baseName}/${fileName}`;
        const jsonKey = `documents/original/${baseName}/${baseName}.json`;

        await minio.uploadBuffer(bucket, pdfKey, buf, {
          "x-amz-meta-doctype": meta.docType,
        });

        const jsonBuffer = Buffer.from(jsonContent, "utf-8");
        await minio.uploadBuffer(bucket, jsonKey, jsonBuffer, {
          "x-amz-meta-doctype": meta.docType,
        });

        docCounter++;
        totalDocs++;

        if (totalDocs % 25 === 0) {
          console.log(
            `Generated ${totalDocs} documents (${i + 1}/${patients.length} patients processed)`
          );
        }
      }
    }

    console.log(
      `\nDone! Generated ${totalDocs} documents for ${patients.length} patients`
    );
  } catch (error) {
    console.error("Error generating documents:", error);
    process.exit(1);
  } finally {
    await disconnectMongoDB();
    console.log("Disconnected from MongoDB");
  }
}

run();
