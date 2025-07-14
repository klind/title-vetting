import { config } from 'dotenv';
import { EnvSchema, type EnvConfig } from '../types/common.js';

// Load environment variables
config();

/**
 * Environment configuration with validation
 */
export const env: EnvConfig = EnvSchema.parse(process.env); 