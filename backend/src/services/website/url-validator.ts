import { UrlValidationResult } from '../../types/validation.js';
import { ErrorType } from '../../types/common.js';

/**
 * URL validation patterns and configurations
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

/**
 * Suspicious patterns that may indicate malicious domains
 */
const SUSPICIOUS_PATTERNS = [
  /[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}\.[\d]{1,3}/, // IP addresses
  /[0o][0o][0o]/, // Homograph attacks (o vs 0)
  /[il1][il1][il1]/, // Homograph attacks (i, l, 1)
  /xn--/, // Punycode domains
  /[а-я]/, // Cyrillic characters
  /[αβγδεζηθικλμνξοπρστυφχψω]/, // Greek characters
  /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|short\.link)$/, // URL shorteners
  /[.-]{2,}/, // Multiple consecutive dots or dashes
  /^www\d+\./, // Numbered subdomains
];

/**
 * Known malicious TLDs or patterns
 */
const SUSPICIOUS_TLDS = [
  // Free and often-abused country-code TLDs
  '.tk', '.ml', '.ga', '.cf', '.gq',

  // Cheap or commonly abused generic TLDs
  '.click', '.download', '.loan', '.xyz', '.top', '.zip', '.review',
  '.country', '.men', '.work', '.party', '.stream', '.cam', '.host',
  '.support', '.biz', '.cc'
];

/**
 * Validates URL or domain format and extracts domain information
 * 
 * @param input - The URL or domain to validate
 * @returns Validation result with domain info or error
 */
export function validateUrl(input: string): UrlValidationResult {
  try {
    // Basic input validation
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: 'URL or domain is required and must be a string',
      };
    }

    // Trim whitespace
    const trimmedInput = input.trim();

    if (trimmedInput.length === 0) {
      return {
        isValid: false,
        error: 'URL or domain cannot be empty',
      };
    }

    let domain: string | null = null;
    let isUrl = false;

    // Check if it's a URL (starts with http:// or https://)
    if (URL_REGEX.test(trimmedInput)) {
      isUrl = true;
      domain = extractDomain(trimmedInput);
    } else if (DOMAIN_REGEX.test(trimmedInput)) {
      // It's a domain name
      domain = trimmedInput.toLowerCase();
    } else {
      return {
        isValid: false,
        error: 'Invalid format. Please provide a valid URL (e.g., https://example.com) or domain name (e.g., example.com)',
      };
    }

    if (!domain) {
      return {
        isValid: false,
        error: 'Could not extract domain from input',
      };
    }

    // Validate domain format
    if (!DOMAIN_REGEX.test(domain)) {
      return {
        isValid: false,
        error: 'Invalid domain format',
      };
    }

    // Check for suspicious patterns
    const suspiciousCheck = checkSuspiciousPatterns(domain);
    if (!suspiciousCheck.isValid) {
      return suspiciousCheck;
    }

    // Additional security checks
    const securityCheck = performSecurityChecks(domain);
    if (!securityCheck.isValid) {
      return securityCheck;
    }

    return {
      isValid: true,
      domain: domain.toLowerCase(),
    };

  } catch (error) {
    return {
      isValid: false,
      error: `URL/domain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extracts domain from URL
 * 
 * @param url - The URL to extract domain from
 * @returns The domain or null if extraction fails
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Fallback regex extraction if URL constructor fails
    const match = url.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
    return match ? match[1] : null;
  }
}

/**
 * Checks for suspicious domain patterns
 * 
 * @param domain - The domain to check
 * @returns Validation result
 */
export function checkSuspiciousPatterns(domain: string): UrlValidationResult {
  const lowerDomain = domain.toLowerCase();

  // Check against suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(lowerDomain)) {
      return {
        isValid: false,
        error: `Domain contains suspicious pattern: ${pattern.source}`,
      };
    }
  }

  // Check suspicious TLDs
  for (const tld of SUSPICIOUS_TLDS) {
    if (lowerDomain.endsWith(tld)) {
      return {
        isValid: false,
        error: `Domain uses suspicious TLD: ${tld}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Performs additional security checks on the domain
 * 
 * @param domain - The domain to check
 * @returns Validation result
 */
export function performSecurityChecks(domain: string): UrlValidationResult {
  const lowerDomain = domain.toLowerCase();

  // Check domain length
  if (lowerDomain.length > 253) {
    return {
      isValid: false,
      error: 'Domain name too long (maximum 253 characters)',
    };
  }

  // Check for too many subdomains (potential subdomain abuse)
  const parts = lowerDomain.split('.');
  if (parts.length > 6) {
    return {
      isValid: false,
      error: 'Domain has too many subdomains (potential abuse)',
    };
  }

  // Check for very long subdomains
  for (const part of parts) {
    if (part.length > 63) {
      return {
        isValid: false,
        error: 'Domain part too long (maximum 63 characters per part)',
      };
    }
  }

  // Check for localhost or private network ranges
  if (lowerDomain === 'localhost' || 
      lowerDomain.startsWith('127.') ||
      lowerDomain.startsWith('192.168.') ||
      lowerDomain.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(lowerDomain)) {
    return {
      isValid: false,
      error: 'Local or private network domains are not allowed',
    };
  }

  // Check for common typosquatting patterns
  const typosquattingCheck = checkTyposquatting(lowerDomain);
  if (!typosquattingCheck.isValid) {
    return typosquattingCheck;
  }

  return { isValid: true };
}

/**
 * Checks for potential typosquatting patterns
 * 
 * @param domain - The domain to check
 * @returns Validation result
 */
export function checkTyposquatting(domain: string): UrlValidationResult {
  // Known legitimate title company domains (could be expanded)
  const legitimateDomains = [
    'titlecompany.com',
    'firsttitle.com',
    'escrow.com',
    'settlement.com',
    // Add more known legitimate domains
  ];

  // Check for very similar domains to legitimate ones
  for (const legitDomain of legitimateDomains) {
    const similarity = calculateLevenshteinDistance(domain, legitDomain);
    const maxDistance = Math.max(2, Math.floor(legitDomain.length * 0.2));
    
    if (similarity <= maxDistance && similarity > 0) {
      return {
        isValid: false,
        error: `Domain may be typosquatting legitimate domain: ${legitDomain}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Calculates Levenshtein distance between two strings
 * 
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Distance between strings
 */
function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Validates multiple URLs in batch
 * 
 * @param urls - Array of URLs to validate
 * @returns Array of validation results
 */
export function validateUrls(urls: string[]): UrlValidationResult[] {
  return urls.map(url => validateUrl(url));
}

/**
 * Checks if a domain is in a whitelist of known good domains
 * 
 * @param domain - The domain to check
 * @param whitelist - Array of whitelisted domains
 * @returns True if domain is whitelisted
 */
export function isDomainWhitelisted(domain: string, whitelist: string[]): boolean {
  const lowerDomain = domain.toLowerCase();
  return whitelist.some(whitelistedDomain => 
    lowerDomain === whitelistedDomain.toLowerCase() ||
    lowerDomain.endsWith(`.${whitelistedDomain.toLowerCase()}`)
  );
}

/**
 * Normalizes a URL for consistent processing
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url.trim());
    
    // Remove www prefix for consistency
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    // Remove trailing slash
    if (urlObj.pathname === '/') {
      urlObj.pathname = '';
    }
    
    // Sort query parameters for consistency
    urlObj.searchParams.sort();
    
    return urlObj.toString().toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}