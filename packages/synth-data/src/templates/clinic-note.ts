import PDFDocument from 'pdfkit';
import { faker } from '@faker-js/faker';

export async function makeClinicNote(patient) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Uint8Array[] = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => {});
  doc.fontSize(14).text('Downtown Family Practice', {align:'left'});
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Patient: ${patient.fullName}`);
  doc.text(`DOB: ${patient.dob}    HCN: ${patient.healthCard}`);
  doc.moveDown(0.5);
  doc.text('--- Clinic Note (SOAP) ---', {underline:true});
  doc.moveDown(0.5);

  doc.fontSize(11).text('S: ' + faker.lorem.sentence());
  doc.moveDown(0.3);
  doc.text('O: ' + faker.lorem.sentence());
  doc.moveDown(0.3);
  doc.text('A: ' + faker.lorem.sentences(2));
  doc.moveDown(0.3);
  doc.text('P: ' + faker.lorem.sentence());
  doc.end();
  await new Promise(res=>doc.on('end', res));
  return Buffer.concat(chunks);
}
