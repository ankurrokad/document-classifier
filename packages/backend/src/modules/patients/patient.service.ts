import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class PatientService {
  constructor(
    @InjectModel('Patient') private patientModel: Model<any>,
  ) {}

  async findById(id: string) {
    return await this.patientModel.findById(id).populate('documents').exec();
  }

  async findAll(options: {
    limit?: number;
    skip?: number;
  }) {
    const patients = await this.patientModel
      .find()
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .populate('documents')
      .sort({ _id: -1 })
      .exec();

    const total = await this.patientModel.countDocuments();

    return {
      patients,
      total,
      limit: options.limit || 50,
      skip: options.skip || 0,
    };
  }

  async create(patientData: {
    firstName: string;
    lastName: string;
    dob: string;
    healthCard: string;
  }) {
    const fullName = `${patientData.firstName} ${patientData.lastName}`;
    const dob = new Date(patientData.dob);

    return await this.patientModel.create({
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      fullName,
      dob,
      healthCard: patientData.healthCard,
    });
  }
}

