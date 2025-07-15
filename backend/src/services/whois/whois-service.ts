import { 
  WhoisReport
} from '../../types/whois.js';
import { 
  ErrorType, 
  ApiError,
  RateLimitState
} from '../../types/common.js';
import { validateUrl, extractDomain } from '../website/url-validator.js';
import { validateWebsiteComprehensive } from '../website/website-validator.js';
import { customWhoisLookup } from './custom-whois.js';
import { riskScoringService } from '../risk/risk-scoring-service.js';
import { RiskEvaluationContext } from '../../types/risk.js';
import { getRegistrarReputation } from '../external/registrar-reputation-service.js';

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

    // Transform the data directly without validation
    const transformedReport = await transformWhoisData(domain, rawWhoisData, startTime);

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
 * Merges WHOIS data from all servers with registry priority, removing only obvious duplicates
 * 
 * @param rawData - Raw WHOIS data from all servers
 * @returns Merged data object with registry priority
 */
function deduplicateFields(rawData: any): Record<string, any> {
  const result: Record<string, any> = {};
  
  // Get data from each server (if available)
  const ianaData = rawData.iana || {};
  const registryData = rawData.registry || {};
  const registrarData = rawData.registrar || {};
  
  // Start with iana data (lowest priority)
  Object.entries(ianaData).forEach(([key, value]) => {
    result[key] = value;
  });
  
  // Add registrar data (medium priority) - overwrites iana if same key
  Object.entries(registrarData).forEach(([key, value]) => {
    result[key] = value;
  });
  
  // Add registry data (highest priority) - overwrites both iana and registrar if same key
  Object.entries(registryData).forEach(([key, value]) => {
    result[key] = value;
  });
  
  // Now remove obvious duplicates (same field name but different case/format)
  const keysToRemove = new Set<string>();
  const processedNormalizedKeys = new Set<string>();
  
  Object.keys(result).forEach(key => {
    const normalizedKey = normalizeFieldName(key);
    
    if (processedNormalizedKeys.has(normalizedKey)) {
      // This is a duplicate, check if we should keep this version or the previous one
      const existingKey = Object.keys(result).find(k => 
        normalizeFieldName(k) === normalizedKey && !keysToRemove.has(k)
      );
      
      if (existingKey) {
        // Keep the version with better formatting
        const keyScore = getKeyScore(key);
        const existingKeyScore = getKeyScore(existingKey);
        
        if (keyScore > existingKeyScore) {
          // Keep this key, remove the existing one
          keysToRemove.add(existingKey);
        } else {
          // Keep the existing key, remove this one
          keysToRemove.add(key);
        }
      }
    } else {
      processedNormalizedKeys.add(normalizedKey);
    }
  });
  
  // Remove the duplicate keys
  keysToRemove.forEach(key => {
    delete result[key];
  });
  
  return result;
}

/**
 * Normalizes field names for comparison
 */
function normalizeFieldName(key: string): string {
  return key.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[:\-_]/g, ''); // Remove common separators
}

/**
 * Scores a field name for quality (higher is better)
 */
function getKeyScore(key: string): number {
  let score = 0;
  
  // Prefer keys with proper capitalization
  if (/[A-Z]/.test(key)) score += 2;
  
  // Prefer keys with spaces
  if (key.includes(' ')) score += 2;
  
  // Penalize all lowercase keys
  if (key === key.toLowerCase()) score -= 1;
  
  // Prefer shorter, cleaner keys
  if (key.length < 50) score += 1;
  
  return score;
}


/**
 * Transforms raw WHOIS data into our structured report format
 * 
 * @param domain - The domain that was looked up
 * @param rawWhoisData - Raw WHOIS data from the lookup
 * @param startTime - Lookup start timestamp
 * @returns Structured WHOIS report
 */
