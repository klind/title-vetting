import whois from 'whois-json';
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

    // Check cache first
    const cached = getCachedResult(domain);
    if (cached) {
      console.log(`Cache hit for domain: ${domain}`);
      return cached;
    }

    // Perform WHOIS lookup
    console.log(`Performing WHOIS lookup for domain: ${domain}`);
    const rawWhoisData = await performRawWhoisLookup(domain);

    // Validate and transform the data
    const validatedData = validateWhoisData(rawWhoisData);
    const transformedReport = transformWhoisData(domain, validatedData, startTime);

    // Cache the result
    setCachedResult(domain, transformedReport);

    console.log(`WHOIS lookup completed for ${domain} in ${Date.now() - startTime}ms`);
    return transformedReport;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`WHOIS lookup failed for ${url} after ${duration}ms:`, error);
    
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
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(createApiError(
          ErrorType.TIMEOUT_ERROR,
          `WHOIS lookup timed out after ${timeout}ms`,
          504
        ));
      }, timeout);
    });

    // Race between WHOIS lookup and timeout
    const whoisPromise = whois(domain, {
      follow: 3,
      verbose: false,
    });

    const result = await Promise.race([whoisPromise, timeoutPromise]);
    return result;

  } catch (error) {
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
    
    // If validation fails, return a minimal valid structure
    return {
      domainName: rawData?.domainName || undefined,
      registrantName: rawData?.registrantName || undefined,
      registrantOrganization: rawData?.registrantOrganization || undefined,
      registrantEmail: rawData?.registrantEmail || undefined,
      creationDate: rawData?.creationDate || undefined,
      expirationDate: rawData?.expirationDate || undefined,
      registrar: rawData?.registrar || undefined,
      nameServers: rawData?.nameServers || undefined,
      status: rawData?.status || undefined,
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
function transformWhoisData(
  domain: string, 
  whoisData: WhoisResult, 
  startTime: number
): WhoisReport {
  // Process name servers
  const nameServers = whoisData.nameServers 
    ? whoisData.nameServers.split(/[\s,]+/).filter(ns => ns.length > 0)
    : undefined;

  // Assess risk factors
  const riskFactors = assessRiskFactors(whoisData);

  const report: WhoisReport = {
    domain,
    registrant: {
      name: whoisData.registrantName,
      organization: whoisData.registrantOrganization,
      email: whoisData.registrantEmail,
      country: whoisData.registrantCountry,
      phone: whoisData.registrantPhone,
    },
    registration: {
      createdDate: whoisData.creationDate,
      expirationDate: whoisData.expirationDate,
      registrar: whoisData.registrar,
      registrarWhoisServer: whoisData.registrarWhoisServer,
    },
    technical: {
      nameServers,
      status: whoisData.status,
      dnssec: whoisData.dnssec,
    },
    admin: {
      name: whoisData.adminName,
      email: whoisData.adminEmail,
    },
    tech: {
      name: whoisData.techName,
      email: whoisData.techEmail,
    },
    riskFactors,
    metadata: {
      lookupTime: Date.now() - startTime,
      source: 'whois-json',
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