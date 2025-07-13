import { describe, it, expect } from 'vitest';
import { 
  validateUrl, 
  extractDomain, 
  checkSuspiciousPatterns,
  performSecurityChecks,
  normalizeUrl,
  isDomainWhitelisted
} from '../../src/url-validator.js';

describe('URL Validator', () => {
  describe('validateUrl', () => {
    it('should validate a correct URL', () => {
      const result = validateUrl('https://example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should validate a correct URL with www', () => {
      const result = validateUrl('https://www.example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('www.example.com');
    });

    it('should validate HTTP URLs', () => {
      const result = validateUrl('http://example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should reject empty URL', () => {
      const result = validateUrl('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject null/undefined URL', () => {
      const result = validateUrl(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject invalid URL format', () => {
      const result = validateUrl('not-a-url');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should reject URLs without protocol', () => {
      const result = validateUrl('example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should reject FTP URLs', () => {
      const result = validateUrl('ftp://example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from HTTPS URL', () => {
      const domain = extractDomain('https://example.com/path');
      expect(domain).toBe('example.com');
    });

    it('should extract domain from HTTP URL', () => {
      const domain = extractDomain('http://example.com/path');
      expect(domain).toBe('example.com');
    });

    it('should extract domain with port', () => {
      const domain = extractDomain('https://example.com:8080/path');
      expect(domain).toBe('example.com');
    });

    it('should extract subdomain', () => {
      const domain = extractDomain('https://sub.example.com');
      expect(domain).toBe('sub.example.com');
    });

    it('should return null for invalid URL', () => {
      const domain = extractDomain('invalid-url');
      expect(domain).toBeNull();
    });
  });

  describe('checkSuspiciousPatterns', () => {
    it('should pass normal domains', () => {
      const result = checkSuspiciousPatterns('example.com');
      expect(result.isValid).toBe(true);
    });

    it('should detect IP addresses', () => {
      const result = checkSuspiciousPatterns('192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious pattern');
    });

    it('should detect punycode domains', () => {
      const result = checkSuspiciousPatterns('xn--example.com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious pattern');
    });

    it('should detect suspicious TLDs', () => {
      const result = checkSuspiciousPatterns('example.tk');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious TLD');
    });

    it('should detect multiple consecutive dots', () => {
      const result = checkSuspiciousPatterns('example..com');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious pattern');
    });

    it('should detect URL shorteners', () => {
      const result = checkSuspiciousPatterns('bit.ly');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('suspicious pattern');
    });
  });

  describe('performSecurityChecks', () => {
    it('should pass normal domains', () => {
      const result = performSecurityChecks('example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject very long domains', () => {
      const longDomain = 'a'.repeat(260) + '.com';
      const result = performSecurityChecks(longDomain);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject too many subdomains', () => {
      const manySubdomains = 'a.b.c.d.e.f.g.example.com';
      const result = performSecurityChecks(manySubdomains);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too many subdomains');
    });

    it('should reject localhost', () => {
      const result = performSecurityChecks('localhost');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Local or private network');
    });

    it('should reject private IP ranges', () => {
      const result = performSecurityChecks('192.168.1.1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Local or private network');
    });

    it('should reject very long subdomain parts', () => {
      const longPart = 'a'.repeat(70);
      const result = performSecurityChecks(`${longPart}.example.com`);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Domain part too long');
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize URL by removing www', () => {
      const normalized = normalizeUrl('https://www.example.com');
      expect(normalized).toBe('https://example.com/');
    });

    it('should normalize URL by removing trailing slash', () => {
      const normalized = normalizeUrl('https://example.com/');
      expect(normalized).toBe('https://example.com/');
    });

    it('should convert to lowercase', () => {
      const normalized = normalizeUrl('https://EXAMPLE.COM');
      expect(normalized).toBe('https://example.com/');
    });

    it('should sort query parameters', () => {
      const normalized = normalizeUrl('https://example.com?c=3&a=1&b=2');
      expect(normalized).toBe('https://example.com/?a=1&b=2&c=3');
    });

    it('should handle malformed URLs gracefully', () => {
      const normalized = normalizeUrl('not-a-url');
      expect(normalized).toBe('not-a-url');
    });
  });

  describe('isDomainWhitelisted', () => {
    const whitelist = ['example.com', 'trusted.org'];

    it('should return true for whitelisted domain', () => {
      const result = isDomainWhitelisted('example.com', whitelist);
      expect(result).toBe(true);
    });

    it('should return true for subdomain of whitelisted domain', () => {
      const result = isDomainWhitelisted('sub.example.com', whitelist);
      expect(result).toBe(true);
    });

    it('should return false for non-whitelisted domain', () => {
      const result = isDomainWhitelisted('malicious.com', whitelist);
      expect(result).toBe(false);
    });

    it('should handle case insensitive matching', () => {
      const result = isDomainWhitelisted('EXAMPLE.COM', whitelist);
      expect(result).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle URLs with query parameters', () => {
      const result = validateUrl('https://example.com/path?param=value');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should handle URLs with fragments', () => {
      const result = validateUrl('https://example.com/path#section');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should handle URLs with authentication', () => {
      const result = validateUrl('https://user:pass@example.com');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });

    it('should handle international domains', () => {
      const result = validateUrl('https://中国.com');
      expect(result.isValid).toBe(false); // Currently not supported, may be added later
    });

    it('should trim whitespace from URLs', () => {
      const result = validateUrl('  https://example.com  ');
      expect(result.isValid).toBe(true);
      expect(result.domain).toBe('example.com');
    });
  });
});