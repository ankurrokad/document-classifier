import mongoose, { Model, Document as MongooseDocument } from 'mongoose';
import { DocumentSchema } from '../schemas/document.schema';

export interface IDocument extends MongooseDocument {
  _id: mongoose.Types.ObjectId;
  originalObjectKey?: string;
  processedObjectKeys?: string[];
  status: string;
  classification?: {
    label?: string;
    confidence?: number;
  };
  extracted?: {
    patientName?: string;
    healthCard?: string;
    dob?: Date;
    provider?: string;
    medications?: any[];
    rawText?: string;
  };
  matchedPatientId?: mongoose.Types.ObjectId;
  processingLogs?: Array<{
    ts: Date;
    step: string;
    message: string;
  }>;
}

export class DocumentModel {
  private model: Model<IDocument>;

  constructor() {
    // Check if model already exists, if not create it
    if (mongoose.models.Document) {
      this.model = mongoose.models.Document as Model<IDocument>;
    } else {
      this.model = mongoose.model<IDocument>('Document', DocumentSchema);
    }
  }

  /**
   * Find document by ID
   */
  async findById(id: string | mongoose.Types.ObjectId): Promise<IDocument | null> {
    return await this.model.findById(id);
  }

  /**
   * Create a new document
   */
  async create(data: Partial<IDocument>): Promise<IDocument> {
    return await this.model.create(data);
  }

  /**
   * Update document status with optional log entry
   */
  async updateStatus(
    id: string | mongoose.Types.ObjectId,
    status: string,
    log?: { step: string; message: string }
  ): Promise<void> {
    const update: any = { status };
    if (log) {
      update.$push = {
        processingLogs: {
          ts: new Date(),
          step: log.step,
          message: log.message,
        },
      };
    }
    await this.model.updateOne({ _id: id }, update);
  }

  /**
   * Update OCR results
   */
  async updateOCRResults(
    id: string | mongoose.Types.ObjectId,
    rawText: string,
    pageCount: number,
    confidence: number
  ): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        status: 'ocr_complete',
        'extracted.rawText': rawText,
        $push: {
          processingLogs: {
            ts: new Date(),
            step: 'ocr',
            message: `OCR complete: ${pageCount} pages, ${confidence.toFixed(2)}% confidence`,
          },
        },
      }
    );
  }

  /**
   * Add a processing log entry
   */
  async addProcessingLog(
    id: string | mongoose.Types.ObjectId,
    step: string,
    message: string
  ): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        $push: {
          processingLogs: {
            ts: new Date(),
            step,
            message,
          },
        },
      }
    );
  }

  /**
   * Update extracted data fields
   */
  async updateExtractedData(
    id: string | mongoose.Types.ObjectId,
    extractedData: Partial<IDocument['extracted']>
  ): Promise<void> {
    const update: any = {};
    Object.keys(extractedData).forEach((key) => {
      update[`extracted.${key}`] = (extractedData as any)[key];
    });
    await this.model.updateOne({ _id: id }, update);
  }

  /**
   * Update document with error status
   */
  async updateErrorStatus(
    id: string | mongoose.Types.ObjectId,
    step: string,
    errorMessage: string
  ): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        status: `${step}_failed`,
        $push: {
          processingLogs: {
            ts: new Date(),
            step,
            message: `${step} failed: ${errorMessage}`,
          },
        },
      }
    );
  }

  /**
   * Get the underlying Mongoose model (for advanced operations)
   */
  getModel(): Model<IDocument> {
    return this.model;
  }
}

