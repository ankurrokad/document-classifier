import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';

@Module({
  imports: [],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientsModule {}

