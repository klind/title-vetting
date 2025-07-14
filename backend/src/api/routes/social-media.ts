import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { WhoisRequestSchema } from '../../types/whois.js';
import { validateUrl, extractDomain } from '../../services/website/url-validator.js';
import { SocialMediaValidator } from '../../services/social-media/social-media-validator.js';
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
 * /social-media:
 *   post:
 *     summary: Perform social media validation
 *     description: Analyzes social media presence and validates social media profiles for a domain
 *     tags: [Social Media]
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
 *         description: Successful social media validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 socialMedia:
 *                   type: object
 *                   properties:
 *                     profiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           platform:
 *                             type: string
 *                           url:
 *                             type: string
 *                           verified:
 *                             type: boolean
 *                           followers:
 *                             type: number
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProfiles:
 *                           type: number
 *                         verifiedProfiles:
 *                           type: number
 *                         platforms:
 *                           type: array
 *                           items:
 *                             type: string
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
 * Handles social media validation requests
 */
export async function handleSocialMediaRequest(
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

    console.log(`📱 Starting social media validation for: ${domain}`);

    // Perform social media validation
    const socialMediaValidation = await SocialMediaValidator.validateSocialMediaPresence(domain, undefined, {
      timeout: 10000,
      checkFollowers: true,
      checkActivity: true
    }).catch((error: any) => {
      console.warn(`Social media validation failed: ${error.message}`);
      return {
        profiles: [],
        summary: {
          totalProfiles: 0,
          verifiedProfiles: 0,
          platforms: []
        },
        error: `Social media validation failed: ${error.message}`
      };
    });

    console.log(`✅ Social media validation completed for ${domain}`);

    // Return social media validation results
    return createSuccessResponse(
      { socialMedia: socialMediaValidation },
      event,
      context
    );

  } catch (error: any) {
    console.error('Social media validation error:', error);
    return createErrorResponse(
      'Internal server error during social media validation',
      event,
      context,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
} 