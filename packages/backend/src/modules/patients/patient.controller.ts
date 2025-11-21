import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { PatientService } from './patient.service';

@Controller('patients')
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Get()
  async listPatients(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.patientService.findAll({
      limit: limit ? parseInt(limit, 10) : 50,
      skip: skip ? parseInt(skip, 10) : 0,
    });
  }

  @Get(':id')
  async getPatient(@Param('id') id: string) {
    const patient = await this.patientService.findById(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  @Post()
  async createPatient(@Body() patientData: {
    firstName: string;
    lastName: string;
    dob: string;
    healthCard: string;
  }) {
    return this.patientService.create(patientData);
  }
}

