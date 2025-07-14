import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  createSuccessResponse as baseCreateSuccessResponse,
  createErrorResponse as baseCreateErrorResponse,
  getCorsHeaders,
  type ApiResponse
} from '../types/api.js';
import { 
  toApiError,
  isApiError,
  type ApiError,
  ErrorType
} from '../types/common.js';
import { StatusCodes } from '../config/constants.js';
import { logResponse, type ResponseLogData } from './logger.js';
import { generateRequestId } from './performance.js';

/**
 * Enhanced success response creator with logging
 * 
 * @param data - Response data
 * @param event - Lambda event for context
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
export function createSuccessResponse<T>(
  data: T,
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const requestId = context?.awsRequestId || generateRequestId();
  const response = baseCreateSuccessResponse(data, requestId);

  // Log successful response
  if (event && context) {
    logResponse({
      requestId,
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: getClientIp(event),
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      responseSize: response.body.length,
    });
  }

  return response;
}

/**
 * Enhanced error response creator with logging
 * 
 * @param error - Error object or message
 * @param event - Lambda event for context
 * @param context - Lambda context
 * @param statusCode - HTTP status code override
 * @returns API Gateway proxy result
 */
export function createErrorResponse(
  error: string | Error | ApiError,
  event?: APIGatewayProxyEvent,
  context?: Context,
  statusCode?: number
): APIGatewayProxyResult {
  const requestId = context?.awsRequestId || generateRequestId();
  
  let errorMessage: string;
  let finalStatusCode: number;

  if (typeof error === 'string') {
    errorMessage = error;
    finalStatusCode = statusCode || StatusCodes.BAD_REQUEST;
  } else if (isApiError(error)) {
    errorMessage = error.message;
    finalStatusCode = statusCode || error.statusCode;
  } else {
    const apiError = toApiError(error);
    errorMessage = apiError.message;
    finalStatusCode = statusCode || apiError.statusCode;
  }

  const response = baseCreateErrorResponse(errorMessage, finalStatusCode, undefined, requestId);

  // Log error response
  if (event && context) {
    logResponse({
      requestId,
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: getClientIp(event),
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      responseSize: response.body.length,
      error: errorMessage,
    });
  }

  return response;
}

/**
 * Creates a CORS preflight response
 * 
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns CORS preflight response
 */
export function createCorsResponse(
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: '',
  };
}

/**
 * Creates a health check response
 * 
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns Health check response
 */
export function createHealthCheckResponse(
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  return createSuccessResponse(healthData, event, context);
}

/**
 * Creates a rate limit exceeded response
 * 
 * @param resetTime - When the rate limit resets
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns Rate limit response
 */
export function createRateLimitResponse(
  resetTime: number,
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const response = createErrorResponse(
    'Rate limit exceeded. Please try again later.',
    event,
    context,
    StatusCodes.RATE_LIMITED
  );

  // Add rate limit headers
  response.headers = {
    ...response.headers,
    'X-RateLimit-Reset': resetTime.toString(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
  };

  return response;
}

/**
 * Extracts client IP from event headers
 * 
 * @param event - API Gateway event
 * @returns Client IP address
 */
export function getClientIp(event: APIGatewayProxyEvent): string {
  // Check various headers for the real IP
  const forwardedFor = event.headers['x-forwarded-for'] || event.headers['X-Forwarded-For'];
  const realIp = event.headers['x-real-ip'] || event.headers['X-Real-IP'];
  const sourceIp = event.requestContext?.identity?.sourceIp;

  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return sourceIp || 'unknown';
}

/**
 * Parses request body safely
 * 
 * @param body - Request body string
 * @returns Parsed body or null if parsing fails
 */
export function parseRequestBody(body: string | null): any {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return null;
  }
}

/**
 * Validates request content type
 * 
 * @param event - API Gateway event
 * @param expectedTypes - Expected content types (defaults to application/json)
 * @returns True if content type is valid
 */
export function isValidContentType(
  event: APIGatewayProxyEvent,
  expectedTypes: string[] = ['application/json']
): boolean {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
  
  return expectedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );
} 