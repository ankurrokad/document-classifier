import PDFDocument from 'pdfkit';
import { pickMeds } from '../utils/drug';

export async function makePrescriptionDoc(patient, opts: { provider?: string } = {}) {
  // returns Buffer
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => { /* nothing */ });

  // Header
  doc.fontSize(14).text('Sunrise Clinic', {align:'left'});
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Patient: ${patient.fullName}`);
  doc.text(`DOB: ${patient.dob}    HCN: ${patient.healthCard}`);
  doc.moveDown(0.5);
  doc.text('--- Prescription ---', {underline:true});
  doc.moveDown(0.5);

  const meds = pickMeds(1 + Math.floor(Math.random()*3));
  meds.forEach((m, idx) => {
    doc.fontSize(11).text(`${idx+1}. ${m.name} — ${m.dose} — ${m.frequency}`);
  });

  doc.moveDown(1);
  doc.text('Prescriber: Dr. ' + (opts.provider || 'A. Physician'));
  doc.moveDown(2);
  doc.text('Signature: ____________________');

  doc.end();
  await new Promise(res=>doc.on('end', res));
  return Buffer.concat(chunks);
}
