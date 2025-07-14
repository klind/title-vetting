import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createHealthCheckResponse } from '../../utils/response-helpers.js';

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Simple health check to verify the service is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               status: "healthy"
 *               timestamp: "2025-07-14T11:42:00.000Z"
 *               uptime: 3600
 */
export function handleHealthRequest(
  event: APIGatewayProxyEvent,
  context: Context
): APIGatewayProxyResult {
  return createHealthCheckResponse(event, context);
} 