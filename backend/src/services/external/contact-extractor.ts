import { JSDOM } from 'jsdom';

/**
 * Extracts contact information from website content
 */
export class ContactExtractor {
  static EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  static PHONE_REGEX = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  static PHONE_EXTENDED_REGEX = /(\+?[0-9]{1,4}[-.\s]?\(?[0-9]{1,4}\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4})/g;
  static ADDRESS_REGEX = /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Terrace|Ter|Circle|Cir|Highway|Hwy|Parkway|Pkwy)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi;

  // Contact page patterns to look for (more specific to avoid false positives)
  static CONTACT_PAGE_PATTERNS = [
    /\/contact[\w-]*\/?$/i,           // /contact, /contact-us, /contacts
    /\/about[\w-]*\/?$/i,             // /about, /about-us (but not /about-something-else)
    /\/reach-us\/?$/i,
    /\/get-in-touch\/?$/i,
    /\/locations\/?$/i,               // /locations (but not /locations/specific-location)
    /\/offices\/?$/i,
    /\/phone\/?$/i,
    /\/email\/?$/i,
    /\/address\/?$/i,
    /\/directions\/?$/i,
    /\/find-us\/?$/i,
    /\/visit-us\/?$/i,
    /\/connect\/?$/i,
    /\/support\/?$/i,                 // /support (but not /support/articles)
    /\/help\/?$/i,                    // /help (but not /helpful-resources)
    /\/contact-info\/?$/i,
    /\/inquiry\/?$/i,
    /\/quote\/?$/i,
    /\/consultation\/?$/i,
    /\/appointment\/?$/i
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

    // Get text content for phone/address extraction (still needed for these)
    const textContent = document.body?.textContent || '';

    // Start with empty arrays and use comprehensive extraction
    let emails: string[] = [];
    const phones = this.extractPhones(textContent);
    const addresses = this.extractAddresses(textContent);

    // Extract from structured email elements first (most reliable)
    const emailElements = document.querySelectorAll(
      '.email, .e-mail, [class*="email"], [id*="email"], [data-email], span[class*="mail"], div[class*="mail"]'
    );
    
    console.log(`📧 Found ${emailElements.length} email elements`);
    
    emailElements.forEach(element => {
      const elementText = element.textContent?.trim() || '';
      console.log(`📧 Checking email element: "${elementText}"`);
      if (elementText && this.isValidCleanEmail(elementText) && !emails.includes(elementText)) {
        console.log(`✅ Added email from element: ${elementText}`);
        emails.push(elementText);
      }
    });

    // Extract from comprehensive methods (will include mailto, labels, etc.)
    const extractedEmails = this.extractEmails(textContent, html);
    console.log(`📧 extractEmails found: ${extractedEmails.length} emails`);
    extractedEmails.forEach(email => {
      if (!emails.includes(email)) {
        console.log(`✅ Added email from extraction: ${email}`);
        emails.push(email);
      }
    });

    // Extract from phone-specific elements
    const phoneElements = document.querySelectorAll(
      '.phone, .tel, .telephone, [class*="phone"], [id*="phone"], [data-phone]'
    );
    
    phoneElements.forEach(element => {
      const elementText = element.textContent?.trim() || '';
      if (elementText) {
        const phoneMatches = this.extractPhones(elementText);
        phoneMatches.forEach(phone => {
          if (!phones.includes(phone)) phones.push(phone);
        });
      }
    });

    // Also check specific contact-related elements and links
    const contactElements = document.querySelectorAll(
      'a[href^="mailto:"], a[href^="tel:"], .contact, [class*="contact"], [id*="contact"]'
    );

    contactElements.forEach(element => {
      const elementText = element.textContent || '';
      const href = element.getAttribute('href') || '';

      // Extract from mailto links (enhanced)
      if (href.startsWith('mailto:')) {
        const email = href.replace('mailto:', '').split('?')[0].trim();
        if (this.isValidCleanEmail(email) && !emails.includes(email)) {
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

      // Extract additional emails from contact element text
      const elementEmails = this.extractEmails(elementText, element.outerHTML);
      elementEmails.forEach(email => {
        if (!emails.includes(email)) {
          console.log(`✅ Added email from contact element: ${email}`);
          emails.push(email);
        }
      });

      // Extract phones from contact elements
      const elementPhones = this.extractPhones(elementText);
      elementPhones.forEach(phone => {
        if (!phones.includes(phone)) phones.push(phone);
      });
    });

    const finalEmails = [...new Set(emails)];
    console.log(`📧 Final email extraction results: ${finalEmails.length} emails found: ${finalEmails.join(', ')}`);
    
    return {
      emails: finalEmails,
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

      // Try sitemap.xml in root directory only if not already found in robots.txt
      const rootSitemapUrl = new URL('/sitemap.xml', baseUrl).href;
      if (!contactPages.some(page => page.includes('sitemap.xml'))) {
        try {
          console.log(`🔍 Checking sitemap: ${rootSitemapUrl}`);
          
          const sitemapPages = await this.parseSitemap(rootSitemapUrl, options);
          contactPages.push(...sitemapPages);
          
          if (sitemapPages.length > 0) {
            console.log(`✅ Found ${sitemapPages.length} potential contact pages in sitemap`);
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch sitemap.xml: ${error instanceof Error ? error.message : error}`);
        }
      } else {
        console.log(`⏭️ Skipping direct sitemap check - already processed from robots.txt`);
      }

      // Remove duplicates and filter for contact pages
      const uniquePages = [...new Set(contactPages)];
      const filteredPages = uniquePages.filter(url => this.isContactPage(url));
      
      // Prioritize pages with "contact" in the URL (most likely to have contact info)
      const prioritizedPages = filteredPages.sort((a, b) => {
        const aHasContact = a.toLowerCase().includes('contact');
        const bHasContact = b.toLowerCase().includes('contact');
        
        if (aHasContact && !bHasContact) return -1; // a comes first
        if (!aHasContact && bHasContact) return 1;  // b comes first
        return 0; // maintain original order
      });
      
      console.log(`📞 Found ${prioritizedPages.length} contact pages out of ${uniquePages.length} total pages`);
      return prioritizedPages;
    } catch (error) {
      console.warn(`Failed to discover contact pages: ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Parses sitemap XML to extract URLs, handling both regular sitemaps and sitemap indexes
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

      // Check if this is a sitemap index (contains <sitemapindex> or <sitemap> tags)
      if (xmlText.includes('<sitemapindex') || xmlText.includes('<sitemap>')) {
        console.log(`📋 Found sitemap index at ${sitemapUrl}, parsing nested sitemaps...`);
        
        // Extract sitemap URLs from index (handle both regular and CDATA-wrapped URLs)
        const sitemapMatches = xmlText.match(/<loc[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/gi);
        if (sitemapMatches) {
          const sitemapUrls: string[] = [];
          sitemapMatches.forEach(match => {
            const urlMatch = match.match(/<loc[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/i);
            if (urlMatch && urlMatch[1]) {
              const url = urlMatch[1].trim();
              // Avoid infinite recursion - don't parse the same sitemap again
              if (url !== sitemapUrl) {
                sitemapUrls.push(url);
              }
            }
          });

          console.log(`🔍 Found ${sitemapUrls.length} nested sitemaps in index`);

          // Parse each nested sitemap (limit to prevent infinite recursion)
          for (const nestedSitemapUrl of sitemapUrls.slice(0, 10)) {
            try {
              console.log(`🔍 Parsing nested sitemap: ${nestedSitemapUrl}`);
              const nestedUrls = await this.parseSitemap(nestedSitemapUrl, options);
              console.log(`📄 Found ${nestedUrls.length} URLs in ${nestedSitemapUrl}`);
              urls.push(...nestedUrls);
            } catch (error) {
              console.warn(`Failed to parse nested sitemap ${nestedSitemapUrl}: ${error instanceof Error ? error.message : error}`);
            }
          }
        }
      } else {
        // Regular sitemap - extract page URLs (handle both regular and CDATA-wrapped URLs)
        const urlMatches = xmlText.match(/<loc[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/gi);
        if (urlMatches) {
          urlMatches.forEach(match => {
            const urlMatch = match.match(/<loc[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/loc>/i);
            if (urlMatch && urlMatch[1]) {
              urls.push(urlMatch[1].trim());
            }
          });
        }
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
   * Extracts emails from text content and HTML patterns
   */
  static extractEmails(text: string, html?: string): string[] {
    const emails: string[] = [];
    
    // If HTML is provided, use enhanced extraction methods
    if (html) {
      // 1. Extract from mailto: links in HTML (most reliable)
      const mailtoMatches = html.match(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) || [];
      mailtoMatches.forEach(match => {
        const email = match.replace(/mailto:/i, '').split('?')[0].trim();
        if (this.isValidCleanEmail(email) && !emails.includes(email)) {
          emails.push(email);
        }
      });

      // 2. Look for "Email:" pattern in HTML with word boundaries
      const emailLabelPattern = /\bemail\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/gi;
      const emailLabelMatches = html.match(emailLabelPattern) || [];
      emailLabelMatches.forEach(match => {
        const emailMatch = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch && this.isValidCleanEmail(emailMatch[1]) && !emails.includes(emailMatch[1])) {
          emails.push(emailMatch[1]);
        }
      });

      // 3. Extract from structured HTML elements (input fields, spans with email attributes)
      const structuredEmailPattern = /<(?:input|span|div|td|th)[^>]*(?:name|id|class)="[^"]*email[^"]*"[^>]*>([^<]*@[^<]*)</gi;
      const structuredMatches = html.match(structuredEmailPattern) || [];
      structuredMatches.forEach(match => {
        const emailMatch = match.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        if (emailMatch && this.isValidCleanEmail(emailMatch[1]) && !emails.includes(emailMatch[1])) {
          emails.push(emailMatch[1]);
        }
      });
    }
    
    // Always try text extraction as fallback (but use clean validation)
    const textEmailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
    const textEmails = text.match(textEmailPattern) || [];
    console.log(`📧 Text extraction found ${textEmails.length} potential emails: ${textEmails.join(', ')}`);
    
    textEmails.forEach(email => {
      console.log(`📧 Validating text email: ${email}`);
      if (this.isValidCleanEmail(email) && !emails.includes(email)) {
        console.log(`✅ Added email from text: ${email}`);
        emails.push(email);
      } else {
        console.log(`❌ Rejected email: ${email} (valid: ${this.isValidCleanEmail(email)}, duplicate: ${emails.includes(email)})`);
      }
    });
    
    return emails;
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
   * Validates email format with targeted checks for concatenated/malformed emails
   */
  static isValidCleanEmail(email: string): boolean {
    // Basic format validation
    if (!this.isValidEmail(email)) return false;
    
    // Check for obvious concatenation patterns in the domain part specifically
    if (email.includes('.comstewart.') || email.includes('.comservices') || email.includes('.com.com')) {
      return false;
    }
    
    // Check for phone numbers at the start of email (like "729-1900agencyservices@")
    if (/^\d{3}-\d{4}/.test(email)) {
      return false;
    }
    
    // Check for phone number patterns at start of local part (like "8238claims@")
    // This catches partial phone numbers that got concatenated
    if (/^\d{4}[a-zA-Z]/.test(email)) {
      return false;
    }
    
    // Check for excessive length (concatenated emails are often very long)
    if (email.length > 80) {
      return false;
    }
    
    // Check for multiple @ symbols
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) {
      return false;
    }
    
    // Extract the local part (before @) for additional validation
    const localPart = email.split('@')[0];
    
    // Check if local part starts with too many consecutive digits (likely phone number fragment)
    if (/^\d{3,}/.test(localPart)) {
      return false;
    }
    
    // Check for very specific concatenation patterns that indicate problems
    const suspiciousPatterns = [
      /\d{3}-\d{4}.*@/, // phone numbers before @
      /@.*@/, // multiple @ symbols  
      /\.(com|net|org){2,}/i, // repeated domains like .com.com
      /\.com[a-zA-Z0-9]+\./i // .com followed immediately by alphanumeric then another dot (like .comstewart.)
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validates phone number format
   */
  static isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    // Basic length check
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      return false;
    }
    
    // Check for malformed patterns
    if (phone.startsWith('-') || phone.startsWith('.')) {
      return false;
    }
    
    // For North American numbers (10 digits), validate format
    if (cleanPhone.length === 10) {
      const areaCode = cleanPhone.substring(0, 3);
      const exchange = cleanPhone.substring(3, 6);
      
      // Area code cannot start with 0 or 1
      if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
        return false;
      }
      
      // Exchange code cannot start with 0 or 1
      if (exchange.startsWith('0') || exchange.startsWith('1')) {
        return false;
      }
      
      // Check for obviously invalid patterns like "000" or "111"
      if (areaCode === '000' || areaCode === '111' || exchange === '000' || exchange === '111') {
        return false;
      }
    }
    
    // For 11-digit numbers starting with 1 (North American with country code)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      const areaCode = cleanPhone.substring(1, 4);
      const exchange = cleanPhone.substring(4, 7);
      
      // Same validations as above for the area code and exchange
      if (areaCode.startsWith('0') || areaCode.startsWith('1') || 
          exchange.startsWith('0') || exchange.startsWith('1') ||
          areaCode === '000' || areaCode === '111' || exchange === '000' || exchange === '111') {
        return false;
      }
    }
    
    return true;
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
            const additionalContacts = await this.extractFromMultiplePages(contactPages.slice(0, 5), { timeout, userAgent });
            
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