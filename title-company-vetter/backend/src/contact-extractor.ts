import { JSDOM } from 'jsdom';

/**
 * Extracts contact information from website content
 */
export class ContactExtractor {
  static EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  static PHONE_REGEX = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  static PHONE_EXTENDED_REGEX = /(\+?[0-9]{1,4}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4})/g;
  static ADDRESS_REGEX = /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Terrace|Ter|Circle|Cir|Highway|Hwy|Parkway|Pkwy)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi;

  // Contact page patterns to look for
  static CONTACT_PAGE_PATTERNS = [
    /contact/i,
    /about/i,
    /reach-us/i,
    /get-in-touch/i,
    /locations/i,
    /offices/i,
    /phone/i,
    /email/i,
    /address/i,
    /directions/i,
    /find-us/i,
    /visit-us/i,
    /connect/i,
    /support/i,
    /help/i,
    /info/i,
    /inquiry/i,
    /quote/i,
    /consultation/i,
    /appointment/i
  ];

  /**
   * Extracts contact information from HTML content
   */
  static extractFromHtml(html: string, url: string) {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove script and style tags to avoid extracting from code
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(script => script.remove());

    // Get all text content
    const textContent = document.body?.textContent || '';

    // Extract contact information
    const emails = this.extractEmails(textContent);
    const phones = this.extractPhones(textContent);
    const addresses = this.extractAddresses(textContent);

    // Also check specific contact-related elements
    const contactElements = document.querySelectorAll(
      'a[href^="mailto:"], a[href^="tel:"], .contact, .phone, .email, [class*="contact"], [id*="contact"]'
    );

    contactElements.forEach(element => {
      const elementText = element.textContent || '';
      const href = element.getAttribute('href') || '';

      // Extract from mailto links
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '').split('?')[0];
        if (this.isValidEmail(email) && !emails.includes(email)) {
          emails.push(email);
        }
      }

      // Extract from tel links
      if (href.startsWith('tel:')) {
        const phone = href.replace('tel:', '').replace(/[^\d+\-\(\)\s]/g, '');
        if (this.isValidPhone(phone) && !phones.includes(phone)) {
          phones.push(phone);
        }
      }

      // Extract from contact element text
      const elementEmails = this.extractEmails(elementText);
      const elementPhones = this.extractPhones(elementText);

      elementEmails.forEach(email => {
        if (!emails.includes(email)) emails.push(email);
      });

      elementPhones.forEach(phone => {
        if (!phones.includes(phone)) phones.push(phone);
      });
    });

    return {
      emails: [...new Set(emails)], // Remove duplicates
      phones: [...new Set(phones)], // Remove duplicates
      addresses: [...new Set(addresses)], // Remove duplicates
    };
  }

  /**
   * Discovers contact pages from sitemap.xml and robots.txt
   */
  static async discoverContactPages(baseUrl: string, options: {
    timeout?: number;
    userAgent?: string;
  } = {}) {
    const contactPages: string[] = [];
    const { timeout = 10000, userAgent = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)' } = options;

    try {
      const fetch = (await import('node-fetch')).default;

      // Try to find sitemap from robots.txt first
      try {
        const robotsUrl = new URL('/robots.txt', baseUrl).href;
        console.log(`🔍 Checking robots.txt: ${robotsUrl}`);
        
        const robotsResponse = await fetch(robotsUrl, {
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(timeout)
        });

        if (robotsResponse.ok) {
          const robotsText = await robotsResponse.text();
          const sitemapMatch = robotsText.match(/Sitemap:\s*(.+)/i);
          
          if (sitemapMatch) {
            const sitemapUrl = sitemapMatch[1].trim();
            console.log(`📋 Found sitemap in robots.txt: ${sitemapUrl}`);
            const sitemapPages = await this.parseSitemap(sitemapUrl, options);
            contactPages.push(...sitemapPages);
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch robots.txt: ${error instanceof Error ? error.message : error}`);
      }

      // Try common sitemap locations
      const commonSitemapPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap/sitemap.xml',
        '/sitemap1.xml',
        '/sitemap_news.xml'
      ];

      for (const sitemapPath of commonSitemapPaths) {
        try {
          const sitemapUrl = new URL(sitemapPath, baseUrl).href;
          console.log(`🔍 Checking sitemap: ${sitemapUrl}`);
          
          const sitemapPages = await this.parseSitemap(sitemapUrl, options);
          contactPages.push(...sitemapPages);
          
          if (sitemapPages.length > 0) {
            console.log(`✅ Found ${sitemapPages.length} potential contact pages in sitemap`);
            break; // Found a working sitemap, no need to check others
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch ${sitemapPath}: ${error instanceof Error ? error.message : error}`);
        }
      }

      // Remove duplicates and filter for contact pages
      const uniquePages = [...new Set(contactPages)];
      const filteredPages = uniquePages.filter(url => this.isContactPage(url));
      
      console.log(`📞 Found ${filteredPages.length} contact pages out of ${uniquePages.length} total pages`);
      return filteredPages;
    } catch (error) {
      console.warn(`Failed to discover contact pages: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Parses sitemap XML to extract URLs
   */
  static async parseSitemap(sitemapUrl: string, options: {
    timeout?: number;
    userAgent?: string;
  } = {}) {
    const { timeout = 10000, userAgent = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)' } = options;

    try {
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(sitemapUrl, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const urls: string[] = [];

      // Simple XML parsing for URLs
      const urlMatches = xmlText.match(/<loc[^>]*>([^<]+)<\/loc>/gi);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const urlMatch = match.match(/<loc[^>]*>([^<]+)<\/loc>/i);
          if (urlMatch && urlMatch[1]) {
            urls.push(urlMatch[1].trim());
          }
        });
      }

      return urls;
    } catch (error) {
      console.warn(`Failed to parse sitemap ${sitemapUrl}: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Checks if a URL is likely a contact page
   */
  static isContactPage(url: string): boolean {
    const urlLower = url.toLowerCase();
    // Check if URL contains contact-related keywords
    return this.CONTACT_PAGE_PATTERNS.some(pattern => pattern.test(urlLower));
  }

  /**
   * Extracts contact information from multiple pages
   */
  static async extractFromMultiplePages(urls: string[], options: {
    timeout?: number;
    userAgent?: string;
  } = {}) {
    const allEmails: string[] = [];
    const allPhones: string[] = [];
    const allAddresses: string[] = [];
    const { timeout = 10000, userAgent = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)' } = options;

    try {
      const fetch = (await import('node-fetch')).default;

      // Process pages in parallel with a limit
      const batchSize = 3; // Process 3 pages at a time
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (url) => {
          try {
            const response = await fetch(url, {
              headers: { 'User-Agent': userAgent },
              signal: AbortSignal.timeout(timeout)
            });

            if (response.ok) {
              const html = await response.text();
              const contacts = this.extractFromHtml(html, url);
              
              return contacts;
            }
          } catch (error) {
            console.warn(`Failed to fetch ${url}: ${error instanceof Error ? error.message : error}`);
          }
          
          return { emails: [], phones: [], addresses: [] };
        });

        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(contacts => {
          allEmails.push(...contacts.emails);
          allPhones.push(...contacts.phones);
          allAddresses.push(...contacts.addresses);
        });
      }

      return {
        emails: [...new Set(allEmails)],
        phones: [...new Set(allPhones)],
        addresses: [...new Set(allAddresses)],
      };
    } catch (error) {
      console.warn(`Failed to extract from multiple pages: ${error instanceof Error ? error.message : error}`);
      return { emails: [], phones: [], addresses: [] };
    }
  }

  /**
   * Extracts emails from text content
   */
  static extractEmails(text: string): string[] {
    const emails = text.match(this.EMAIL_REGEX) || [];
    return emails.filter(email => this.isValidEmail(email));
  }

  /**
   * Extracts phone numbers from text content
   */
  static extractPhones(text: string): string[] {
    const phones = text.match(this.PHONE_REGEX) || [];
    return phones
      .map(phone => this.normalizePhone(phone))
      .filter(phone => this.isValidPhone(phone));
  }

  /**
   * Extracts addresses from text content
   */
  static extractAddresses(text: string): string[] {
    const addresses = text.match(this.ADDRESS_REGEX) || [];
    return addresses.map(addr => addr.trim());
  }

  /**
   * Validates email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validates phone number format
   */
  static isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }

  /**
   * Normalizes phone number format
   */
  static normalizePhone(phone: string): string {
    return phone.replace(/[^\d+\-\(\)\s]/g, '').trim();
  }

  /**
   * Validates email domains against target domain
   */
  static validateEmailDomains(emails: string[], targetDomain: string): {
    valid: string[];
    invalid: string[];
    score: number;
  } {
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      const emailDomain = email.split('@')[1];
      if (emailDomain === targetDomain) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    const score = valid.length > 0 ? (valid.length / emails.length) * 100 : 0;

    return { valid, invalid, score };
  }

  /**
   * Extracts contact information from a URL
   */
  static async extractFromUrl(url: string, options: {
    timeout?: number;
    userAgent?: string;
    followContactPages?: boolean;
  } = {}) {
    const { timeout = 10000, userAgent = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)', followContactPages = true } = options;

    try {
      const fetch = (await import('node-fetch')).default;
      
      // First, extract from the main page
      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        signal: AbortSignal.timeout(timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      let contacts = this.extractFromHtml(html, url);

      // If we should follow contact pages and we don't have many contacts, try to find more
      if (followContactPages && (contacts.emails.length < 2 || contacts.phones.length < 1)) {
        try {
          const contactPages = await this.discoverContactPages(url, { timeout, userAgent });
          
          if (contactPages.length > 0) {
            console.log(`🔍 Found ${contactPages.length} contact pages, extracting additional contacts...`);
            const additionalContacts = await this.extractFromMultiplePages(contactPages.slice(0, 3), { timeout, userAgent });
            
            // Merge contacts
            contacts.emails.push(...additionalContacts.emails);
            contacts.phones.push(...additionalContacts.phones);
            contacts.addresses.push(...additionalContacts.addresses);
            
            // Remove duplicates
            contacts.emails = [...new Set(contacts.emails)];
            contacts.phones = [...new Set(contacts.phones)];
            contacts.addresses = [...new Set(contacts.addresses)];
          }
        } catch (error) {
          console.warn('Failed to extract from contact pages:', error);
        }
      }

      return contacts;
    } catch (error) {
      console.warn(`Failed to extract contacts from ${url}: ${error instanceof Error ? error.message : error}`);
      return { emails: [], phones: [], addresses: [] };
    }
  }
} 