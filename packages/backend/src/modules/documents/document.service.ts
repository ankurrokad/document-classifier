import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MinioStorage } from '@doc-clf/storage';
import { Queue } from 'bullmq';

@Injectable()
export class DocumentsService {
  private queue = new Queue('doc:process', {
    connection: { 
      host: process.env.REDIS_HOST!, 
      port: Number(process.env.REDIS_PORT!)
    }
  });

  constructor(
    @InjectModel('Document') private docModel: Model<any>,
    private storage: MinioStorage,
  ) {}

  async handleUpload(file: Express.Multer.File) {
    const doc = await this.docModel.create({
      status: 'uploaded',
    });

    const objectKey = `documents/original/${doc._id}.pdf`;

    await this.storage.uploadBuffer(
      process.env.MINIO_BUCKET_ORIGINAL!,
      objectKey,
      file.buffer,
    );

    await this.docModel.updateOne(
      { _id: doc._id },
      { originalObjectKey: objectKey }
    );

    await this.queue.add('process', { documentId: doc._id });

    return { documentId: doc._id };
  }

  async findById(id: string) {
    return await this.docModel.findById(id).populate('matchedPatientId').exec();
  }

  async findAll(options: {
    limit?: number;
    skip?: number;
    status?: string;
    type?: string;
  }) {
    const query: any = {};

    if (options.status) {
      query.status = options.status;
    }

    if (options.type) {
      query['classification.label'] = options.type;
    }

    const documents = await this.docModel
      .find(query)
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .populate('matchedPatientId')
      .sort({ _id: -1 })
      .exec();

    const total = await this.docModel.countDocuments(query);

    return {
      documents,
      total,
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
  }
}
