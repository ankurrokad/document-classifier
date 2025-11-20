import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Loads .env file from the project root directory
 * Works in both development (ts-node) and production (compiled) scenarios
 */
export function loadEnv(): void {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'), // Root directory (when running from root)
    path.resolve(__dirname, '../../../../.env'), // From libs/common (dev) or dist (prod)
    path.resolve(__dirname, '../../../.env'), // Alternative path
  ];

  let envPath: string | undefined;
  for (const envFile of possiblePaths) {
    if (fs.existsSync(envFile)) {
      envPath = envFile;
      break;
    }
  }

  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    // Try default location as fallback
    dotenv.config();
  }
}

/**
 * Validates that required environment variables are set
 * Throws an error with a clear message if any are missing
 */
export function validateEnv(requiredVars: string[]): void {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }
}

/**
 * Gets an environment variable with optional default value
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  return value;
}

/**
 * Gets an environment variable as a number with optional default
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number: ${value}`);
  }
  return num;
}

/**
 * Gets an environment variable as a boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable ${key} is not set and no default value provided`);
  }
  return value.toLowerCase() === 'true';
}

