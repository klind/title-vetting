import fetch from 'node-fetch';
import { chromium } from 'playwright';

/**
 * Social Media Validator for checking social media presence with advanced stealth capabilities
 */
export class SocialMediaValidator {
  static DEFAULT_TIMEOUT = 15000;
  
  // Pool of real Chrome user agents for rotation
  static USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  
  // Common viewport sizes to rotate between
  static VIEWPORT_SIZES = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 }
  ];
  
  // Timezone options for randomization
  static TIMEZONES = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix'
  ];
  
  // Geolocation coordinates for major US cities
  static GEOLOCATIONS = [
    { longitude: -74.006, latitude: 40.7128, city: 'New York' },
    { longitude: -87.6298, latitude: 41.8781, city: 'Chicago' },
    { longitude: -118.2437, latitude: 34.0522, city: 'Los Angeles' },
    { longitude: -95.3698, latitude: 29.7604, city: 'Houston' },
    { longitude: -75.1652, latitude: 39.9526, city: 'Philadelphia' }
  ];

  /**
   * Validates social media presence for a domain or organization
   */
  static async validateSocialMediaPresence(
    domain: string,
    organizationName?: string,
    options: {
      timeout?: number;
      userAgent?: string;
      checkFollowers?: boolean;
      checkActivity?: boolean;
    } = {}
  ) {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      checkFollowers = false,
      checkActivity = false
    } = options;

    console.log(`🔍 Checking social media presence for: ${domain}${organizationName ? ` (${organizationName})` : ''}`);

    const searchTerms = this.generateSearchTerms(domain, organizationName);
    const profiles: any[] = [];

    // Check each platform
    const platformChecks = [
      this.checkLinkedIn(searchTerms, { timeout, userAgent, checkFollowers, checkActivity }),
      this.checkFacebook(searchTerms, { timeout, userAgent, checkFollowers, checkActivity }, domain),
      this.checkTwitter(searchTerms, { timeout, userAgent, checkFollowers, checkActivity }),
      this.checkInstagram(searchTerms, { timeout, userAgent, checkFollowers, checkActivity })
    ];

    const results = await Promise.allSettled(platformChecks);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        profiles.push(result.value);
      } else {
        const platforms = ['linkedin', 'facebook', 'x', 'instagram'];
        profiles.push({
          platform: platforms[index],
          exists: false,
          verified: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    const totalProfiles = profiles.filter(p => p.exists).length;
    const verifiedProfiles = profiles.filter(p => p.verified).length;
    const hasConsistentPresence = totalProfiles >= 2; // At least 2 platforms
    const credibilityScore = this.calculateCredibilityScore(profiles);
    const vettingAssessment = this.generateVettingAssessment(profiles, totalProfiles, verifiedProfiles);

    console.log(`✅ Social media validation complete: ${totalProfiles} profiles found, ${verifiedProfiles} verified`);

    return {
      profiles,
      totalProfiles,
      verifiedProfiles,
      hasConsistentPresence,
      credibilityScore,
      vettingAssessment
    };
  }

  /**
   * Generates search terms for social media lookup
   */
  static generateSearchTerms(domain: string, organizationName?: string): string[] {
    const domainParts = domain.split('.');
    const baseDomain = domainParts[0];
    
    // For title companies, add "title" to search terms for better specificity
    // This prevents finding celebrities with similar names (e.g., "stewart" -> Rod Stewart)
    const searchTerms = [
      `${baseDomain} title`,  // Primary search with "title" for specificity
      baseDomain              // Fallback to base domain only
    ];
    
    // If organization name is provided, add it as well
    if (organizationName && organizationName.toLowerCase() !== baseDomain.toLowerCase()) {
      searchTerms.unshift(`${organizationName} title`);
      searchTerms.push(organizationName);
    }
    
    return searchTerms;
  }

  /**
   * Checks LinkedIn presence using hybrid approach
   */
  static async checkLinkedIn(searchTerms: string[], options: {
    timeout?: number;
    userAgent?: string;
    checkFollowers?: boolean;
    checkActivity?: boolean;
  }) {
    const { timeout = this.DEFAULT_TIMEOUT } = options;
    let browser = null;
    
    try {
      console.log(`🔍 Starting Playwright Google search for LinkedIn pages: ${searchTerms.join(', ')}`);
      
      // Launch browser with comprehensive stealth settings
      browser = await chromium.launch({
        headless: true,
        args: [
          // Core stealth arguments
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          
          // Additional stealth arguments
          '--no-first-run',
          '--no-service-autorun',
          '--no-default-browser-check',
          '--password-store=basic',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-plugins',
          '--disable-background-networking',
          '--disable-plugins-discovery',
          '--disable-preconnect',
          
          // Performance and memory
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          
          // Media and WebGL
          '--enable-webgl',
          '--use-gl=swiftshader',
          '--enable-accelerated-2d-canvas',
          
          // Network and security
          '--ignore-certificate-errors',
          '--ignore-ssl-errors=yes',
          '--ignore-certificate-errors-spki-list',
          '--ignore-certificate-errors-sp-list'
        ]
      });
      
      // Create context with randomized fingerprint
      const randomUserAgent = this.getRandomUserAgent();
      const randomViewport = this.getRandomViewport();
      const randomTimezone = this.getRandomTimezone();
      const randomGeolocation = this.getRandomGeolocation();
      
      console.log(`   Using random fingerprint: ${randomGeolocation.city}, ${randomViewport.width}x${randomViewport.height}`);
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: randomGeolocation,
        permissions: ['geolocation'],
        userAgent: randomUserAgent,
        viewport: randomViewport,
        timezoneId: randomTimezone,
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2, // Randomize device scale
        hasTouch: false,
        isMobile: false,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const page = await context.newPage();
      
      // Remove automation detection signals
      await this.addStealthScripts(page);
      
      // Add realistic browser behavior
      await page.setExtraHTTPHeaders({
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1'
      });
      
      // Try each search term
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: linkedin ${term}`);
          
          // Navigate to Google search with US parameters
          const searchUrl = `https://www.google.com/search?q=linkedin+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          
          // Check for bot detection after navigation
          const hasBotDetection = await this.handleBotDetection(page);
          if (hasBotDetection) {
            console.log(`   Bot detection encountered, skipping term: ${term}`);
            continue;
          }
          
          // Simulate human behavior after page load
          await this.simulateHumanMovement(page);
          await this.addRandomDelay(1000, 3000);
          console.log(`   Navigated to: ${searchUrl}`);
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            console.log(`   Accepting Google consent...`);
            await this.addRandomDelay(1000, 2000); // Delay before clicking
            await consentButton.click();
            await page.waitForLoadState('networkidle');
            await this.addRandomDelay(1000, 2000); // Delay after clicking
          }
          
          // Wait for search results with multiple possible selectors
          const searchResultSelectors = [
            'div[data-sokoban-container]',
            '#search',
            '.g',
            '[data-ved]',
            'a[href*="linkedin.com"]'
          ];
          
          let searchResultsFound = false;
          for (const selector of searchResultSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 5000 });
              console.log(`   Found search results with selector: ${selector}`);
              searchResultsFound = true;
              break;
            } catch (error) {
              console.log(`   Selector ${selector} not found, trying next...`);
            }
          }
          
          if (!searchResultsFound) {
            console.log(`   No search results found, taking screenshot for debugging...`);
            await page.screenshot({ path: 'google-linkedin-search-debug.png' });
            console.log(`   Screenshot saved as google-linkedin-search-debug.png`);
            continue;
          }
          
          // Wait for results to load with human-like behavior
          await this.addRandomDelay(2000, 4000);
          await this.simulateScrolling(page);
          
          // Extract LinkedIn URLs from search results
          const linkedinUrls = await this.extractLinkedInUrlsWithPlaywright(page, term);
          console.log(`   Found ${linkedinUrls.length} LinkedIn URLs: ${linkedinUrls.join(', ')}`);
          
          if (linkedinUrls.length > 0) {
            // Validate the first 3 URLs
            const validUrls = await this.validateLinkedInUrls(linkedinUrls.slice(0, 3), options);
            if (validUrls.length > 0) {
              console.log(`✅ Found ${validUrls.length} valid LinkedIn pages via Playwright: ${validUrls.join(', ')}`);
              return {
                platform: 'linkedin',
                urls: validUrls,
                exists: true,
                verified: false // Cannot verify without LinkedIn authentication
              };
            }
          }
          
          // Add realistic delay between searches
          await this.addRandomDelay(3000, 7000);
        } catch (error) {
          console.log(`⚠️ Playwright LinkedIn search failed for term "${term}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }
    } catch (error) {
      console.log(`⚠️ Playwright browser error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return {
      platform: 'linkedin',
      exists: false,
      verified: false
    };
  }

  /**
   * Extract LinkedIn URLs from Google search results
   */
  static async extractLinkedInUrlsWithPlaywright(page: any, searchTerm: string): Promise<string[]> {
    try {
      // Look for LinkedIn URLs in search results
      const linkedinUrls = await page.$$eval('a[href*="linkedin.com/company"], a[href*="linkedin.com/in"]', (links: any[]) => {
        return links
          .map(link => link.href)
          .filter(href => href.includes('linkedin.com'))
          .map(href => {
            // Remove Google text fragments and other URL fragments
            const url = new URL(href);
            url.hash = ''; // Remove everything after #
            url.search = ''; // Remove query parameters
            
            // Only accept US LinkedIn domains - filter out all country-specific domains
            if (url.hostname !== 'www.linkedin.com' && url.hostname !== 'linkedin.com') {
              return null; // Skip non-US LinkedIn domains
            }
            
            // Normalize to www.linkedin.com
            url.hostname = 'www.linkedin.com';
            
            return url.toString();
          })
          .filter(href => href !== null) // Remove filtered out non-US domains
          .filter((href, index, arr) => arr.indexOf(href) === index) // Remove duplicates
          .slice(0, 5); // Get first 5 unique LinkedIn URLs
      });
      
      return linkedinUrls;
    } catch (error) {
      console.log(`   Failed to extract LinkedIn URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Validate LinkedIn URLs by checking if they're accessible
   */
  static async validateLinkedInUrls(urls: string[], options: any): Promise<string[]> {
    const validUrls: string[] = [];
    const { timeout = this.DEFAULT_TIMEOUT, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } = options;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(timeout)
        });
        
        if (response.ok) {
          validUrls.push(url);
          console.log(`   ✅ LinkedIn URL valid: ${url}`);
        } else {
          console.log(`   ❌ LinkedIn URL invalid (${response.status}): ${url}`);
        }
      } catch (error) {
        console.log(`   ❌ LinkedIn URL failed: ${url} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return validUrls;
  }

  /**
   * Extract Facebook URLs from Google search results
   */
  static async extractFacebookUrls(page: any, searchTerm: string): Promise<string[]> {
    try {
      const facebookUrls = await page.$$eval('a[href*="facebook.com"]', (links: any[]) => {
        return links
          .map(link => link.href)
          .filter(href => href.includes('facebook.com') && !href.includes('facebook.com/login'))
          .map(href => {
            // Remove Google text fragments and other URL fragments
            const url = new URL(href);
            url.hash = ''; // Remove everything after #
            url.search = ''; // Remove query parameters
            
            // Only accept US Facebook domains
            if (url.hostname !== 'www.facebook.com' && url.hostname !== 'facebook.com' && url.hostname !== 'm.facebook.com') {
              return null; // Skip non-US Facebook domains
            }
            
            // Normalize to www.facebook.com
            url.hostname = 'www.facebook.com';
            
            return url.toString();
          })
          .filter(href => href !== null) // Remove filtered out non-US domains
          .filter((href, index, arr) => arr.indexOf(href) === index) // Remove duplicates
          .slice(0, 5);
      });
      
      return facebookUrls;
    } catch (error) {
      console.log(`   Failed to extract Facebook URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Generic URL validator for social media platforms
   */
  static async validateSocialMediaUrls(urls: string[], options: any): Promise<string[]> {
    const validUrls: string[] = [];
    const { timeout = this.DEFAULT_TIMEOUT, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } = options;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: { 'User-Agent': userAgent },
          signal: AbortSignal.timeout(timeout)
        });
        
        if (response.ok) {
          validUrls.push(url);
          console.log(`   ✅ Social media URL valid: ${url}`);
        } else {
          console.log(`   ❌ Social media URL invalid (${response.status}): ${url}`);
        }
      } catch (error) {
        console.log(`   ❌ Social media URL failed: ${url} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return validUrls;
  }

  /**
   * Extract Twitter/X URLs from Google search results
   */
  static async extractTwitterUrls(page: any, searchTerm: string): Promise<string[]> {
    try {
      const twitterUrls = await page.$$eval('a[href*="twitter.com"], a[href*="x.com"]', (links: any[]) => {
        return links
          .map(link => link.href)
          .filter(href => 
            (href.includes('twitter.com') || href.includes('x.com')) && 
            !href.includes('/login') && 
            !href.includes('/signup')
          )
          .map(href => {
            // Remove Google text fragments and other URL fragments
            const url = new URL(href);
            url.hash = ''; // Remove everything after #
            url.search = ''; // Remove query parameters
            
            // Only accept US Twitter/X domains
            if (url.hostname !== 'twitter.com' && url.hostname !== 'www.twitter.com' && 
                url.hostname !== 'x.com' && url.hostname !== 'www.x.com') {
              return null; // Skip non-US Twitter/X domains
            }
            
            return url.toString();
          })
          .filter(href => href !== null) // Remove filtered out non-US domains
          .filter((href, index, arr) => arr.indexOf(href) === index) // Remove duplicates
          .slice(0, 5);
      });
      
      return twitterUrls;
    } catch (error) {
      console.log(`   Failed to extract Twitter/X URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Extract Instagram URLs from Google search results
   */
  static async extractInstagramUrls(page: any, searchTerm: string): Promise<string[]> {
    try {
      const instagramUrls = await page.$$eval('a[href*="instagram.com"]', (links: any[]) => {
        return links
          .map(link => link.href)
          .filter(href => 
            href.includes('instagram.com') && 
            !href.includes('/accounts/') &&
            !href.includes('/explore/')
          )
          .map(href => {
            // Remove Google text fragments and other URL fragments
            const url = new URL(href);
            url.hash = ''; // Remove everything after #
            url.search = ''; // Remove query parameters (?hl=en, ?locale=it, etc.)
            
            // Only accept US Instagram domains
            if (url.hostname !== 'instagram.com' && url.hostname !== 'www.instagram.com') {
              return null; // Skip non-US Instagram domains
            }
            
            // Normalize to www.instagram.com and clean path
            url.hostname = 'www.instagram.com';
            
            // Remove sub-sections like /reels/, /tagged/, /following/ etc.
            // Keep only the main profile path: /username/
            const pathParts = url.pathname.split('/').filter(part => part);
            if (pathParts.length >= 1) {
              // Validate that this is actually a username, not a generic Instagram path
              const username = pathParts[0];
              
              // Skip generic Instagram paths
              if (username === 'reel' || username === 'p' || username === 'tv' || 
                  username === 'stories' || username === 'direct' || username === 'reels' ||
                  username === 'explore' || username === 'accounts' || username === 'about' ||
                  username === 'support' || username === 'press' || username === 'api' ||
                  username === 'privacy' || username === 'terms' || username === 'help') {
                return null;
              }
              
              // Ensure the username looks valid (alphanumeric, dots, underscores)
              if (!/^[a-zA-Z0-9._]+$/.test(username)) {
                return null;
              }
              
              url.pathname = `/${username}/`; // Keep only /username/
            } else {
              // No username found, skip this URL
              return null;
            }
            
            return url.toString();
          })
          .filter(href => href !== null) // Remove filtered out URLs
          .filter((href, index, arr) => arr.indexOf(href) === index) // Remove duplicates
          .slice(0, 5);
      });
      
      return instagramUrls;
    } catch (error) {
      console.log(`   Failed to extract Instagram URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  static async checkFacebook(searchTerms: string[], options: any, domain: string) {
    const { timeout = this.DEFAULT_TIMEOUT } = options;
    let browser = null;
    
    try {
      console.log(`🔍 Starting Facebook search: ${searchTerms.join(', ')}`);
      
      browser = await chromium.launch({
        headless: true,
        args: [
          // Core stealth arguments
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          
          // Additional stealth arguments
          '--no-first-run',
          '--no-service-autorun',
          '--no-default-browser-check',
          '--password-store=basic',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-plugins',
          '--disable-background-networking',
          '--disable-plugins-discovery',
          '--disable-preconnect',
          
          // Performance and memory
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          
          // Media and WebGL
          '--enable-webgl',
          '--use-gl=swiftshader',
          '--enable-accelerated-2d-canvas',
          
          // Network and security
          '--ignore-certificate-errors',
          '--ignore-ssl-errors=yes',
          '--ignore-certificate-errors-spki-list',
          '--ignore-certificate-errors-sp-list'
        ]
      });
      
      const randomUserAgent = this.getRandomUserAgent();
      const randomViewport = this.getRandomViewport();
      const randomTimezone = this.getRandomTimezone();
      const randomGeolocation = this.getRandomGeolocation();
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: randomGeolocation,
        permissions: ['geolocation'],
        userAgent: randomUserAgent,
        viewport: randomViewport,
        timezoneId: randomTimezone,
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
        hasTouch: false,
        isMobile: false,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const page = await context.newPage();
      await this.addStealthScripts(page);
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: facebook ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=facebook+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          await this.simulateHumanMovement(page);
          await this.addRandomDelay(1000, 3000);
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await this.addRandomDelay(1000, 2000);
            await consentButton.click();
            await page.waitForLoadState('networkidle');
            await this.addRandomDelay(1000, 2000);
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="facebook.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await this.addRandomDelay(2000, 4000);
          await this.simulateScrolling(page);
          
          // Extract Facebook URLs
          const facebookUrls = await this.extractFacebookUrls(page, term);
          console.log(`   Found ${facebookUrls.length} Facebook URLs: ${facebookUrls.join(', ')}`);
          
          if (facebookUrls.length > 0) {
            const validUrls = await this.validateSocialMediaUrls(facebookUrls.slice(0, 3), options);
            if (validUrls.length > 0) {
              console.log(`✅ Found ${validUrls.length} valid Facebook pages: ${validUrls.join(', ')}`);
              return {
                platform: 'facebook',
                urls: validUrls,
                exists: true,
                verified: false
              };
            }
          }
          
          await this.addRandomDelay(3000, 7000);
        } catch (error) {
          console.log(`⚠️ Facebook search failed for term "${term}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }
    } catch (error) {
      console.log(`⚠️ Facebook browser error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return { platform: 'facebook', exists: false, verified: false };
  }

  static async checkTwitter(searchTerms: string[], options: any) {
    const { timeout = this.DEFAULT_TIMEOUT } = options;
    let browser = null;
    
    try {
      console.log(`🔍 Starting Twitter/X search: ${searchTerms.join(', ')}`);
      
      browser = await chromium.launch({
        headless: true,
        args: [
          // Core stealth arguments
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          
          // Additional stealth arguments
          '--no-first-run',
          '--no-service-autorun',
          '--no-default-browser-check',
          '--password-store=basic',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-plugins',
          '--disable-background-networking',
          '--disable-plugins-discovery',
          '--disable-preconnect',
          
          // Performance and memory
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          
          // Media and WebGL
          '--enable-webgl',
          '--use-gl=swiftshader',
          '--enable-accelerated-2d-canvas',
          
          // Network and security
          '--ignore-certificate-errors',
          '--ignore-ssl-errors=yes',
          '--ignore-certificate-errors-spki-list',
          '--ignore-certificate-errors-sp-list'
        ]
      });
      
      const randomUserAgent = this.getRandomUserAgent();
      const randomViewport = this.getRandomViewport();
      const randomTimezone = this.getRandomTimezone();
      const randomGeolocation = this.getRandomGeolocation();
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: randomGeolocation,
        permissions: ['geolocation'],
        userAgent: randomUserAgent,
        viewport: randomViewport,
        timezoneId: randomTimezone,
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
        hasTouch: false,
        isMobile: false,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const page = await context.newPage();
      await this.addStealthScripts(page);
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: twitter ${term} OR x.com ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=twitter+${encodeURIComponent(term)}+OR+x.com+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          await this.simulateHumanMovement(page);
          await this.addRandomDelay(1000, 3000);
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await this.addRandomDelay(1000, 2000);
            await consentButton.click();
            await page.waitForLoadState('networkidle');
            await this.addRandomDelay(1000, 2000);
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="twitter.com"], a[href*="x.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await this.addRandomDelay(2000, 4000);
          await this.simulateScrolling(page);
          
          // Extract Twitter/X URLs
          const twitterUrls = await this.extractTwitterUrls(page, term);
          console.log(`   Found ${twitterUrls.length} Twitter/X URLs: ${twitterUrls.join(', ')}`);
          
          if (twitterUrls.length > 0) {
            const validUrls = await this.validateSocialMediaUrls(twitterUrls.slice(0, 3), options);
            if (validUrls.length > 0) {
              console.log(`✅ Found ${validUrls.length} valid Twitter/X pages: ${validUrls.join(', ')}`);
              return {
                platform: 'x',
                urls: validUrls,
                exists: true,
                verified: false
              };
            }
          }
          
          await this.addRandomDelay(3000, 7000);
        } catch (error) {
          console.log(`⚠️ Twitter/X search failed for term "${term}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }
    } catch (error) {
      console.log(`⚠️ Twitter/X browser error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return { platform: 'x', exists: false, verified: false };
  }

  static async checkInstagram(searchTerms: string[], options: any) {
    const { timeout = this.DEFAULT_TIMEOUT } = options;
    let browser = null;
    
    try {
      console.log(`🔍 Starting Instagram search: ${searchTerms.join(', ')}`);
      
      browser = await chromium.launch({
        headless: true,
        args: [
          // Core stealth arguments
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          
          // Additional stealth arguments
          '--no-first-run',
          '--no-service-autorun',
          '--no-default-browser-check',
          '--password-store=basic',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--disable-domain-reliability',
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-default-apps',
          '--disable-plugins',
          '--disable-background-networking',
          '--disable-plugins-discovery',
          '--disable-preconnect',
          
          // Performance and memory
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          
          // Media and WebGL
          '--enable-webgl',
          '--use-gl=swiftshader',
          '--enable-accelerated-2d-canvas',
          
          // Network and security
          '--ignore-certificate-errors',
          '--ignore-ssl-errors=yes',
          '--ignore-certificate-errors-spki-list',
          '--ignore-certificate-errors-sp-list'
        ]
      });
      
      const randomUserAgent = this.getRandomUserAgent();
      const randomViewport = this.getRandomViewport();
      const randomTimezone = this.getRandomTimezone();
      const randomGeolocation = this.getRandomGeolocation();
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: randomGeolocation,
        permissions: ['geolocation'],
        userAgent: randomUserAgent,
        viewport: randomViewport,
        timezoneId: randomTimezone,
        deviceScaleFactor: Math.random() > 0.5 ? 1 : 2,
        hasTouch: false,
        isMobile: false,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });
      
      const page = await context.newPage();
      await this.addStealthScripts(page);
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: instagram ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=instagram+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          await this.simulateHumanMovement(page);
          await this.addRandomDelay(1000, 3000);
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await this.addRandomDelay(1000, 2000);
            await consentButton.click();
            await page.waitForLoadState('networkidle');
            await this.addRandomDelay(1000, 2000);
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="instagram.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await this.addRandomDelay(2000, 4000);
          await this.simulateScrolling(page);
          
          // Extract Instagram URLs
          const instagramUrls = await this.extractInstagramUrls(page, term);
          console.log(`   Found ${instagramUrls.length} Instagram URLs: ${instagramUrls.join(', ')}`);
          
          if (instagramUrls.length > 0) {
            const validUrls = await this.validateSocialMediaUrls(instagramUrls.slice(0, 3), options);
            if (validUrls.length > 0) {
              console.log(`✅ Found ${validUrls.length} valid Instagram pages: ${validUrls.join(', ')}`);
              return {
                platform: 'instagram',
                urls: validUrls,
                exists: true,
                verified: false
              };
            }
          }
          
          await this.addRandomDelay(3000, 7000);
        } catch (error) {
          console.log(`⚠️ Instagram search failed for term "${term}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
      }
    } catch (error) {
      console.log(`⚠️ Instagram browser error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
    
    return { platform: 'instagram', exists: false, verified: false };
  }

  static calculateCredibilityScore(profiles: any[]): number {
    let score = 0;
    const activeProfiles = profiles.filter(p => p.exists);
    
    // Base score for having profiles
    score += activeProfiles.length * 15; // 15 points per platform
    
    // Bonus for verified profiles
    const verifiedCount = activeProfiles.filter(p => p.verified).length;
    score += verifiedCount * 10; // 10 extra points for verified
    
    // Bonus for having multiple platforms (consistency)
    if (activeProfiles.length >= 2) score += 20;
    if (activeProfiles.length >= 3) score += 15;
    if (activeProfiles.length === 4) score += 10; // All platforms
    
    // Cap at 100
    return Math.min(score, 100);
  }

  static generateVettingAssessment(profiles: any[], totalProfiles: number, verifiedProfiles: number): string[] {
    const assessments: string[] = [];
    const existingPlatforms = profiles.filter(p => p.exists).map(p => p.platform);
    const missingPlatforms = ['linkedin', 'facebook', 'x', 'instagram'].filter(p => !existingPlatforms.includes(p));
    
    if (totalProfiles === 0) {
      assessments.push('⚠️ No social media presence detected - may indicate limited digital footprint or new business');
    } else {
      if (verifiedProfiles === 0) {
        assessments.push('⚠️ No verified social media profiles found - unable to confirm authenticity');
      }
      
      if (totalProfiles === 1) {
        assessments.push('⚠️ Limited social media presence - only found on one platform');
      } else if (totalProfiles >= 2) {
        assessments.push('✅ Multiple platform presence indicates established digital footprint');
      }
      
      if (missingPlatforms.includes('linkedin')) {
        assessments.push('⚠️ No LinkedIn presence found - uncommon for legitimate businesses');
      }
    }
    
    // Risk assessment
    if (totalProfiles === 0) {
      assessments.push('🔴 HIGH RISK: No social media verification possible');
    } else if (totalProfiles === 1 && verifiedProfiles === 0) {
      assessments.push('🟡 MEDIUM RISK: Limited unverified social presence');
    } else if (totalProfiles >= 2) {
      assessments.push('🟢 LOW RISK: Established social media presence');
    }
    
         return assessments;
   }

  /**
   * Get a random user agent from the pool
   */
  static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  /**
   * Get a random viewport size
   */
  static getRandomViewport() {
    return this.VIEWPORT_SIZES[Math.floor(Math.random() * this.VIEWPORT_SIZES.length)];
  }

  /**
   * Get a random timezone
   */
  static getRandomTimezone(): string {
    return this.TIMEZONES[Math.floor(Math.random() * this.TIMEZONES.length)];
  }

  /**
   * Get a random geolocation
   */
  static getRandomGeolocation() {
    return this.GEOLOCATIONS[Math.floor(Math.random() * this.GEOLOCATIONS.length)];
  }

  /**
   * Add stealth scripts to remove automation detection
   */
  static async addStealthScripts(page: any): Promise<void> {
    // Remove webdriver property
    await page.addInitScript(() => {
      // Remove navigator.webdriver flag
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Remove chrome.runtime
      if ('chrome' in window) {
        // @ts-ignore
        delete window.chrome.runtime;
      }

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: {
              type: "application/x-google-chrome-pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: true,
            },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: {
              type: "application/pdf",
              suffixes: "pdf", 
              description: "",
              enabledPlugin: true,
            },
            description: "",
            filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
            length: 1,
            name: "Chrome PDF Viewer"
          }
        ],
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Override hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4,
      });

      // Override memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8,
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission } as any) :
          originalQuery(parameters)
      );

      // Override screen properties
      Object.defineProperty(screen, 'colorDepth', {
        get: () => 24,
      });

      Object.defineProperty(screen, 'pixelDepth', {
        get: () => 24,
      });
    });
  }

  /**
   * Add human-like delays between actions
   */
  static async addRandomDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate human-like mouse movement
   */
  static async simulateHumanMovement(page: any): Promise<void> {
    // Random mouse movements to simulate human behavior
    const movements = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < movements; i++) {
      const x = Math.floor(Math.random() * 800) + 100;
      const y = Math.floor(Math.random() * 600) + 100;
      
      await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5) + 5 });
      await this.addRandomDelay(500, 1500);
    }
  }

  /**
   * Simulate realistic page scrolling
   */
  static async simulateScrolling(page: any): Promise<void> {
    // Random scroll to simulate reading behavior
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    
    await page.evaluate((amount: number) => {
      window.scrollBy({
        top: amount,
        left: 0,
        behavior: 'smooth'
      });
    }, scrollAmount);
    
    await this.addRandomDelay(1000, 3000);
  }

  /**
   * Enhanced retry logic with exponential backoff for bot detection
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 5000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 2000;
          console.log(`   Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.log(`   Attempt ${attempt + 1} failed: ${lastError.message}`);
        
        // Check if this is likely a bot detection error
        if (this.isBotDetectionError(lastError)) {
          console.log(`   Bot detection suspected, using longer backoff`);
          await this.addRandomDelay(10000, 20000); // Longer delay for bot detection
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Detect if an error is likely due to bot detection
   */
  static isBotDetectionError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const botDetectionKeywords = [
      'timeout',
      'connection',
      'network',
      'captcha',
      'blocked',
      'access denied',
      'forbidden',
      'too many requests',
      'rate limit',
      'suspicious',
      'automation detected'
    ];
    
    return botDetectionKeywords.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * Check if page indicates bot detection and take appropriate action
   */
  static async handleBotDetection(page: any): Promise<boolean> {
    try {
      // Check for common bot detection indicators
      const botDetectionSelectors = [
        'text=Access denied',
        'text=Captcha',
        'text=Please verify',
        'text=Too many requests',
        'text=Unusual traffic',
        '[id*="captcha"]',
        '[class*="captcha"]',
        '[id*="challenge"]',
        '[class*="challenge"]'
      ];
      
      for (const selector of botDetectionSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`   Bot detection detected: ${selector}`);
          
          // Take a screenshot for debugging
          const timestamp = Date.now();
          await page.screenshot({ 
            path: `bot-detection-${timestamp}.png`,
            fullPage: true 
          });
          console.log(`   Screenshot saved: bot-detection-${timestamp}.png`);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log(`   Error checking for bot detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Enhanced error recovery with adaptive strategies
   */
  static async recoverFromError(page: any, error: Error): Promise<boolean> {
    try {
      console.log(`   Attempting error recovery from: ${error.message}`);
      
      // Check if page is still accessible
      const isAccessible = await page.evaluate(() => document.readyState).catch(() => false);
      if (!isAccessible) {
        console.log(`   Page not accessible, cannot recover`);
        return false;
      }
      
      // Check for bot detection
      const hasBotDetection = await this.handleBotDetection(page);
      if (hasBotDetection) {
        // If bot detection is present, wait longer and try a different approach
        await this.addRandomDelay(15000, 30000);
        
        // Try to refresh the page with new fingerprint
        await page.reload({ waitUntil: 'networkidle' });
        await this.simulateHumanMovement(page);
        await this.addRandomDelay(3000, 6000);
        
        return true;
      }
      
      // For network errors, wait and retry
      if (this.isBotDetectionError(error)) {
        await this.addRandomDelay(5000, 10000);
        return true;
      }
      
      return false;
    } catch (recoveryError) {
      console.log(`   Error recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
      return false;
    }
  }
 } 