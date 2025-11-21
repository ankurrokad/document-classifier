import { Schema } from 'mongoose';

export const DocumentSchema = new Schema({
  originalObjectKey: String,
  processedObjectKeys: [String],
  status: { type: String, default: 'uploaded' },

  classification: {
    label: String,
    confidence: Number,
  },

  extracted: {
    patientName: String,
    healthCard: String,
    dob: Date,
    provider: String,
    medications: Array,
    rawText: String,
  },

  matchedPatientId: { type: Schema.Types.ObjectId, ref: 'Patient' },

  processingLogs: [
    {
      ts: Date,
      step: String,
      message: String,
    },
  ],
});

