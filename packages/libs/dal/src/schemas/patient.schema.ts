import { Schema } from 'mongoose';

export const PatientSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  healthCard: { type: String, required: true, unique: true, index: true },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
});

