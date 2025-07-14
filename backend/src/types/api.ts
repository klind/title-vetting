import { z } from 'zod';
import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Lambda event schema for request validation
 */
export const LambdaEventSchema = z.object({
  body: z.string().nullable(),
  headers: z.record(z.string()),
  httpMethod: z.string(),
  path: z.string(),
  queryStringParameters: z.record(z.string()).nullable(),
  requestContext: z.object({
    requestId: z.string(),
    accountId: z.string(),
  }).passthrough(),
});

export type LambdaEvent = z.infer<typeof LambdaEventSchema>;

/**
 * CORS headers configuration
 */
export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Max-Age': string;
  [header: string]: string;
}

/**
 * Gets CORS headers based on environment
 */
export function getCorsHeaders(): CorsHeaders {
  const origin = process.env.CORS_ORIGIN || '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
): APIGatewayProxyResult {
  const response: ApiResponse<T> = {
    success: true,
    data: data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return {
    statusCode: 200,
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  details?: any,
  requestId?: string,
): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Add details if provided (but don't expose sensitive info in production)
  if (details && process.env.NODE_ENV !== 'production') {
    response.data = { details };
  }

  return {
    statusCode,
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
} 