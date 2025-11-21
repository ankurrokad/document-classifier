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
   * Update classification results
   */
  async updateClassification(
    id: string | mongoose.Types.ObjectId,
    label: string,
    confidence: number
  ): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        status: 'classified',
        'classification.label': label,
        'classification.confidence': confidence,
        $push: {
          processingLogs: {
            ts: new Date(),
            step: 'classification',
            message: `Classified as ${label} with ${confidence}% confidence`,
          },
        },
      }
    );
  }

  /**
   * Update extracted data and status
   */
  async updateExtractedDataAndStatus(
    id: string | mongoose.Types.ObjectId,
    extractedData: Partial<IDocument['extracted']>
  ): Promise<void> {
    const update: any = {
      status: 'extracted',
      $push: {
        processingLogs: {
          ts: new Date(),
          step: 'extraction',
          message: 'Field extraction complete',
        },
      },
    };
    Object.keys(extractedData).forEach((key) => {
      update[`extracted.${key}`] = (extractedData as any)[key];
    });
    await this.model.updateOne({ _id: id }, update);
  }

  /**
   * Update patient match
   */
  async updatePatientMatch(
    id: string | mongoose.Types.ObjectId,
    patientId: string | mongoose.Types.ObjectId | null,
    matchMethod: string,
    confidence: number
  ): Promise<void> {
    const update: any = {
      status: patientId ? 'matched' : 'unmatched',
      $push: {
        processingLogs: {
          ts: new Date(),
          step: 'matching',
          message: patientId
            ? `Matched to patient using ${matchMethod} (${confidence}% confidence)`
            : 'No patient match found',
        },
      },
    };

    if (patientId) {
      update.matchedPatientId = patientId;
    }

    await this.model.updateOne({ _id: id }, update);
  }

  /**
   * Mark document as complete
   */
  async markComplete(id: string | mongoose.Types.ObjectId): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      {
        status: 'complete',
        $push: {
          processingLogs: {
            ts: new Date(),
            step: 'complete',
            message: 'Document processing complete',
          },
        },
      }
    );
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

