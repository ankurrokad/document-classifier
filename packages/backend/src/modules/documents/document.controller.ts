import { Controller, Get, Post, Param, Query, UploadedFile, UseInterceptors, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './document.service';

@Controller('documents')
export class DocumentsController {
  constructor(private docs: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return this.docs.handleUpload(file);
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const document = await this.docs.findById(id);
    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  @Get()
  async listDocuments(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.docs.findAll({
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
      status,
      type,
    });
  }
}

