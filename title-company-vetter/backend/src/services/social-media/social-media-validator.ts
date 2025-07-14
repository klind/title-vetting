import fetch from 'node-fetch';
import { chromium } from 'playwright';

/**
 * Social Media Validator for checking social media presence
 */
export class SocialMediaValidator {
  static DEFAULT_TIMEOUT = 10000;
  static DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; TitleCompanyVetter/1.0)';

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
      userAgent = this.DEFAULT_USER_AGENT,
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
    // Only use the base domain as the search term
    const domainParts = domain.split('.');
    const baseDomain = domainParts[0];
    return [baseDomain];
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
      
      // Launch browser with stealth settings
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      // Create context with US geo-location to avoid GDPR
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: { longitude: -74.006, latitude: 40.7128 }, // NYC
        permissions: ['geolocation'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      
      // Set viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Try each search term
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: linkedin ${term}`);
          
          // Navigate to Google search with US parameters
          const searchUrl = `https://www.google.com/search?q=linkedin+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          console.log(`   Navigated to: ${searchUrl}`);
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            console.log(`   Accepting Google consent...`);
            await consentButton.click();
            await page.waitForLoadState('networkidle');
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
          
          // Wait a bit for results to load
          await page.waitForTimeout(2000);
          
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
          
          // Add delay between searches
          await page.waitForTimeout(2000);
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
    const { timeout = this.DEFAULT_TIMEOUT, userAgent = this.DEFAULT_USER_AGENT } = options;

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
    const { timeout = this.DEFAULT_TIMEOUT, userAgent = this.DEFAULT_USER_AGENT } = options;

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
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: { longitude: -74.006, latitude: 40.7128 },
        permissions: ['geolocation'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: facebook ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=facebook+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await consentButton.click();
            await page.waitForLoadState('networkidle');
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="facebook.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await page.waitForTimeout(2000);
          
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
          
          await page.waitForTimeout(2000);
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
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: { longitude: -74.006, latitude: 40.7128 },
        permissions: ['geolocation'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: twitter ${term} OR x.com ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=twitter+${encodeURIComponent(term)}+OR+x.com+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await consentButton.click();
            await page.waitForLoadState('networkidle');
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="twitter.com"], a[href*="x.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await page.waitForTimeout(2000);
          
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
          
          await page.waitForTimeout(2000);
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
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const context = await browser.newContext({
        locale: 'en-US',
        geolocation: { longitude: -74.006, latitude: 40.7128 },
        permissions: ['geolocation'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      for (const term of searchTerms) {
        try {
          console.log(`🔍 Searching Google for: instagram ${term}`);
          
          const searchUrl = `https://www.google.com/search?q=instagram+${encodeURIComponent(term)}&gl=us&hl=en`;
          await page.goto(searchUrl, { waitUntil: 'networkidle', timeout });
          
          // Handle consent if it appears
          const consentButton = page.locator('button:has-text("Accept all")').first();
          if (await consentButton.isVisible()) {
            await consentButton.click();
            await page.waitForLoadState('networkidle');
          }
          
          // Wait for search results
          try {
            await page.waitForSelector('a[href*="instagram.com"]', { timeout: 5000 });
          } catch {
            continue;
          }
          
          await page.waitForTimeout(2000);
          
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
          
          await page.waitForTimeout(2000);
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
 } 