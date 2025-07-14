import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { WhoisRequestSchema } from '../../types/whois.js';
import { validateUrl, extractDomain } from '../../services/website/url-validator.js';
import { validateWebsiteComprehensive } from '../../services/website/website-validator.js';
import { 
  createSuccessResponse, 
  createErrorResponse,
  isValidContentType,
  parseRequestBody,
  getClientIp
} from '../../utils/response-helpers.js';
import { StatusCodes } from '../../config/constants.js';

/**
 * @swagger
 * /website:
 *   post:
 *     summary: Perform comprehensive website validation
 *     description: Analyzes website accessibility, security, content, and extracts contact information
 *     tags: [Website]
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
 *         description: Successful website validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
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
 *                       properties:
 *                         title:
 *                           type: string
 *                         statusCode:
 *                           type: number
 *                         contentType:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *                     contacts:
 *                       type: object
 *                     ssl:
 *                       type: object
 *                     socialMedia:
 *                       type: array
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
 * Handles website validation requests
 */
export async function handleWebsiteRequest(
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

    // Parse and validate request body
    const body = parseRequestBody(event.body);
    const validation = WhoisRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return createErrorResponse(
        `Invalid request: ${validation.error.issues.map(i => i.message).join(', ')}`,
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    const { url } = validation.data;

    // Validate URL format and extract domain
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      return createErrorResponse(
        `Invalid URL: ${urlValidation.error}`,
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    const domain = urlValidation.domain;
    if (!domain) {
      return createErrorResponse(
        'Could not extract domain from URL',
        event,
        context,
        StatusCodes.BAD_REQUEST
      );
    }

    console.log(`🌐 Starting website validation for: ${domain}`);

    // Perform comprehensive website validation
    const websiteValidation = await validateWebsiteComprehensive(domain, {
      timeout: 10000,
      followRedirects: true,
      followContactPages: true,
      checkSocialMedia: false
    }).catch((error) => {
      console.warn(`Website validation failed: ${error.message}`);
      return {
        hasWebsite: false,
        isAccessible: false,
        hasDns: false,
        error: `Website validation failed: ${error.message}`
      };
    });

    console.log(`✅ Website validation completed for ${domain}`);

    // Return website validation results
    return createSuccessResponse(
      { website: websiteValidation },
      event,
      context
    );

  } catch (error: any) {
    console.error('Website validation error:', error);
    return createErrorResponse(
      'Internal server error during website validation',
      event,
      context,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
} 