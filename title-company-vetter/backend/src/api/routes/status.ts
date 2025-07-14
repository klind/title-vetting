import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { createSuccessResponse } from '../../utils/response-helpers.js';
import { env } from '../../config/environment.js';

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Detailed service status
 *     description: Returns detailed information about the service status, configuration, and runtime
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service status information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatusResponse'
 *             example:
 *               status: "healthy"
 *               timestamp: "2025-07-14T11:42:00.000Z"
 *               service: "title-company-vetter"
 *               version: "1.0.0"
 *               environment: "development"
 *               configuration:
 *                 rateLimit: 10
 *                 corsOrigin: "*"
 *                 logLevel: "info"
 *                 whoisTimeout: 30000
 *                 maxConcurrentRequests: 5
 */
export function handleStatusRequest(
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