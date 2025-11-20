import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsModule } from './modules/documents/document.module';
import { PatientsModule } from './modules/patients/patient.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!),
    DocumentsModule,
    PatientsModule,
  ],
})
export class AppModule {}
