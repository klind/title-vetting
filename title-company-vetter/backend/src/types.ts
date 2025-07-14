import { z } from 'zod';
import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * WHOIS API response schema for validation
 * Note: Properties may vary by registrar, so most fields are optional
 */
export const WhoisResultSchema = z.object({
  // Basic domain info
  domainName: z.string().optional(),
  registryDomainId: z.string().optional(),
  
  // Registrant information
  registrantName: z.string().optional(),
  registrantOrganization: z.string().optional(),
  registrantEmail: z.string().optional(),
  registrantCountry: z.string().optional(),
  registrantPhone: z.string().optional(),
  registrantPhoneExt: z.string().optional(),
  registrantFax: z.string().optional(),
  registrantFaxExt: z.string().optional(),
  registrantStreet: z.string().optional(),
  registrantCity: z.string().optional(),
  registrantState: z.string().optional(),
  registrantPostalCode: z.string().optional(),
  
  // Administrative contact
  adminName: z.string().optional(),
  adminOrganization: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPhone: z.string().optional(),
  adminPhoneExt: z.string().optional(),
  adminFax: z.string().optional(),
  adminFaxExt: z.string().optional(),
  adminStreet: z.string().optional(),
  adminCity: z.string().optional(),
  adminState: z.string().optional(),
  adminPostalCode: z.string().optional(),
  adminCountry: z.string().optional(),
  
  // Technical contact
  techName: z.string().optional(),
  techOrganization: z.string().optional(),
  techEmail: z.string().optional(),
  techPhone: z.string().optional(),
  techPhoneExt: z.string().optional(),
  techFax: z.string().optional(),
  techFaxExt: z.string().optional(),
  techStreet: z.string().optional(),
  techCity: z.string().optional(),
  techState: z.string().optional(),
  techPostalCode: z.string().optional(),
  techCountry: z.string().optional(),
  
  // Registration details
  creationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  updatedDate: z.string().optional(),
  registrar: z.string().optional(),
  registrarWhoisServer: z.string().optional(),
  registrarUrl: z.string().optional(),
  registrarIanaId: z.string().optional(),
  registrarAbuseContactEmail: z.string().optional(),
  registrarAbuseContactPhone: z.string().optional(),
  
  // Technical details
  nameServers: z.string().optional(),
  status: z.string().optional(),
  dnssec: z.string().optional(),
  
  // Additional fields that might be present
  registryRegistrantId: z.string().optional(),
  registryAdminId: z.string().optional(),
  registryTechId: z.string().optional(),
  
  // Raw WHOIS data for reference
  rawWhoisData: z.any().optional(),
});

export type WhoisResult = z.infer<typeof WhoisResultSchema>;

/**
 * Lambda event schema for request validation
 */
export const LambdaEventSchema = z.object({
  body: z.string().nullable(),
  headers: z.record(z.string()),
  httpMethod: z.string(),
  path: z.string(),
  queryStringParameters: z.record(z.string()).nullable(),
  requestContext: z.object({
    requestId: z.string(),
    accountId: z.string(),
  }).passthrough(),
});

export type LambdaEvent = z.infer<typeof LambdaEventSchema>;

/**
 * Request payload schema for WHOIS lookup
 */
export const WhoisRequestSchema = z.object({
  url: z.string().min(1, 'URL is required').refine(
    (value) => {
      // Accept both URLs and domain names
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      return urlRegex.test(value) || domainRegex.test(value);
    },
    'Must be a valid URL or domain name'
  ),
});

export type WhoisRequest = z.infer<typeof WhoisRequestSchema>;

/**
 * URL validation result interface
 */
export interface UrlValidationResult {
  isValid: boolean;
  domain?: string;
  error?: string;
}

/**
 * Website validation result interface
 */
export interface WebsiteValidationResult {
  hasWebsite: boolean;
  isAccessible: boolean;
  hasDns?: boolean;
  statusCode?: number;
  contentType?: string;
  title?: string;
  responseTime?: number;
  redirectUrl?: string;
  contacts?: {
    emails: string[];
    phones: string[];
    addresses: string[];
  };
  ssl?: {
    hasSSL: boolean;
    isValid: boolean;
    isSelfSigned: boolean;
    error?: string;
  };
  socialMedia?: {
    profiles: any[];
    totalProfiles: number;
    verifiedProfiles: number;
    hasConsistentPresence: boolean;
    credibilityScore: number;
    recommendations: string[];
  };
  error?: string;
}

