import * as dotenv from 'dotenv';

// Load .env file from root directory
const envPath = `${process.cwd()}/.env`;
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  dotenv.config({ override: true });
}

import { genPatient } from './utils/patient';
import { connectMongoDB, disconnectMongoDB, PatientModel } from '@doc-clf/dal';
import { faker } from '@faker-js/faker';

// Get patient count from CLI argument or use default
const patientCount = process.argv[2] ? Number(process.argv[2]) : 100;

if (isNaN(patientCount) || patientCount <= 0) {
  console.error('Error: Patient count must be a positive number');
  console.error('Usage: ts-node generate-patients.ts <count>');
  process.exit(1);
}

const patientModel = new PatientModel();

// Generate a unique health card number
function generateUniqueHealthCard(existingHealthCards: Set<string>): string {
  let healthCard: string;
  let attempts = 0;
  const maxAttempts = 1000;
  
  do {
    healthCard = faker.string.numeric(10);
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique health card number after many attempts');
    }
  } while (existingHealthCards.has(healthCard));
  
  existingHealthCards.add(healthCard);
  return healthCard;
}

async function run() {
  try {
    console.log(`Connecting to MongoDB...`);
    await connectMongoDB();
    console.log('Connected to MongoDB');

    // Fetch existing health card numbers to ensure uniqueness
    console.log('Fetching existing health card numbers...');
    const model = patientModel.getModel();
    const existingPatients = await model.find({}, { healthCard: 1 }).lean();
    const existingHealthCards = new Set<string>(
      existingPatients.map((p: any) => p.healthCard)
    );
    console.log(`Found ${existingHealthCards.size} existing health card numbers`);

    console.log(`Generating ${patientCount} patients...`);
    const patientsToInsert: Array<{
      firstName: string;
      lastName: string;
      fullName: string;
      dob: Date;
      healthCard: string;
    }> = [];

    // Generate all patients with unique health card numbers
    for (let i = 0; i < patientCount; i++) {
      const patientData = genPatient();
      
      // Generate unique health card number
      const uniqueHealthCard = generateUniqueHealthCard(existingHealthCards);
      
      // Convert dob string to Date object for MongoDB
      const dob = new Date(patientData.dob);

      patientsToInsert.push({
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        fullName: patientData.fullName,
        dob: dob,
        healthCard: uniqueHealthCard,
      });

      if ((i + 1) % 100 === 0) {
        console.log(`Prepared ${i + 1}/${patientCount} patients for bulk insert`);
      }
    }

    // Use insertMany for bulk insert
    console.log('Inserting patients into MongoDB...');
    const result = await model.insertMany(patientsToInsert, { ordered: false });
    
    console.log(`\nDone! Created ${result.length} patients`);
  } catch (error: any) {
    // Handle partial success with insertMany
    if (error.writeErrors) {
      const inserted = error.insertedCount || 0;
      const failed = error.writeErrors?.length || 0;
      console.error(`\nPartial success: ${inserted} patients created, ${failed} failed`);
      if (failed > 0) {
        console.error('First error:', error.writeErrors[0].errmsg);
      }
    } else {
      console.error('Error generating patients:', error);
      process.exit(1);
    }
  } finally {
    await disconnectMongoDB();
    console.log('Disconnected from MongoDB');
  }
}

run();

