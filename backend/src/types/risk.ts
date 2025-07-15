import { z } from 'zod';

/**
 * Risk level enumeration
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Risk condition types for configuration rules
 */
export type RiskCondition = 
  | 'lessThan'
  | 'expiresWithin'
  | 'hasPrivacyProtection'
  | 'missingRegistrantEmail'
  | 'missingRegistrantPhone'
  | 'missingRegistrantName'
  | 'missingAdminContact'
  | 'nonWesternCountry'
  | 'highRiskCountry'
  | 'registrarScoreBelow'
  | 'unknownRegistrar'
  | 'noSSL'
  | 'selfSignedSSL'
  | 'expiredSSL'
  | 'invalidSSL'
  | 'notAccessible'
  | 'noDNS'
  | 'noWebsite'
  | 'suspiciousPattern'
  | 'maliciousTLD'
  | 'typosquatting'
  | 'homographAttack'
  | 'noContactInfo'
  | 'invalidEmail'
  | 'noPhoneNumber'
  | 'missingAddress'
  | 'noSocialMedia'
  | 'limitedPresence'
  | 'inconsistentProfiles'
  | 'credibilityScoreBelow'
  | 'noVerifiedAccounts'
  | 'suspiciousAccounts'
  | 'botDetected';

/**
 * Risk rule configuration
 */
export interface RiskRule {
  condition: RiskCondition;
  value?: number;
  score: number;
  description: string;
}

/**
 * Risk factor category configuration
 */
export interface RiskFactorCategory {
  enabled: boolean;
  description: string;
  rules: RiskRule[];
}

/**
 * Risk level configuration
 */
export interface RiskLevelConfig {
  min: number;
  max: number;
}

/**
 * Risk scoring configuration
 */
export interface RiskScoringConfig {
  maxScore: number;
  riskLevels: Record<RiskLevel, RiskLevelConfig>;
}

/**
 * Risk configuration weights
 */
export interface RiskWeights {
  whois: number;
  website: number;
  socialMedia: number;
}

/**
 * Complete risk configuration schema
 */
export interface RiskConfiguration {
  version: string;
  lastUpdated: string;
  scoring: RiskScoringConfig;
  weights: RiskWeights;
  whoisRiskFactors: Record<string, RiskFactorCategory>;
  websiteRiskFactors: Record<string, RiskFactorCategory>;
  socialMediaRiskFactors: Record<string, RiskFactorCategory>;
  countries: {
    western: string[];
    highRisk: string[];
  };
}

/**
 * Risk factor result
 */
export interface RiskFactor {
  id: string;
  category: string;
  condition: RiskCondition;
  score: number;
  description: string;
  triggered: boolean;
  value?: number | string | boolean;
}

/**
 * Risk assessment result for a specific category
 */
export interface CategoryRiskAssessment {
  category: 'whois' | 'website' | 'socialMedia';
  score: number;
  maxScore: number;
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  contributingFactors: RiskFactor[];
}

/**
 * Combined risk assessment result
 */
export interface RiskAssessmentResult {
  overallScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  whoisAssessment: CategoryRiskAssessment;
  websiteAssessment: CategoryRiskAssessment;
  socialMediaAssessment: CategoryRiskAssessment;
  allFactors: RiskFactor[];
  contributingFactors: RiskFactor[];
  timestamp: string;
}

/**
 * Risk evaluation context for passing data to assessment functions
 */
export interface RiskEvaluationContext {
  // WHOIS data
  whoisData?: {
    creationDate?: string;
    expirationDate?: string;
    registrantEmail?: string;
    registrantPhone?: string;
    registrantName?: string;
    adminEmail?: string;
    adminPhone?: string;
    adminName?: string;
    registrantCountry?: string;
    registrar?: string;
    hasPrivacyProtection?: boolean;
  };
  
  // Website data
  websiteData?: {
    hasSSL?: boolean;
    sslValid?: boolean;
    sslSelfSigned?: boolean;
    sslExpired?: boolean;
    isAccessible?: boolean;
    hasDNS?: boolean;
    hasWebsite?: boolean;
    suspiciousPatterns?: string[];
    maliciousTLD?: boolean;
    typosquatting?: boolean;
    homographAttack?: boolean;
    contactInfo?: {
      hasContactInfo?: boolean;
      validEmails?: boolean;
      hasPhoneNumber?: boolean;
      hasAddress?: boolean;
    };
  };
  
  // Social media data
  socialMediaData?: {
    platforms?: string[];
    credibilityScore?: number;
    hasVerifiedAccounts?: boolean;
    suspiciousAccounts?: boolean;
    botDetected?: boolean;
    presenceScore?: number;
  };
  
  // Registrar data
  registrarData?: {
    reputationScore?: number;
    isKnown?: boolean;
  };
}

/**
 * Zod schema for risk configuration validation
 */
export const RiskConfigurationSchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  scoring: z.object({
    maxScore: z.number(),
    riskLevels: z.object({
      low: z.object({ min: z.number(), max: z.number() }),
      medium: z.object({ min: z.number(), max: z.number() }),
      high: z.object({ min: z.number(), max: z.number() }),
      critical: z.object({ min: z.number(), max: z.number() })
    })
  }),
  weights: z.object({
    whois: z.number(),
    website: z.number(),
    socialMedia: z.number()
  }),
  whoisRiskFactors: z.record(z.object({
    enabled: z.boolean(),
    description: z.string(),
    rules: z.array(z.object({
      condition: z.string(),
      value: z.number().optional(),
      score: z.number(),
      description: z.string()
    }))
  })),
  websiteRiskFactors: z.record(z.object({
    enabled: z.boolean(),
    description: z.string(),
    rules: z.array(z.object({
      condition: z.string(),
      value: z.number().optional(),
      score: z.number(),
      description: z.string()
    }))
  })),
  socialMediaRiskFactors: z.record(z.object({
    enabled: z.boolean(),
    description: z.string(),
    rules: z.array(z.object({
      condition: z.string(),
      value: z.number().optional(),
      score: z.number(),
      description: z.string()
    }))
  })),
  countries: z.object({
    western: z.array(z.string()),
    highRisk: z.array(z.string())
  })
});

/**
 * Utility function to determine risk level from score
 */
export function getRiskLevelFromScore(score: number, maxScore: number, config: RiskScoringConfig): RiskLevel {
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= config.riskLevels.critical.min) return RiskLevel.CRITICAL;
  if (percentage >= config.riskLevels.high.min) return RiskLevel.HIGH;
  if (percentage >= config.riskLevels.medium.min) return RiskLevel.MEDIUM;
  return RiskLevel.LOW;
}

/**
 * Utility function to get risk level color for UI
 */
export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case RiskLevel.LOW: return 'green';
    case RiskLevel.MEDIUM: return 'yellow';
    case RiskLevel.HIGH: return 'orange';
    case RiskLevel.CRITICAL: return 'red';
    default: return 'gray';
  }
}

/**
 * Utility function to validate risk configuration
 */
export function validateRiskConfiguration(config: any): RiskConfiguration {
  const result = RiskConfigurationSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid risk configuration: ${result.error.message}`);
  }
  return result.data as RiskConfiguration;
}