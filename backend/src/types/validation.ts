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
    hasConsistentPresence: boolean;
    credibilityScore: number;
    recommendations: string[];
    botDetectionMessages?: string[];
  };
  error?: string;
} 