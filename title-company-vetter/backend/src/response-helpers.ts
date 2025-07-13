import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { 
  ApiResponse, 
  ApiError, 
  ErrorType, 
  createSuccessResponse as baseCreateSuccessResponse,
  createErrorResponse as baseCreateErrorResponse,
  getCorsHeaders,
  toApiError,
  isApiError 
} from './types.js';

/**
 * HTTP status codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Request logging configuration
 */
interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  sourceIp?: string;
  timestamp: string;
  duration?: number;
}

/**
 * Response logging configuration
 */
interface ResponseLogData extends RequestLogData {
  statusCode: number;
  responseSize: number;
  error?: string;
}

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
  
  let apiError: ApiError;
  let finalStatusCode: number;
  
  if (isApiError(error)) {
    apiError = error;
    finalStatusCode = statusCode || error.statusCode;
  } else {
    apiError = toApiError(error);
    finalStatusCode = statusCode || apiError.statusCode;
  }

  const response = baseCreateErrorResponse(
    apiError.message,
    finalStatusCode,
    apiError.details,
    requestId
  );

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
      error: apiError.message,
    });
  }

  return response;
}

/**
 * Creates a CORS preflight response
 * 
 * @param event - Lambda event
 * @param context - Lambda context
 * @returns API Gateway proxy result for OPTIONS request
 */
export function createCorsResponse(
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const requestId = context?.awsRequestId || generateRequestId();

  const response: APIGatewayProxyResult = {
    statusCode: StatusCodes.OK,
    headers: {
      ...getCorsHeaders(),
      'Content-Length': '0',
    },
    body: '',
  };

  // Log CORS preflight
  if (event && context) {
    logResponse({
      requestId,
      method: event.httpMethod,
      path: event.path,
      userAgent: event.headers['User-Agent'],
      sourceIp: getClientIp(event),
      timestamp: new Date().toISOString(),
      statusCode: response.statusCode,
      responseSize: 0,
    });
  }

  return response;
}

/**
 * Validates HTTP method against allowed methods
 * 
 * @param method - HTTP method to validate
 * @param allowedMethods - Array of allowed methods
 * @returns True if method is allowed
 */
export function isMethodAllowed(method: string, allowedMethods: string[]): boolean {
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * Creates method not allowed response
 * 
 * @param method - The attempted method
 * @param allowedMethods - Array of allowed methods
 * @param event - Lambda event
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
export function createMethodNotAllowedResponse(
  method: string,
  allowedMethods: string[],
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const headers = {
    ...getCorsHeaders(),
    'Allow': allowedMethods.join(', '),
  };

  const requestId = context?.awsRequestId || generateRequestId();
  const message = `Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`;

  const response: APIGatewayProxyResult = {
    statusCode: StatusCodes.METHOD_NOT_ALLOWED,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      requestId,
    }),
  };

  // Log method not allowed
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
      error: message,
    });
  }

  return response;
}

/**
 * Extracts client IP from Lambda event
 * 
 * @param event - Lambda event
 * @returns Client IP address
 */
export function getClientIp(event: APIGatewayProxyEvent): string {
  // Check various headers for real IP
  const forwardedFor = event.headers['X-Forwarded-For'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = event.headers['X-Real-IP'];
  if (realIp) {
    return realIp;
  }

  // Fallback to request context
  return event.requestContext?.identity?.sourceIp || 'unknown';
}

/**
 * Parses request body safely
 * 
 * @param body - Request body string
 * @returns Parsed JSON object or null
 */
export function parseRequestBody(body: string | null): any {
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON in request body: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates content type
 * 
 * @param event - Lambda event
 * @param expectedTypes - Array of expected content types
 * @returns True if content type is valid
 */
export function isValidContentType(
  event: APIGatewayProxyEvent,
  expectedTypes: string[] = ['application/json']
): boolean {
  const contentType = event.headers['Content-Type'] || event.headers['content-type'];
  
  if (!contentType) {
    return false;
  }

  return expectedTypes.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Creates rate limit exceeded response
 * 
 * @param resetTime - When rate limit resets
 * @param event - Lambda event
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
export function createRateLimitResponse(
  resetTime: number,
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const headers = {
    ...getCorsHeaders(),
    'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  };

  const requestId = context?.awsRequestId || generateRequestId();
  const message = 'Rate limit exceeded. Please try again later.';

  const response: APIGatewayProxyResult = {
    statusCode: StatusCodes.RATE_LIMITED,
    headers,
    body: JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      requestId,
      retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
    }),
  };

  return response;
}

/**
 * Logs request details
 * 
 * @param data - Request log data
 */
export function logRequest(data: RequestLogData): void {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (['debug', 'info'].includes(logLevel)) {
    console.log('Request:', {
      requestId: data.requestId,
      method: data.method,
      path: data.path,
      sourceIp: data.sourceIp,
      userAgent: data.userAgent,
      timestamp: data.timestamp,
    });
  }
}

/**
 * Logs response details
 * 
 * @param data - Response log data
 */
export function logResponse(data: ResponseLogData): void {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (data.statusCode >= 400) {
    console.error('Response:', {
      requestId: data.requestId,
      method: data.method,
      path: data.path,
      sourceIp: data.sourceIp,
      statusCode: data.statusCode,
      responseSize: data.responseSize,
      error: data.error,
      duration: data.duration,
      timestamp: data.timestamp,
    });
  } else if (['debug', 'info'].includes(logLevel)) {
    console.log('Response:', {
      requestId: data.requestId,
      method: data.method,
      path: data.path,
      sourceIp: data.sourceIp,
      statusCode: data.statusCode,
      responseSize: data.responseSize,
      duration: data.duration,
      timestamp: data.timestamp,
    });
  }
}

/**
 * Measures execution time and logs performance
 * 
 * @param label - Performance label
 * @param fn - Function to measure
 * @returns Function result and duration
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    console.log(`Performance: ${label} completed in ${duration}ms`);
    
    return { result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Performance: ${label} failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * Generates a unique request ID
 * 
 * @returns Unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitizes sensitive data from logs
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'api_key', 'apikey', 'auth'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    }
  }

  return sanitized;
}

/**
 * Creates health check response
 * 
 * @param event - Lambda event
 * @param context - Lambda context
 * @returns Health check response
 */
export function createHealthCheckResponse(
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };

  return createSuccessResponse(data, event, context);
}