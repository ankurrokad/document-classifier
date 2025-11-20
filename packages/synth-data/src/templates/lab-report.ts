import PDFDocument from 'pdfkit';
import { genLabResults } from '../utils/lab-values';

export async function makeLabReport(patient) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {});
  doc.fontSize(14).text('Acme Labs', {align:'left'});
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Patient: ${patient.fullName}`);
  doc.text(`DOB: ${patient.dob}    HCN: ${patient.healthCard}`);
  doc.moveDown(0.5);
  doc.text('--- Lab Results ---', {underline:true});
  doc.moveDown(0.5);

  const results = genLabResults();
  results.forEach(r => {
    doc.text(`${r.test} : ${r.value} ${r.unit}   (Normal: ${r.normal}) ${r.flag}`);
  });

  doc.end();
  await new Promise(res=>doc.on('end', res));
  return Buffer.concat(chunks);
}
