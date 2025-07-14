import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getCorsHeaders } from '../../types/api.js';

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
 * Adds CORS headers to any response
 * 
 * @param response - API Gateway response
 * @returns Response with CORS headers
 */
export function addCorsHeaders(response: APIGatewayProxyResult): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...getCorsHeaders(),
    },
  };
} 