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
 * /whois:
 *   post:
 *     summary: Perform WHOIS lookup for a domain
 *     description: Performs a comprehensive WHOIS lookup including IANA, registry, and registrar data
 *     tags: [WHOIS]
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
 *         description: Successful WHOIS lookup
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WhoisResponse'
 *             examples:
 *               success_response:
 *                 summary: Successful WHOIS lookup
 *                 value:
 *                   success: true
 *                   data:
 *                     domain: "example.com"
 *                     tld: "com"
 *                     ianaServer: "whois.iana.org"
 *                     registryServer: "whois.verisign-grs.com"
 *                     registrarServer: "whois.godaddy.com"
 *                     registrant:
 *                       name: "John Doe"
 *                       organization: "Example Corporation"
 *                       email: "john@example.com"
 *                       country: "US"
 *                       phone: "+1.5551234567"
 *                       street: "123 Main Street"
 *                       city: "Anytown"
 *                       state: "CA"
 *                       postalCode: "90210"
 *                     admin:
 *                       name: "Admin Contact"
 *                       email: "admin@example.com"
 *                       phone: "+1.5551234567"
 *                     tech:
 *                       name: "Tech Contact"
 *                       email: "tech@example.com"
 *                       phone: "+1.5551234567"
 *                     registration:
 *                       createdDate: "2020-01-15T00:00:00Z"
 *                       expirationDate: "2025-01-15T00:00:00Z"
 *                       updatedDate: "2023-06-10T00:00:00Z"
 *                       registrar: "GoDaddy.com, LLC"
 *                       registrarUrl: "https://www.godaddy.com"
 *                       registrarIanaId: "146"
 *                     technical:
 *                       nameServers: ["ns1.example.com", "ns2.example.com"]
 *                       status: "clientTransferProhibited"
 *                       dnssec: "unsigned"
 *                     website:
 *                       hasWebsite: true
 *                       isAccessible: true
 *                       hasDns: true
 *                     riskFactors: []
 *                     parsedData:
 *                       domainName: "example.com"
 *                       registrantName: "John Doe"
 *                       registrantEmail: "john@example.com"
 *                       creationDate: "2020-01-15T00:00:00Z"
 *                       expirationDate: "2025-01-15T00:00:00Z"
 *                       registrar: "GoDaddy.com, LLC"
 *                       nameServers: "ns1.example.com ns2.example.com"
 *                       status: "clientTransferProhibited"
 *                     rawData:
 *                       iana:
 *                         domain: "COM"
 *                         organisation: "VeriSign Global Registry Services"
 *                         whois: "whois.verisign-grs.com"
 *                       registry:
 *                         domainName: "EXAMPLE.COM"
 *                         registrar: "GoDaddy.com, LLC"
 *                         registrarWhoisServer: "whois.godaddy.com"
 *                         creationDate: "2020-01-15T00:00:00Z"
 *                       registrar:
 *                         domainName: "example.com"
 *                         registrantName: "John Doe"
 *                         registrantEmail: "john@example.com"
 *                         registrar: "GoDaddy.com, LLC"
 *                     metadata:
 *                       lookupTime: 1234
 *                       serversQueried: ["whois.iana.org", "whois.verisign-grs.com", "whois.godaddy.com"]
 *                       totalFields: 156
 *                       source: "custom-whois-enhanced"
 *                       timestamp: "2023-12-01T10:30:00Z"
 *                       errors: []
 *                       warnings: []
 *       400:
 *         description: Bad request - invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       504:
 *         description: WHOIS lookup timeout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
export async function handleWhoisRequest(
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