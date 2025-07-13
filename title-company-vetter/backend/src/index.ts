import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { config } from 'dotenv';
import { WhoisRequestSchema, EnvSchema } from './types.js';
import { performWhoisLookup } from './whois-service.js';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createCorsResponse,
  createMethodNotAllowedResponse,
  createHealthCheckResponse,
  isMethodAllowed,
  isValidContentType,
  parseRequestBody,
  getClientIp,
  logRequest,
  measurePerformance,
  StatusCodes
} from './response-helpers.js';

// Load environment variables
config();

/**
 * Environment configuration with validation
 */
const env = EnvSchema.parse(process.env);

/**
 * Allowed HTTP methods for the API
 */
const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'];

/**
 * API routes
 */
const ROUTES = {
  HEALTH: '/health',
  WHOIS: '/whois',
  STATUS: '/status',
} as const;

/**
 * Main Lambda handler for title company vetting
 * 
 * @param event - API Gateway proxy event
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = context.awsRequestId;
  const clientIp = getClientIp(event);

  // Log incoming request
  logRequest({
    requestId,
    method: event.httpMethod,
    path: event.path,
    userAgent: event.headers['User-Agent'],
    sourceIp: clientIp,
    timestamp: new Date().toISOString(),
  });

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createCorsResponse(event, context);
    }

    // Validate HTTP method
    if (!isMethodAllowed(event.httpMethod, ALLOWED_METHODS)) {
      return createMethodNotAllowedResponse(
        event.httpMethod,
        ALLOWED_METHODS,
        event,
        context
      );
    }

    // Route requests based on path
    const route = event.path || '';

    // Health check endpoint
    if (route === ROUTES.HEALTH || route.endsWith('/health')) {
      if (event.httpMethod !== 'GET') {
        return createMethodNotAllowedResponse('GET', ['GET'], event, context);
      }
      return createHealthCheckResponse(event, context);
    }

    // Status endpoint (similar to health but with more details)
    if (route === ROUTES.STATUS || route.endsWith('/status')) {
      if (event.httpMethod !== 'GET') {
        return createMethodNotAllowedResponse('GET', ['GET'], event, context);
      }
      return handleStatusRequest(event, context);
    }

    // WHOIS lookup endpoint
    if (route === ROUTES.WHOIS || route.endsWith('/whois')) {
      if (event.httpMethod !== 'POST') {
        return createMethodNotAllowedResponse('POST', ['POST'], event, context);
      }
      return await handleWhoisRequest(event, context, clientIp);
    }

    // Default route - return 404
    return createErrorResponse(
      `Route not found: ${route}`,
      event,
      context,
      StatusCodes.NOT_FOUND
    );

  } catch (error) {
    console.error('Unhandled error in Lambda handler:', error);
    
    return createErrorResponse(
      'Internal server error',
      event,
      context,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  } finally {
    const duration = Date.now() - startTime;
    console.log(`Request ${requestId} completed in ${duration}ms`);
  }
};

/**
 * Handles WHOIS lookup requests
 * 
 * @param event - API Gateway proxy event
 * @param context - Lambda context
 * @param clientIp - Client IP address
 * @returns API Gateway proxy result
 */
async function handleWhoisRequest(
  event: APIGatewayProxyEvent,
  context: Context,
  clientIp: string
): Promise<APIGatewayProxyResult> {
  try {
    // Validate content type
    if (!isValidContentType(event)) {
      return createErrorResponse(
        'Content-Type must be application/json',
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    // Parse request body
    const body = parseRequestBody(event.body);
    if (!body) {
      return createErrorResponse(
        'Request body is required',
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    // Validate request format
    const validation = WhoisRequestSchema.safeParse(body);
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      
      return createErrorResponse(
        `Invalid request format: ${errorMessage}`,
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    const { url } = validation.data;

    console.log(`Processing WHOIS lookup for URL: ${url} from IP: ${clientIp}`);

    // Perform WHOIS lookup with performance measurement
    const { result: whoisReport, duration } = await measurePerformance(
      `WHOIS lookup for ${url}`,
      () => performWhoisLookup(url, clientIp)
    );

    console.log(`WHOIS lookup completed for ${url} in ${duration}ms`);

    return createSuccessResponse(whoisReport, event, context);

  } catch (error) {
    console.error('Error in WHOIS lookup handler:', error);

    // Handle specific error types
    if (error && typeof error === 'object' && 'type' in error) {
      const apiError = error as any;
      
      switch (apiError.type) {
        case 'VALIDATION_ERROR':
          return createErrorResponse(apiError.message || 'Validation error', event, context, StatusCodes.BAD_REQUEST);
        case 'RATE_LIMIT_ERROR':
          return createErrorResponse(apiError.message || 'Rate limit exceeded', event, context, StatusCodes.RATE_LIMITED);
        case 'WHOIS_LOOKUP_ERROR':
          return createErrorResponse(apiError.message || 'WHOIS lookup failed', event, context, StatusCodes.BAD_GATEWAY);
        case 'TIMEOUT_ERROR':
          return createErrorResponse(apiError.message || 'Request timeout', event, context, StatusCodes.GATEWAY_TIMEOUT);
        case 'NETWORK_ERROR':
          return createErrorResponse(apiError.message || 'Network error', event, context, StatusCodes.SERVICE_UNAVAILABLE);
        default:
          return createErrorResponse(apiError.message || 'Internal server error', event, context, StatusCodes.INTERNAL_SERVER_ERROR);
      }
    }

    return createErrorResponse(
      'WHOIS lookup failed',
      event,
      context,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Handles status/health check requests with detailed information
 * 
 * @param event - API Gateway proxy event
 * @param context - Lambda context
 * @returns API Gateway proxy result
 */
function handleStatusRequest(
  event: APIGatewayProxyEvent,
  context: Context
): APIGatewayProxyResult {
  const statusData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'title-company-vetter',
    version: process.env.npm_package_version || '1.0.0',
    environment: env.NODE_ENV,
    lambda: {
      functionName: context.functionName,
      functionVersion: context.functionVersion,
      memoryLimitInMB: context.memoryLimitInMB,
      remainingTimeInMillis: context.getRemainingTimeInMillis(),
      requestId: context.awsRequestId,
    },
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
    },
    memory: process.memoryUsage(),
    configuration: {
      rateLimit: env.API_RATE_LIMIT,
      corsOrigin: env.CORS_ORIGIN,
      logLevel: env.LOG_LEVEL,
      whoisTimeout: env.WHOIS_TIMEOUT,
      maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS,
    },
    dependencies: {
      'whois-json': '^2.0.4',
      'zod': '^3.25.67',
    },
  };

  return createSuccessResponse(statusData, event, context);
}

/**
 * Graceful shutdown handler (for local development)
 */
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, performing graceful shutdown...');
  // In a real application, you might want to:
  // - Close database connections
  // - Finish processing current requests
  // - Clear caches
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, performing graceful shutdown...');
  process.exit(0);
});

/**
 * Unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to send this to a monitoring service
});

/**
 * Uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // In production, you might want to send this to a monitoring service
  process.exit(1);
});

// Export individual handlers for testing
export { handleWhoisRequest, handleStatusRequest };