import { 
  WhoisResult, 
  WhoisReport, 
  WhoisResultSchema, 
  ErrorType, 
  ApiError,
  RateLimitState,
  assessRiskFactors 
} from './types.js';
import { validateUrl, extractDomain } from './url-validator.js';
import { validateWebsiteComprehensive } from './website-validator.js';
import { customWhoisLookup } from './custom-whois.js';

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const DEFAULT_RATE_LIMIT = 10; // requests per minute

/**
 * WHOIS lookup timeout configuration
 */
const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * In-memory rate limiting store (in production, use Redis or DynamoDB)
 */
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Cache for WHOIS results (simple in-memory cache)
 */
const whoisCache = new Map<string, { data: WhoisReport; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Performs a WHOIS lookup for a given URL
 * 
 * @param url - The URL to perform WHOIS lookup for
 * @param clientIp - Client IP for rate limiting (optional)
 * @returns Promise resolving to WHOIS report
 */
export async function performWhoisLookup(
  url: string, 
  clientIp?: string
): Promise<WhoisReport> {
  const startTime = Date.now();

  try {
    // Validate URL first
    const urlValidation = validateUrl(url);
    if (!urlValidation.isValid) {
      throw createApiError(
        ErrorType.VALIDATION_ERROR,
        `Invalid URL: ${urlValidation.error}`,
        400
      );
    }

    const domain = urlValidation.domain!;

    // Check rate limits
    if (clientIp) {
      await checkRateLimit(clientIp);
    }

    // Cache disabled - always perform fresh lookup
    // const cached = getCachedResult(domain);
    // if (cached) {
    //   console.log(`Cache hit for domain: ${domain}`);
    //   return cached;
    // }

    // Perform WHOIS lookup
    console.log(`Performing WHOIS lookup for domain: ${domain}`);
    const rawWhoisData = await performRawWhoisLookup(domain);

    // Validate and transform the data
    const validatedData = validateWhoisData(rawWhoisData);
    const transformedReport = await transformWhoisData(domain, validatedData, startTime);

    // Cache disabled - don't store results
    // setCachedResult(domain, transformedReport);

    console.log(`WHOIS lookup completed for ${domain} in ${Date.now() - startTime}ms`);
    return transformedReport;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`WHOIS lookup failed for ${url} after ${duration}ms:`, error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    if (error instanceof Error && error.name === 'ApiError') {
      throw error;
    }
    
    throw createApiError(
      ErrorType.WHOIS_LOOKUP_ERROR,
      `WHOIS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      { url, duration }
    );
  }
}

/**
 * Performs raw WHOIS lookup with timeout handling
 * 
 * @param domain - The domain to lookup
 * @returns Promise resolving to raw WHOIS data
 */
async function performRawWhoisLookup(domain: string): Promise<any> {
  const timeout = parseInt(process.env.WHOIS_TIMEOUT || DEFAULT_TIMEOUT.toString());

  try {
    console.log(`🔍 Performing custom WHOIS lookup for domain: ${domain}`);
    
    // Use our custom WHOIS service
    const result = await customWhoisLookup(domain, {
      timeout,
      follow: 3,
      verbose: true,
      parseResponse: true
    });

    console.log(`✅ Custom WHOIS lookup completed for ${domain}`);
    console.log('WHOIS raw data:', result);
    return result;

  } catch (error) {
    console.error(`❌ Custom WHOIS lookup failed for ${domain}:`, error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    // Handle specific WHOIS errors
    if (error instanceof Error) {
      if (error.message.includes('No whois server')) {
        throw createApiError(
          ErrorType.WHOIS_LOOKUP_ERROR,
          'No WHOIS server available for this domain',
          404
        );
      }
      
      if (error.message.includes('timeout')) {
        throw createApiError(
          ErrorType.TIMEOUT_ERROR,
          'WHOIS lookup timed out',
          504
        );
      }
      
      if (error.message.includes('connect')) {
        throw createApiError(
          ErrorType.NETWORK_ERROR,
          'Network error during WHOIS lookup',
          503
        );
      }
    }
    
    throw error;
  }
}

/**
 * Validates raw WHOIS data using Zod schema
 * 
 * @param rawData - Raw WHOIS data
 * @returns Validated WHOIS data
 */
function validateWhoisData(rawData: any): WhoisResult {
  try {
    // Parse with Zod schema (allows partial data)
    const result = WhoisResultSchema.parse(rawData);
    return result;
  } catch (error) {
    console.warn('WHOIS data validation failed, using raw data:', error);
    
    // If validation fails, return a minimal valid structure with raw data
    // Map the parsed WHOIS fields to the expected structure
    return {
      domainName: rawData?.domainName || rawData?.domain || undefined,
      registrantName: rawData?.registrantName || undefined,
      registrantOrganization: rawData?.registrantOrganization || undefined,
      registrantEmail: rawData?.registrantEmail || undefined,
      registrantCountry: rawData?.registrantCountry || undefined,
      registrantPhone: rawData?.registrantPhone || undefined,
      registrantPhoneExt: rawData?.registrantPhoneExt || undefined,
      registrantFax: rawData?.registrantFax || undefined,
      registrantFaxExt: rawData?.registrantFaxExt || undefined,
      registrantStreet: rawData?.registrantStreet || undefined,
      registrantCity: rawData?.registrantCity || undefined,
      registrantState: rawData?.registrantState || rawData?.registrantstateprovince || undefined,
      registrantPostalCode: rawData?.registrantpostalcode || undefined,
      
      // Admin contact
      adminName: rawData?.adminName || undefined,
      adminOrganization: rawData?.adminOrganization || undefined,
      adminEmail: rawData?.adminEmail || undefined,
      adminPhone: rawData?.adminPhone || undefined,
      adminPhoneExt: rawData?.adminPhoneExt || undefined,
      adminFax: rawData?.adminFax || undefined,
      adminFaxExt: rawData?.adminFaxExt || undefined,
      adminStreet: rawData?.adminStreet || undefined,
      adminCity: rawData?.adminCity || undefined,
      adminState: rawData?.adminState || undefined,
      adminPostalCode: rawData?.adminPostalCode || undefined,
      adminCountry: rawData?.adminCountry || undefined,
      
      // Tech contact
      techName: rawData?.techName || rawData?.techname || undefined,
      techOrganization: rawData?.techOrganization || rawData?.techorganization || undefined,
      techEmail: rawData?.techEmail || rawData?.techemail || undefined,
      techPhone: rawData?.techPhone || rawData?.techphone || undefined,
      techPhoneExt: rawData?.techPhoneExt || undefined,
      techFax: rawData?.techFax || undefined,
      techFaxExt: rawData?.techFaxExt || undefined,
      techStreet: rawData?.techStreet || rawData?.techstreet || undefined,
      techCity: rawData?.techCity || rawData?.techcity || undefined,
      techState: rawData?.techState || rawData?.techstateprovince || undefined,
      techPostalCode: rawData?.techPostalCode || rawData?.techpostalcode || undefined,
      techCountry: rawData?.techCountry || rawData?.techcountry || undefined,
      
      // Registration details
      creationDate: rawData?.creationDate || undefined,
      expirationDate: rawData?.expirationDate || rawData?.registrarregistrationexpirationdate || undefined,
      updatedDate: rawData?.updatedDate || undefined,
      registrar: rawData?.registrar || undefined,
      registrarWhoisServer: rawData?.registrarWhoisServer || undefined,
      registrarUrl: rawData?.registrarUrl || rawData?.registrarurl || undefined,
      registrarIanaId: rawData?.registrarIanaId || rawData?.registrarianaid || undefined,
      registrarAbuseContactEmail: rawData?.registrarAbuseContactEmail || rawData?.registrarabusecontactemail || undefined,
      registrarAbuseContactPhone: rawData?.registrarAbuseContactPhone || rawData?.registrarabusecontactphone || undefined,
      
      // Technical details
      nameServers: rawData?.nameServers || rawData?.nameserver || undefined,
      status: rawData?.status || rawData?.domainstatus || undefined,
      dnssec: rawData?.dnssec || undefined,
      
      rawWhoisData: rawData, // Include raw data for reference
    };
  }
}

/**
 * Transforms validated WHOIS data into our structured report format
 * 
 * @param domain - The domain that was looked up
 * @param whoisData - Validated WHOIS data
 * @param startTime - Lookup start timestamp
 * @returns Structured WHOIS report
 */
async function transformWhoisData(
  domain: string, 
  whoisData: WhoisResult, 
  startTime: number
): Promise<WhoisReport> {
  // Temporarily disable website validation to isolate the issue
  let websiteValidation = {
    hasWebsite: false,
    isAccessible: false,
    hasDns: false,
    error: 'Website validation temporarily disabled'
  };

  // Assess risk factors
  const riskFactors = assessRiskFactors(whoisData);

  const report: WhoisReport = {
    domain,
    
    // Return the raw WHOIS data as the main data structure
    registrant: {
      name: whoisData.registrantName,
      organization: whoisData.registrantOrganization,
      email: whoisData.registrantEmail,
      country: whoisData.registrantCountry,
      phone: whoisData.registrantPhone,
      phoneExt: whoisData.registrantPhoneExt,
      fax: whoisData.registrantFax,
      faxExt: whoisData.registrantFaxExt,
      street: whoisData.registrantStreet || whoisData.registrantstreet,
      city: whoisData.registrantCity || whoisData.registrantcity,
      state: whoisData.registrantState || whoisData.registrantstateprovince,
      postalCode: whoisData.registrantPostalCode || whoisData.registrantpostalcode,
    },
    
    admin: {
      name: whoisData.adminName,
      organization: whoisData.adminOrganization,
      email: whoisData.adminEmail,
      phone: whoisData.adminPhone,
      phoneExt: whoisData.adminPhoneExt,
      fax: whoisData.adminFax,
      faxExt: whoisData.adminFaxExt,
      street: whoisData.adminStreet,
      city: whoisData.adminCity,
      state: whoisData.adminState,
      postalCode: whoisData.adminPostalCode,
      country: whoisData.adminCountry,
    },
    
    tech: {
      name: whoisData.techName || whoisData.techname,
      organization: whoisData.techOrganization || whoisData.techorganization,
      email: whoisData.techEmail || whoisData.techemail,
      phone: whoisData.techPhone || whoisData.techphone,
      phoneExt: whoisData.techPhoneExt,
      fax: whoisData.techFax,
      faxExt: whoisData.techFaxExt,
      street: whoisData.techStreet || whoisData.techstreet,
      city: whoisData.techCity || whoisData.techcity,
      state: whoisData.techState || whoisData.techstateprovince,
      postalCode: whoisData.techPostalCode || whoisData.techpostalcode,
      country: whoisData.techCountry || whoisData.techcountry,
    },
    
    registration: {
      createdDate: whoisData.creationDate,
      expirationDate: whoisData.expirationDate || whoisData.registrarregistrationexpirationdate,
      updatedDate: whoisData.updatedDate,
      registrar: whoisData.registrar,
      registrarWhoisServer: whoisData.registrarWhoisServer,
      registrarUrl: whoisData.registrarUrl || whoisData.registrarurl,
      registrarIanaId: whoisData.registrarIanaId || whoisData.registrarianaid,
      registrarAbuseContactEmail: whoisData.registrarAbuseContactEmail || whoisData.registrarabusecontactemail,
      registrarAbuseContactPhone: whoisData.registrarAbuseContactPhone || whoisData.registrarabusecontactphone,
    },
    
    technical: {
      nameServers: whoisData.nameServers 
        ? whoisData.nameServers.split(/[\s,]+/).filter(ns => ns.length > 0)
        : whoisData.nameserver
          ? [whoisData.nameserver].flat().filter(ns => ns.length > 0)
          : undefined,
      status: whoisData.status || whoisData.domainstatus,
      dnssec: whoisData.dnssec,
    },
    
    website: websiteValidation,
    riskFactors,
    
    // Include the complete raw WHOIS data
    rawWhoisData: whoisData,
    
    metadata: {
      lookupTime: Date.now() - startTime,
      source: 'custom-whois',
      timestamp: new Date().toISOString(),
    },
  };

  return report;
}

/**
 * Checks rate limiting for a client IP
 * 
 * @param clientIp - Client IP address
 * @throws ApiError if rate limit exceeded
 */
async function checkRateLimit(clientIp: string): Promise<void> {
  const now = Date.now();
  const rateLimit = parseInt(process.env.API_RATE_LIMIT || DEFAULT_RATE_LIMIT.toString());
  
  let rateLimitState = rateLimitStore.get(clientIp);
  
  if (!rateLimitState) {
    rateLimitState = {
      requests: 0,
      windowStart: now,
      isLimited: false,
    };
  }
  
  // Reset window if expired
  if (now - rateLimitState.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitState = {
      requests: 0,
      windowStart: now,
      isLimited: false,
    };
  }
  
  // Check if limit exceeded
  if (rateLimitState.requests >= rateLimit) {
    rateLimitState.isLimited = true;
    rateLimitStore.set(clientIp, rateLimitState);
    
    throw createApiError(
      ErrorType.RATE_LIMIT_ERROR,
      `Rate limit exceeded. Maximum ${rateLimit} requests per minute.`,
      429,
      { 
        resetTime: rateLimitState.windowStart + RATE_LIMIT_WINDOW,
        requestsRemaining: 0,
      }
    );
  }
  
  // Increment request count
  rateLimitState.requests++;
  rateLimitState.isLimited = false;
  rateLimitStore.set(clientIp, rateLimitState);
  
  console.log(`Rate limit check passed for ${clientIp}: ${rateLimitState.requests}/${rateLimit}`);
}

/**
 * Gets cached WHOIS result if available and not expired
 * 
 * @param domain - Domain to check cache for
 * @returns Cached result or null
 */
function getCachedResult(domain: string): WhoisReport | null {
  const cached = whoisCache.get(domain.toLowerCase());
  
  if (!cached) {
    return null;
  }
  
  // Check if cache entry is expired
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    whoisCache.delete(domain.toLowerCase());
    return null;
  }
  
  return cached.data;
}

/**
 * Caches a WHOIS result
 * 
 * @param domain - Domain to cache result for
 * @param result - WHOIS result to cache
 */
function setCachedResult(domain: string, result: WhoisReport): void {
  whoisCache.set(domain.toLowerCase(), {
    data: result,
    timestamp: Date.now(),
  });
  
  // Simple cache cleanup - remove old entries if cache gets too large
  if (whoisCache.size > 1000) {
    const entries = Array.from(whoisCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      whoisCache.delete(entries[i][0]);
    }
  }
}

/**
 * Creates a standardized API error
 * 
 * @param type - Error type
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @param details - Additional error details
 * @returns ApiError
 */
function createApiError(
  type: ErrorType,
  message: string,
  statusCode: number,
  details?: any
): ApiError {
  const error = new Error(message) as any;
  error.name = 'ApiError';
  error.type = type;
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

/**
 * Clears the WHOIS cache (useful for testing)
 */
export function clearWhoisCache(): void {
  whoisCache.clear();
}

/**
 * Clears rate limit data (useful for testing)
 */
export function clearRateLimitData(): void {
  rateLimitStore.clear();
}

/**
 * Gets current cache statistics
 * 
 * @returns Cache statistics
 */
export function getCacheStats(): { size: number; hitRate?: number } {
  return {
    size: whoisCache.size,
    // In a production system, you'd track hit rate properly
  };
}

/**
 * Gets rate limit status for a client IP
 * 
 * @param clientIp - Client IP address
 * @returns Rate limit status
 */
export function getRateLimitStatus(clientIp: string): {
  requests: number;
  limit: number;
  resetTime: number;
  isLimited: boolean;
} {
  const rateLimit = parseInt(process.env.API_RATE_LIMIT || DEFAULT_RATE_LIMIT.toString());
  const rateLimitState = rateLimitStore.get(clientIp);
  
  if (!rateLimitState) {
    return {
      requests: 0,
      limit: rateLimit,
      resetTime: Date.now() + RATE_LIMIT_WINDOW,
      isLimited: false,
    };
  }
  
  return {
    requests: rateLimitState.requests,
    limit: rateLimit,
    resetTime: rateLimitState.windowStart + RATE_LIMIT_WINDOW,
    isLimited: rateLimitState.isLimited,
  };
}