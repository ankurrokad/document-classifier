import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './document.service';
import { DocumentSchema } from '@doc-clf/dal';
import { MinioStorage } from '@doc-clf/storage';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Document', schema: DocumentSchema }]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, MinioStorage],
  exports: [DocumentsService],
})
export class DocumentsModule {}