/**
 * Processed WHOIS report interface
 */
export interface WhoisReport {
  domain: string;
  
  // Basic domain info
  registryDomainId?: string;
  
  // Registrant information
  registrant: {
    name?: string;
    organization?: string;
    email?: string;
    country?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  
  // Administrative contact
  admin: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Technical contact
  tech: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Registration details
  registration: {
    createdDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    registrar?: string;
    registrarWhoisServer?: string;
    registrarUrl?: string;
    registrarIanaId?: string;
    registrarAbuseContactEmail?: string;
    registrarAbuseContactPhone?: string;
  };
  
  // Technical details
  technical: {
    nameServers?: string[];
    status?: string;
    dnssec?: string;
  };
  
  // Additional validation results
  website?: WebsiteValidationResult;
  riskFactors: string[];
  
  // Raw WHOIS data for reference
  rawWhoisData?: any;
  
  // Metadata
  metadata: {
    lookupTime: number;
    source: string;
    timestamp: string;
  };
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Rate limiting state interface
 */
export interface RateLimitState {
  requests: number;
  windowStart: number;
  isLimited: boolean;
}

/**
 * Error types for better error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WHOIS_LOOKUP_ERROR = 'WHOIS_LOOKUP_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Custom error interface
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
  statusCode: number;
}

/**
 * CORS headers configuration
 */
export interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Max-Age': string;
  [header: string]: string;
}

/**
 * Response helper functions
 */

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string,
): APIGatewayProxyResult {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  return {
    statusCode: 200,
    headers: getCorsHeaders(),
    body: JSON.stringify(response),
  };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  message: string,
  statusCode: number = 400,
  details?: any,
  requestId?: string,
): APIGatewayProxyResult {
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Add details if provided (but don't expose sensitive info in production)
  if (details && process.env.NODE_ENV !== 'production') {
    response.data = { details };
  }

  return {
    statusCode,
    headers: getCorsHeaders(),
    body: JSON.stringify(response),
  };
}

/**
 * Gets CORS headers based on environment
 */
export function getCorsHeaders(): CorsHeaders {
  const origin = process.env.CORS_ORIGIN || '*';
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: any): error is ApiError {
  return error && typeof error === 'object' && 'type' in error && 'statusCode' in error;
}

/**
 * Converts unknown error to ApiError
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      type: ErrorType.INTERNAL_ERROR,
      message: error.message,
      statusCode: 500,
    };
  }

  return {
    type: ErrorType.INTERNAL_ERROR,
    message: 'An unknown error occurred',
    statusCode: 500,
  };
}

/**
 * Risk assessment utilities
 */
export function assessRiskFactors(whoisData: WhoisResult): string[] {
  const risks: string[] = [];

  // Check for recent registration
  if (whoisData.creationDate) {
    const created = new Date(whoisData.creationDate);
    const now = new Date();
    const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 30) {
      risks.push('Domain registered very recently (less than 30 days)');
    } else if (daysSinceCreation < 90) {
      risks.push('Domain registered recently (less than 90 days)');
    }
  }

  // Check for expiration
  if (whoisData.expirationDate) {
    const expiration = new Date(whoisData.expirationDate);
    const now = new Date();
    const daysUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiration < 30) {
      risks.push('Domain expires soon (less than 30 days)');
    }
  }

  // Check for privacy protection
  if (whoisData.registrantName?.toLowerCase().includes('privacy') ||
      whoisData.registrantOrganization?.toLowerCase().includes('privacy')) {
    risks.push('Domain uses privacy protection service');
  }

  // Check for missing contact information
  if (!whoisData.registrantEmail && !whoisData.adminEmail) {
    risks.push('No public contact information available');
  }

  // Check for suspicious patterns
  if (whoisData.registrantCountry && 
      !['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE'].includes(whoisData.registrantCountry)) {
    risks.push('Domain registered in high-risk jurisdiction');
  }

  return risks;
}

/**
 * Environment variable validation schema
 */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  API_RATE_LIMIT: z.string().default('10').transform(Number),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WHOIS_TIMEOUT: z.string().default('30000').transform(Number),
  MAX_CONCURRENT_REQUESTS: z.string().default('5').transform(Number),
});

export type EnvConfig = z.infer<typeof EnvSchema>;