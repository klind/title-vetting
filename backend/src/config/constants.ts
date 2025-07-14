/**
 * API routes configuration
 */
export const ROUTES = {
  HEALTH: '/health',
  WHOIS: '/whois',
  WEBSITE: '/website',
  SOCIAL_MEDIA: '/social-media',
  COMBINED: '/combined',
  STATUS: '/status',
} as const;

/**
 * Allowed HTTP methods for the API
 */
export const ALLOWED_METHODS = ['GET', 'POST', 'OPTIONS'] as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
export const DEFAULT_RATE_LIMIT = 10; // requests per minute

/**
 * WHOIS lookup timeout configuration
 */
export const DEFAULT_TIMEOUT = 30000; // 30 seconds

/**
 * Cache configuration
 */
export const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * HTTP status codes
 */
export const StatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const; 