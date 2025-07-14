import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createErrorResponse } from '../../utils/response-helpers.js';
import { StatusCodes } from '../../config/constants.js';

/**
 * Checks if HTTP method is allowed
 * 
 * @param method - HTTP method to check
 * @param allowedMethods - Array of allowed methods
 * @returns True if method is allowed
 */
export function isMethodAllowed(method: string, allowedMethods: readonly string[]): boolean {
  return allowedMethods.includes(method.toUpperCase());
}

/**
 * Creates a method not allowed response
 * 
 * @param method - The method that was attempted
 * @param allowedMethods - Array of allowed methods
 * @param event - API Gateway event
 * @param context - Lambda context
 * @returns Method not allowed response
 */
export function createMethodNotAllowedResponse(
  method: string,
  allowedMethods: readonly string[],
  event?: APIGatewayProxyEvent,
  context?: Context
): APIGatewayProxyResult {
  const response = createErrorResponse(
    `Method ${method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    event,
    context,
    StatusCodes.METHOD_NOT_ALLOWED
  );

  // Add Allow header for method not allowed responses
  response.headers = {
    ...response.headers,
    'Allow': allowedMethods.join(', '),
  };

  return response;
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
 * Extracts client IP from event
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