import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { env } from '../config/environment.js';
import { ROUTES, ALLOWED_METHODS, StatusCodes } from '../config/constants.js';
import { handleWhoisRequest } from './routes/whois.js';
import { handleWebsiteRequest } from './routes/website.js';
import { handleSocialMediaRequest } from './routes/social-media.js';
import { handleCombinedRequest } from './routes/combined.js';
import { handleHealthRequest } from './routes/health.js';
import { handleStatusRequest } from './routes/status.js';
import { createCorsResponse } from './middleware/cors.js';
import { 
  isMethodAllowed, 
  createMethodNotAllowedResponse,
  getClientIp 
} from './middleware/validation.js';
import { createErrorResponse } from '../utils/response-helpers.js';
import { logRequest } from '../utils/logger.js';

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
      return handleHealthRequest(event, context);
    }

    // Status endpoint (similar to health but with more details)
    if (route === ROUTES.STATUS || route.endsWith('/status')) {
      if (event.httpMethod !== 'GET') {
        return createMethodNotAllowedResponse('GET', ['GET'], event, context);
      }
      return handleStatusRequest(event, context);
    }

    // WHOIS lookup endpoint (comprehensive - includes whois, website, and risk factors)
    if (route === ROUTES.WHOIS || route.endsWith('/whois')) {
      if (event.httpMethod !== 'POST') {
        return createMethodNotAllowedResponse('POST', ['POST'], event, context);
      }
      return await handleWhoisRequest(event, context, clientIp);
    }

    // Website validation endpoint (website analysis only)
    if (route === ROUTES.WEBSITE || route.endsWith('/website')) {
      if (event.httpMethod !== 'POST') {
        return createMethodNotAllowedResponse('POST', ['POST'], event, context);
      }
      return await handleWebsiteRequest(event, context, clientIp);
    }

    // Social media validation endpoint (social media analysis only)
    if (route === ROUTES.SOCIAL_MEDIA || route.endsWith('/social-media')) {
      if (event.httpMethod !== 'POST') {
        return createMethodNotAllowedResponse('POST', ['POST'], event, context);
      }
      return await handleSocialMediaRequest(event, context, clientIp);
    }

    // Combined analysis endpoint (WHOIS + Website + Social Media + Risk Analysis)
    if (route === ROUTES.COMBINED || route.endsWith('/combined')) {
      if (event.httpMethod !== 'POST') {
        return createMethodNotAllowedResponse('POST', ['POST'], event, context);
      }
      return await handleCombinedRequest(event, context, clientIp);
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
export { handleWhoisRequest, handleStatusRequest, handleHealthRequest }; 