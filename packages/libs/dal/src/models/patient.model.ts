import mongoose, { Model, Document as MongooseDocument } from 'mongoose';
import { PatientSchema } from '../schemas/patient.schema';

export interface IPatient extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  fullName: string;
  dob: Date;
  healthCard: string;
  documents?: mongoose.Types.ObjectId[];
}

export class PatientModel {
  private model: Model<IPatient>;

  constructor() {
    // Check if model already exists, if not create it
    if (mongoose.models.Patient) {
      this.model = mongoose.models.Patient as Model<IPatient>;
    } else {
      this.model = mongoose.model<IPatient>('Patient', PatientSchema);
    }
  }

  /**
   * Find patient by health card number (exact match)
   */
  async findByHealthCard(healthCard: string): Promise<IPatient | null> {
    return await this.model.findOne({ healthCard: healthCard.trim() });
  }

  /**
   * Find patient by name and DOB (fuzzy matching on name, exact on DOB)
   */
  async findByNameAndDOB(fullName: string, dob: Date): Promise<IPatient[]> {
    // Normalize the name for matching
    const normalizedName = fullName.toLowerCase().trim();
    const nameParts = normalizedName.split(/\s+/);
    
    // Build query for fuzzy name matching
    const nameRegex = new RegExp(nameParts.join('.*'), 'i');
    
    // Match DOB exactly (within same day)
    const startOfDay = new Date(dob);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dob);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.model.find({
      fullName: nameRegex,
      dob: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });
  }

  /**
   * Create a new patient
   */
  async create(patientData: {
    firstName: string;
    lastName: string;
    fullName: string;
    dob: Date;
    healthCard: string;
  }): Promise<IPatient> {
    return await this.model.create(patientData);
  }

  /**
   * Add document reference to patient
   */
  async addDocument(patientId: string | mongoose.Types.ObjectId, documentId: string | mongoose.Types.ObjectId): Promise<void> {
    await this.model.updateOne(
      { _id: patientId },
      { $addToSet: { documents: documentId } }
    );
  }

  /**
   * Find patient by ID with populated documents
   */
  async findById(id: string | mongoose.Types.ObjectId): Promise<IPatient | null> {
    return await this.model.findById(id).populate('documents');
  }

  /**
   * Find all patients (with pagination)
   */
  async findAll(limit: number = 50, skip: number = 0): Promise<IPatient[]> {
    return await this.model.find().limit(limit).skip(skip).populate('documents');
  }

  /**
   * Get the underlying Mongoose model (for advanced operations)
   */
  getModel(): Model<IPatient> {
    return this.model;
  }
}

