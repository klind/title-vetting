import fetch from 'node-fetch';
import { ContactExtractor } from '../external/contact-extractor.js';
import { SSLValidator } from './ssl-validator.js';
import { SocialMediaValidator } from '../social-media/social-media-validator.js';

/**
 * Validates if a domain has a working website
 * 
 * @param domain - The domain to validate
 * @param options - Validation options
 * @returns Promise resolving to validation result
 */
export async function validateWebsite(
  domain: string, 
  options: {
    timeout?: number;
    followRedirects?: boolean;
    userAgent?: string;
    followContactPages?: boolean;
    checkSocialMedia?: boolean;
    organizationName?: string;
  } = {}
) {
  const {
    timeout = 10000,
    followRedirects = true,
    userAgent = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)',
    followContactPages = true,
    checkSocialMedia = true,
    organizationName
  } = options;

  const startTime = Date.now();

  try {
    // Try HTTPS first, then HTTP if HTTPS fails
    const protocols = ['https', 'http'];
    
    for (const protocol of protocols) {
      try {
        const url = `${protocol}://${domain}`;
        console.log(`🌐 Checking website: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          redirect: followRedirects ? 'follow' : 'manual',
        });

        const responseTime = Date.now() - startTime;
        const contentType = response.headers.get('content-type') || '';

        // Check if it's a successful response
        if (response.ok) {
          let title = '';
          let contacts;
          let ssl;
          let socialMedia;

          // Check SSL certificate
          try {
            ssl = await SSLValidator.validateDomainSSL(domain, timeout);
          } catch (error) {
            console.warn('SSL validation failed:', error);
          }

          // Check social media presence
          if (checkSocialMedia) {
            try {
              socialMedia = await SocialMediaValidator.validateSocialMediaPresence(
                domain, 
                organizationName, 
                { timeout, userAgent }
              );
              console.log(`📥 Website validator received social media:`, JSON.stringify(socialMedia, null, 2));
            } catch (error) {
              console.warn('Social media validation failed:', error);
            }
          }

          // Try to extract title and contacts from HTML response
          if (contentType.includes('text/html')) {
            try {
              const text = await response.text();
              
              // Extract title
              const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
              title = titleMatch ? titleMatch[1].trim() : '';

              // Extract contact information with enhanced discovery
              console.log(`📞 Extracting contact information from ${url}`);
              contacts = await ContactExtractor.extractFromUrl(response.url, {
                timeout,
                userAgent,
                followContactPages
              });

              if (contacts.emails.length > 0 || contacts.phones.length > 0) {
                console.log(`✅ Found contacts: ${contacts.emails.length} emails, ${contacts.phones.length} phones`);
              }
            } catch (error) {
              console.warn('Failed to extract title or contacts:', error);
            }
          }

          return {
            hasWebsite: true,
            isAccessible: true,
            statusCode: response.status,
            contentType,
            title,
            responseTime,
            redirectUrl: response.url !== url ? response.url : undefined,
            contacts,
            ssl,
            socialMedia,
          };
        } else {
          // HTTP error but website exists
          return {
            hasWebsite: true,
            isAccessible: false,
            statusCode: response.status,
            contentType,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseTime,
          };
        }
      } catch (error) {
        console.log(`❌ ${protocol.toUpperCase()} failed for ${domain}:`, error instanceof Error ? error.message : error);
        
        // If this is the last protocol to try, return the error
        if (protocol === 'http') {
          return {
            hasWebsite: false,
            isAccessible: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            responseTime: Date.now() - startTime,
          };
        }
        // Continue to next protocol
      }
    }

    // This should never be reached, but just in case
    return {
      hasWebsite: false,
      isAccessible: false,
      error: 'No protocols worked',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`❌ Website validation failed for ${domain}:`, error);
    return {
      hasWebsite: false,
      isAccessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Checks if a domain has any DNS records (basic connectivity check)
 * 
 * @param domain - The domain to check
 * @returns Promise resolving to boolean
 */
export async function hasDnsRecords(domain: string): Promise<boolean> {
  try {
    // Try to resolve the domain
    const dns = await import('dns/promises');
    const addresses = await dns.resolve4(domain);
    return addresses.length > 0;
  } catch (error) {
    console.log(`❌ No DNS records found for ${domain}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Performs comprehensive website validation including DNS check
 * 
 * @param domain - The domain to validate
 * @param options - Validation options
 * @returns Promise resolving to comprehensive validation result
 */
export async function validateWebsiteComprehensive(
  domain: string, 
  options: {
    timeout?: number;
    followRedirects?: boolean;
    userAgent?: string;
    followContactPages?: boolean;
    checkSocialMedia?: boolean;
    organizationName?: string;
  } = {}
) {
  const [websiteResult, hasDns] = await Promise.all([
    validateWebsite(domain, options),
    hasDnsRecords(domain)
  ]);

  return {
    ...websiteResult,
    hasDns,
  };
} 