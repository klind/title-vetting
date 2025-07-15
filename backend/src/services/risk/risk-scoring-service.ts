import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import {
  RiskConfiguration,
  RiskAssessmentResult,
  CategoryRiskAssessment,
  RiskFactor,
  RiskLevel,
  RiskEvaluationContext,
  RiskRule,
  RiskFactorCategory,
  validateRiskConfiguration,
  getRiskLevelFromScore
} from '../../types/risk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Risk scoring service for calculating comprehensive risk scores
 */
export class RiskScoringService {
  private config: RiskConfiguration | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || join(__dirname, '../../../risk-config.json');
  }

  /**
   * Load risk configuration from JSON file
   */
  async loadConfiguration(): Promise<RiskConfiguration> {
    if (this.config) {
      return this.config;
    }

    try {
      const configData = await readFile(this.configPath, 'utf-8');
      const rawConfig = JSON.parse(configData);
      this.config = validateRiskConfiguration(rawConfig);
      return this.config;
    } catch (error) {
      console.error('Failed to load risk configuration:', error);
      throw new Error(`Failed to load risk configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reload configuration from file (useful for updates)
   */
  async reloadConfiguration(): Promise<RiskConfiguration> {
    this.config = null;
    return this.loadConfiguration();
  }

  /**
   * Perform comprehensive risk assessment
   */
  async assessRisk(context: RiskEvaluationContext): Promise<RiskAssessmentResult> {
    const config = await this.loadConfiguration();

    // Assess each category
    const whoisAssessment = this.assessCategoryRisk('whois', context, config);
    const websiteAssessment = this.assessCategoryRisk('website', context, config);
    const socialMediaAssessment = this.assessCategoryRisk('socialMedia', context, config);

    // Calculate weighted combined score
    const combinedScore = this.calculateCombinedScore(
      whoisAssessment,
      websiteAssessment,
      socialMediaAssessment,
      config
    );

    // Collect all factors
    const allFactors: RiskFactor[] = [
      ...whoisAssessment.factors,
      ...websiteAssessment.factors,
      ...socialMediaAssessment.factors
    ];

    // Get only contributing factors (triggered ones)
    const contributingFactors = allFactors.filter(factor => factor.triggered);

    // Determine overall risk level
    const riskLevel = getRiskLevelFromScore(combinedScore, config.scoring.maxScore, config.scoring);

    return {
      overallScore: combinedScore,
      maxScore: config.scoring.maxScore,
      riskLevel,
      whoisAssessment,
      websiteAssessment,
      socialMediaAssessment,
      allFactors,
      contributingFactors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Assess risk for a specific category
   */
  private assessCategoryRisk(
    category: 'whois' | 'website' | 'socialMedia',
    context: RiskEvaluationContext,
    config: RiskConfiguration
  ): CategoryRiskAssessment {
    const categoryConfig = this.getCategoryConfig(category, config);
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Evaluate each factor category
    for (const [factorId, factorConfig] of Object.entries(categoryConfig)) {
      if (!factorConfig.enabled) continue;

      const categoryFactors = this.evaluateFactorCategory(
        factorId,
        category,
        factorConfig,
        context,
        config
      );

      factors.push(...categoryFactors);
      totalScore += categoryFactors
        .filter(f => f.triggered)
        .reduce((sum, f) => sum + f.score, 0);
    }

    // Cap the score at max
    const cappedScore = Math.min(totalScore, config.scoring.maxScore);
    const riskLevel = getRiskLevelFromScore(cappedScore, config.scoring.maxScore, config.scoring);
    const contributingFactors = factors.filter(f => f.triggered);

    return {
      category,
      score: cappedScore,
      maxScore: config.scoring.maxScore,
      riskLevel,
      factors,
      contributingFactors
    };
  }

  /**
   * Get configuration for a specific category
   */
  private getCategoryConfig(category: 'whois' | 'website' | 'socialMedia', config: RiskConfiguration): Record<string, RiskFactorCategory> {
    switch (category) {
      case 'whois':
        return config.whoisRiskFactors;
      case 'website':
        return config.websiteRiskFactors;
      case 'socialMedia':
        return config.socialMediaRiskFactors;
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  /**
   * Evaluate a specific factor category
   */
  private evaluateFactorCategory(
    factorId: string,
    category: string,
    factorConfig: RiskFactorCategory,
    context: RiskEvaluationContext,
    config: RiskConfiguration
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];

    for (const rule of factorConfig.rules) {
      const factor = this.evaluateRule(factorId, category, rule, context, config);
      factors.push(factor);
    }

    return factors;
  }

  /**
   * Evaluate a specific rule
   */
  private evaluateRule(
    factorId: string,
    category: string,
    rule: RiskRule,
    context: RiskEvaluationContext,
    config: RiskConfiguration
  ): RiskFactor {
    const factor: RiskFactor = {
      id: `${category}_${factorId}_${rule.condition}`,
      category,
      condition: rule.condition,
      score: rule.score,
      description: rule.description,
      triggered: false
    };

    try {
      const triggered = this.evaluateCondition(rule, context, config);
      factor.triggered = triggered;
    } catch (error) {
      console.warn(`Failed to evaluate rule ${factor.id}:`, error);
      factor.triggered = false;
    }

    return factor;
  }

  /**
   * Evaluate a specific condition
   */
  private evaluateCondition(
    rule: RiskRule,
    context: RiskEvaluationContext,
    config: RiskConfiguration
  ): boolean {
    const { condition, value } = rule;
    const { whoisData, websiteData, socialMediaData, registrarData } = context;

    switch (condition) {
      // WHOIS conditions
      case 'lessThan':
        return this.evaluateDomainAge(whoisData?.creationDate, value);
      
      case 'expiresWithin':
        return this.evaluateDomainExpiration(whoisData?.expirationDate, value);
      
      case 'hasPrivacyProtection':
        return Boolean(whoisData?.hasPrivacyProtection);
      
      case 'missingRegistrantEmail':
        return !whoisData?.registrantEmail;
      
      case 'missingRegistrantPhone':
        return !whoisData?.registrantPhone;
      
      case 'missingRegistrantName':
        return !whoisData?.registrantName;
      
      case 'missingAdminContact':
        return !whoisData?.adminEmail && !whoisData?.adminPhone && !whoisData?.adminName;
      
      case 'nonWesternCountry':
        return this.isNonWesternCountry(whoisData?.registrantCountry, config);
      
      case 'highRiskCountry':
        return this.isHighRiskCountry(whoisData?.registrantCountry, config);
      
      case 'registrarScoreBelow':
        return (registrarData?.reputationScore || 0) < (value || 0);
      
      case 'unknownRegistrar':
        return !registrarData?.isKnown;

      // Website conditions
      case 'noSSL':
        return !websiteData?.hasSSL;
      
      case 'selfSignedSSL':
        return Boolean(websiteData?.sslSelfSigned);
      
      case 'expiredSSL':
        return Boolean(websiteData?.sslExpired);
      
      case 'invalidSSL':
        return !websiteData?.sslValid;
      
      case 'notAccessible':
        return !websiteData?.isAccessible;
      
      case 'noDNS':
        return !websiteData?.hasDNS;
      
      case 'noWebsite':
        return !websiteData?.hasWebsite;
      
      case 'suspiciousPattern':
        return Boolean(websiteData?.suspiciousPatterns?.length);
      
      case 'maliciousTLD':
        return Boolean(websiteData?.maliciousTLD);
      
      case 'typosquatting':
        return Boolean(websiteData?.typosquatting);
      
      case 'homographAttack':
        return Boolean(websiteData?.homographAttack);
      
      case 'noContactInfo':
        return !websiteData?.contactInfo?.hasContactInfo;
      
      case 'invalidEmail':
        return !websiteData?.contactInfo?.validEmails;
      
      case 'noPhoneNumber':
        return !websiteData?.contactInfo?.hasPhoneNumber;
      
      case 'missingAddress':
        return !websiteData?.contactInfo?.hasAddress;

      // Social Media conditions
      case 'noSocialMedia':
        return !socialMediaData?.platforms?.length;
      
      case 'limitedPresence':
        return (socialMediaData?.platforms?.length || 0) < 2;
      
      case 'inconsistentProfiles':
        return (socialMediaData?.presenceScore || 0) < 50;
      
      case 'credibilityScoreBelow':
        return (socialMediaData?.credibilityScore || 0) < (value || 0);
      
      case 'noVerifiedAccounts':
        return !socialMediaData?.hasVerifiedAccounts;
      
      case 'suspiciousAccounts':
        return Boolean(socialMediaData?.suspiciousAccounts);
      
      case 'botDetected':
        return Boolean(socialMediaData?.botDetected);

      default:
        console.warn(`Unknown condition: ${condition}`);
        return false;
    }
  }

  /**
   * Evaluate domain age condition
   */
  private evaluateDomainAge(creationDate?: string, days?: number): boolean {
    if (!creationDate || !days) return false;
    
    const created = new Date(creationDate);
    const now = new Date();
    const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff < days;
  }

  /**
   * Evaluate domain expiration condition
   */
  private evaluateDomainExpiration(expirationDate?: string, days?: number): boolean {
    if (!expirationDate || !days) return false;
    
    const expiry = new Date(expirationDate);
    const now = new Date();
    const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff < days && daysDiff > 0;
  }

  /**
   * Check if country is non-Western
   */
  private isNonWesternCountry(country?: string, config?: RiskConfiguration): boolean {
    if (!country || !config) return false;
    return !config.countries.western.includes(country.toUpperCase());
  }

  /**
   * Check if country is high risk
   */
  private isHighRiskCountry(country?: string, config?: RiskConfiguration): boolean {
    if (!country || !config) return false;
    return config.countries.highRisk.includes(country.toUpperCase());
  }

  /**
   * Calculate combined weighted score
   */
  private calculateCombinedScore(
    whoisAssessment: CategoryRiskAssessment,
    websiteAssessment: CategoryRiskAssessment,
    socialMediaAssessment: CategoryRiskAssessment,
    config: RiskConfiguration
  ): number {
    const weights = config.weights;
    
    const weightedScore = (
      (whoisAssessment.score * weights.whois) +
      (websiteAssessment.score * weights.website) +
      (socialMediaAssessment.score * weights.socialMedia)
    );

    return Math.round(weightedScore);
  }

  /**
   * Get risk level description
   */
  getRiskLevelDescription(level: RiskLevel): string {
    switch (level) {
      case RiskLevel.LOW:
        return 'Low risk - Generally safe to proceed';
      case RiskLevel.MEDIUM:
        return 'Medium risk - Exercise caution and additional verification';
      case RiskLevel.HIGH:
        return 'High risk - Significant concerns identified, thorough review required';
      case RiskLevel.CRITICAL:
        return 'Critical risk - Major red flags, avoid or conduct extensive due diligence';
      default:
        return 'Unknown risk level';
    }
  }

  /**
   * Get recommendations based on risk level
   */
  getRecommendations(assessment: RiskAssessmentResult): string[] {
    const recommendations: string[] = [];

    if (assessment.riskLevel === RiskLevel.LOW) {
      recommendations.push('Risk level is acceptable for most transactions');
    } else {
      recommendations.push('Additional verification recommended before proceeding');
    }

    // Add specific recommendations based on contributing factors
    const factorTypes = assessment.contributingFactors.map(f => f.condition);

    if (factorTypes.includes('lessThan')) {
      recommendations.push('Verify the legitimacy of this recently registered domain');
    }

    if (factorTypes.includes('hasPrivacyProtection')) {
      recommendations.push('Consider requesting disclosure of actual domain owner information');
    }

    if (factorTypes.includes('noSSL') || factorTypes.includes('invalidSSL')) {
      recommendations.push('Investigate the website security configuration');
    }

    if (factorTypes.includes('noSocialMedia')) {
      recommendations.push('Verify the company through alternative channels');
    }

    if (factorTypes.includes('registrarScoreBelow')) {
      recommendations.push('Verify the domain registrar reputation');
    }

    return recommendations;
  }
}

/**
 * Default risk scoring service instance
 */
export const riskScoringService = new RiskScoringService();

/**
 * Convenience function to assess risk
 */
export async function assessRisk(context: RiskEvaluationContext): Promise<RiskAssessmentResult> {
  return riskScoringService.assessRisk(context);
}

/**
 * Convenience function to get risk level description
 */
export function getRiskLevelDescription(level: RiskLevel): string {
  return riskScoringService.getRiskLevelDescription(level);
}

/**
 * Convenience function to get recommendations
 */
export function getRecommendations(assessment: RiskAssessmentResult): string[] {
  return riskScoringService.getRecommendations(assessment);
}