async function transformWhoisData(
  domain: string, 
  rawWhoisData: any, 
  startTime: number
): Promise<WhoisReport> {
  // Perform website validation with expanded data
  let websiteValidation = await validateWebsiteComprehensive(domain, {
    timeout: 10000,
    followRedirects: true,
    followContactPages: true,
    checkSocialMedia: true
  }).catch((error) => {
    console.warn(`Website validation failed: ${error.message}`);
    return {
      hasWebsite: false,
      isAccessible: false,
      hasDns: false,
      error: `Website validation failed: ${error.message}`
    };
  });

  // If rawWhoisData contains the enhanced multi-step lookup data, process it
  if (rawWhoisData.ianaResponse || rawWhoisData.registryResponse || rawWhoisData.registrarResponse) {
    // This is the enhanced data structure from customWhoisLookup
    const enhancedData = rawWhoisData;
    
    // Remove unwanted fields from rawData before deduplication
    const unwantedFields = [
      'TERMS OF USE',
      'termsofuse',
      'URL of the ICANN Whois Inaccuracy Complaint Form',
      'urloftheicannwhoisinaccuracycomplaintform',
      'NOTICE',
      'notice',
      'URL of the ICANN WHOIS Data Problem Reporting System',
      'urloftheicannwhoisdataproblemreportingsystem',
      'comment_0',
      'comment_1',
      '% for more information on IANA, visit http',
      'formoreinformationonianavisithttp',
      'formoreinformationonwhoisstatuscodespleasevisithttps',
      '% Error',
      'error',
      '>>> Last update of WHOIS database',
      'formoreinformationonwhoisstatuscodespleasevisithttps',
      'by the following terms of use',
      'bythefollowingtermsofuse',
      'to',
      '(1) allow, enable, or otherwise support the transmission of mass',
      'For more information on Whois status codes, please visit https',
      'lastupdateofwhoisdatabase',
    
    ];
    
    // Clean rawData by removing unwanted fields from each server
    const cleanedRawData = { ...enhancedData.rawData };
    Object.keys(cleanedRawData).forEach(serverKey => {
      const serverData = { ...cleanedRawData[serverKey] };
      unwantedFields.forEach(field => {
        delete serverData[field];
      });
      cleanedRawData[serverKey] = serverData;
    });
    
    // Deduplicate fields with registry priority
    const deduplicatedData = deduplicateFields(cleanedRawData);
    
    
    // Get registrar reputation for risk assessment
    const registrarName = deduplicatedData['Registrar'] || deduplicatedData['registrar'];
    const registrarReputation = registrarName ? getRegistrarReputation(registrarName) : null;
    
    // Create risk evaluation context
    const riskContext: RiskEvaluationContext = {
      whoisData: {
        creationDate: deduplicatedData['Creation Date'] || deduplicatedData['creationDate'],
        expirationDate: deduplicatedData['Expiration Date'] || deduplicatedData['expirationDate'],
        registrantEmail: deduplicatedData['Registrant Email'] || deduplicatedData['registrantEmail'],
        registrantPhone: deduplicatedData['Registrant Phone'] || deduplicatedData['registrantPhone'],
        registrantName: deduplicatedData['Registrant Name'] || deduplicatedData['registrantName'],
        adminEmail: deduplicatedData['Admin Email'] || deduplicatedData['adminEmail'],
        adminPhone: deduplicatedData['Admin Phone'] || deduplicatedData['adminPhone'],
        adminName: deduplicatedData['Admin Name'] || deduplicatedData['adminName'],
        registrantCountry: deduplicatedData['Registrant Country'] || deduplicatedData['registrantCountry'],
        registrar: registrarName,
        hasPrivacyProtection: Boolean(deduplicatedData['Registrant Organization']?.includes('Privacy') || 
                                     deduplicatedData['registrantOrganization']?.includes('Privacy'))
      },
      websiteData: {
        hasSSL: (websiteValidation as any).ssl?.hasSSL,
        sslValid: (websiteValidation as any).ssl?.isValid,
        sslSelfSigned: (websiteValidation as any).ssl?.isSelfSigned,
        sslExpired: (websiteValidation as any).ssl?.isExpired,
        isAccessible: websiteValidation.isAccessible,
        hasDNS: websiteValidation.hasDns,
        hasWebsite: websiteValidation.hasWebsite,
        suspiciousPatterns: (websiteValidation as any).security?.suspiciousPatterns || [],
        maliciousTLD: (websiteValidation as any).security?.maliciousTLD,
        typosquatting: (websiteValidation as any).security?.typosquatting,
        homographAttack: (websiteValidation as any).security?.homographAttack,
        contactInfo: {
          hasContactInfo: Boolean((websiteValidation as any).contacts?.emails?.length || 
                                 (websiteValidation as any).contacts?.phones?.length),
          validEmails: Boolean((websiteValidation as any).contacts?.emails?.length),
          hasPhoneNumber: Boolean((websiteValidation as any).contacts?.phones?.length),
          hasAddress: Boolean((websiteValidation as any).contacts?.addresses?.length)
        }
      },
      socialMediaData: {
        platforms: (websiteValidation as any).socialMedia?.platforms || [],
        credibilityScore: (websiteValidation as any).socialMedia?.credibilityScore || 0,
        hasVerifiedAccounts: Boolean((websiteValidation as any).socialMedia?.verifiedAccounts?.length),
        suspiciousAccounts: Boolean((websiteValidation as any).socialMedia?.suspiciousAccounts?.length),
        botDetected: Boolean((websiteValidation as any).socialMedia?.botDetected),
        presenceScore: (websiteValidation as any).socialMedia?.presenceScore || 0
      },
      registrarData: {
        reputationScore: registrarReputation?.score || 0,
        isKnown: Boolean(registrarReputation)
      }
    };
    
    // Perform comprehensive risk assessment
    const riskAssessment = await riskScoringService.assessRisk(riskContext);
    
    // Create result with separate sections
    const result = {
      data: {
        whois: {
          domain: enhancedData.domain,
          tld: enhancedData.tld,
          ianaServer: enhancedData.ianaServer,
          registryServer: enhancedData.registryServer,
          registrarServer: enhancedData.registrarServer,
          parsedData: deduplicatedData,
          rawData: cleanedRawData,
          metadata: {
            lookupTime: Date.now() - startTime,
            source: 'custom-whois-enhanced',
            timestamp: new Date().toISOString(),
            serversQueried: enhancedData.metadata?.serversQueried || [],
            errors: enhancedData.metadata?.errors || [],
            warnings: enhancedData.metadata?.warnings || [],
            totalFields: Object.keys(deduplicatedData).length,
          }
        },
        website: {
          // Extract all website properties except socialMedia
          ...Object.fromEntries(
            Object.entries(websiteValidation).filter(([key]) => key !== 'socialMedia')
          )
        },
        socialMedia: (websiteValidation as any).socialMedia || {}
      },
      riskAssessment: riskAssessment
    };
    
    console.log(`🔍 WHOIS service social media data:`, JSON.stringify((websiteValidation as any).socialMedia, null, 2));
    
    return result as any;
  }

  // Fallback for unexpected data structure
  throw new Error('Unexpected WHOIS data structure - expected enhanced data from customWhoisLookup');
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