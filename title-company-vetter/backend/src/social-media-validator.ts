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
    const recommendations = this.generateRecommendations(profiles, totalProfiles, verifiedProfiles);

    console.log(`✅ Social media validation complete: ${totalProfiles} profiles found, ${verifiedProfiles} verified`);

    return {
      profiles,
      totalProfiles,
      verifiedProfiles,
      hasConsistentPresence,
      credibilityScore,
      recommendations
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
                url: validUrls[0], // Primary URL for backward compatibility
                urls: validUrls, // Return all valid URLs
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

  // Placeholder methods - will be implemented in next part
  static async extractLinkedInUrlsWithPlaywright(page: any, searchTerm: string): Promise<string[]> {
    // Implementation will be added
    return [];
  }

  static async validateLinkedInUrls(urls: string[], options: any): Promise<string[]> {
    // Implementation will be added
    return [];
  }

  static async checkFacebook(searchTerms: string[], options: any, domain: string) {
    // Implementation will be added
    return { platform: 'facebook', exists: false, verified: false };
  }

  static async checkTwitter(searchTerms: string[], options: any) {
    // Implementation will be added
    return { platform: 'x', exists: false, verified: false };
  }

  static async checkInstagram(searchTerms: string[], options: any) {
    // Implementation will be added
    return { platform: 'instagram', exists: false, verified: false };
  }

  static calculateCredibilityScore(profiles: any[]): number {
    // Implementation will be added
    return 0;
  }

  static generateRecommendations(profiles: any[], totalProfiles: number, verifiedProfiles: number): string[] {
    // Implementation will be added
    return [];
  }
} 