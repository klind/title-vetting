import { Agent } from 'https';

/**
 * Validates SSL certificate for a domain
 */
export class SSLValidator {
  /**
   * Checks if a domain has valid SSL certificate
   */
  static async validateSSL(domain: string, timeout: number = 10000): Promise<{
    hasSSL: boolean;
    isValid: boolean;
    isSelfSigned: boolean;
    error?: string;
  }> {
    try {
      // Create a custom HTTPS agent to check the certificate
      const agent = new Agent({
        rejectUnauthorized: false, // Allow self-signed certs for detection
        timeout: timeout,
      });

      const https = await import('https');
      
      return new Promise((resolve) => {
        const req = https.request({
          hostname: domain,
          port: 443,
          method: 'GET',
          agent: agent,
          timeout: timeout,
        }, (res) => {
          // Get certificate info
          const cert = (res.socket as any).getPeerCertificate();
          
          if (cert && Object.keys(cert).length > 0) {
            // Check if it's self-signed (subject and issuer are the same)
            const isSelfSigned = cert.subject && cert.issuer &&
              JSON.stringify(cert.subject) === JSON.stringify(cert.issuer);
            
            resolve({
              hasSSL: true,
              isValid: !isSelfSigned,
              isSelfSigned: isSelfSigned,
            });
          } else {
            resolve({
              hasSSL: false,
              isValid: false,
              isSelfSigned: false,
              error: 'No certificate found',
            });
          }
        });

        req.on('error', (error) => {
          console.log(`SSL validation failed for ${domain}:`, error.message);
          resolve({
            hasSSL: false,
            isValid: false,
            isSelfSigned: false,
            error: error.message,
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({
            hasSSL: false,
            isValid: false,
            isSelfSigned: false,
            error: 'SSL check timeout',
          });
        });

        req.end();
      });
    } catch (error) {
      console.warn(`SSL validation error for ${domain}:`, error instanceof Error ? error.message : error);
      return {
        hasSSL: false,
        isValid: false,
        isSelfSigned: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Checks if a URL uses HTTPS
   */
  static hasHTTPS(url: string): boolean {
    return url.startsWith('https://');
  }

  /**
   * Comprehensive SSL validation for a domain
   */
  static async validateDomainSSL(domain: string, timeout: number = 10000): Promise<{
    hasSSL: boolean;
    isValid: boolean;
    isSelfSigned: boolean;
    error?: string;
  }> {
    try {
      console.log(`🔒 Checking SSL certificate for ${domain}`);
      
      const sslResult = await this.validateSSL(domain, timeout);
      
      if (sslResult.hasSSL && sslResult.isValid) {
        console.log(`✅ Valid SSL certificate found for ${domain}`);
      } else if (sslResult.hasSSL && sslResult.isSelfSigned) {
        console.log(`⚠️ Self-signed SSL certificate found for ${domain}`);
      } else {
        console.log(`❌ No valid SSL certificate found for ${domain}`);
      }
      
      return sslResult;
    } catch (error) {
      console.warn(`SSL validation failed for ${domain}:`, error instanceof Error ? error.message : error);
      return {
        hasSSL: false,
        isValid: false,
        isSelfSigned: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
} 