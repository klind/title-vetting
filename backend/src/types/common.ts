import { z } from 'zod';

/**
 * Error types for better error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WHOIS_LOOKUP_ERROR = 'WHOIS_LOOKUP_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Custom error interface
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  statusCode: number;
}

/**
 * Rate limiting state interface
 */
export interface RateLimitState {
  requests: number;
  windowStart: number;
  isLimited: boolean;
}

/**
 * Environment variable validation schema
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_RATE_LIMIT: z.string().default('10').transform(Number),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WHOIS_TIMEOUT: z.string().default('30000').transform(Number),
  MAX_CONCURRENT_REQUESTS: z.string().default('5').transform(Number),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'type' in error && 'statusCode' in error;
}

/**
 * Converts unknown error to ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      type: ErrorType.INTERNAL_ERROR,
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    type: ErrorType.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    statusCode: 500,
  };
} 