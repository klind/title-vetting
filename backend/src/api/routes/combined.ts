import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { WhoisRequestSchema } from '../../types/whois.js';
import { performWhoisLookup } from '../../services/whois/whois-service.js';
import { 
  createSuccessResponse, 
  createErrorResponse,
  isValidContentType,
  parseRequestBody,
  getClientIp
} from '../../utils/response-helpers.js';
import { measurePerformance } from '../../utils/performance.js';
import { StatusCodes } from '../../config/constants.js';

/**
 * @swagger
 * /combined:
 *   post:
 *     summary: Perform comprehensive domain analysis
 *     description: Combines WHOIS lookup, website validation, and social media analysis into one comprehensive report
 *     tags: [Combined]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WhoisRequest'
 *           examples:
 *             domain_only:
 *               summary: Domain name only
 *               value:
 *                 url: "pattentitle.com"
 *             full_url:
 *               summary: Full URL with protocol
 *               value:
 *                 url: "https://pattentitle.com"
 *     responses:
 *       200:
 *         description: Successful comprehensive analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 whois:
 *                   $ref: '#/components/schemas/WhoisData'
 *                 website:
 *                   type: object
 *                   properties:
 *                     hasWebsite:
 *                       type: boolean
 *                     isAccessible:
 *                       type: boolean
 *                     hasDns:
 *                       type: boolean
 *                     content:
 *                       type: object
 *                     contacts:
 *                       type: object
 *                     ssl:
 *                       type: object
 *                     socialMedia:
 *                       type: array
 *                 riskFactors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 requestId:
 *                   type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */

/**
 * Handles combined analysis requests (WHOIS + Website + Social Media)
 */
export async function handleCombinedRequest(
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

    console.log(`Processing comprehensive analysis for URL: ${url} from IP: ${clientIp}`);

    // Perform comprehensive analysis with performance measurement
    const { result: comprehensiveReport, duration } = await measurePerformance(
      `Comprehensive analysis for ${url}`,
      () => performWhoisLookup(url, clientIp)
    );

    console.log(`Comprehensive analysis completed for ${url} in ${duration}ms`);

    return createSuccessResponse(comprehensiveReport, event, context);

  } catch (error: any) {
    console.error('Combined analysis error:', error);
    
    // Handle specific API errors
    if (error.statusCode) {
      return createErrorResponse(
        error.message || 'API error occurred',
        event,
        context,
        error.statusCode
      );
    }

    // Generic error response
    return createErrorResponse(
      'Internal server error during comprehensive analysis',
      event,
      context,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
} 