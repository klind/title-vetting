/**
 * Registrar Reputation Service
 * 
 * Assesses the reputation and reliability of domain registrars
 * to help identify potentially risky or unreliable registrars.
 */

import { ErrorType, ApiError } from './types.js';

/**
 * Registrar reputation data interface
 */
export interface RegistrarReputation {
  registrar: string;
  ianaId?: string;
  reputation: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  score: number; // 0-100
  riskFactors: string[];
  recommendations: string[];
  lastUpdated: string;
  sources: string[];
}

/**
 * Registrar reputation assessment result
 */
export interface RegistrarAssessment {
  registrar: string;
  ianaId?: string;
  reputation: RegistrarReputation;
  isRisky: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

/**
 * Known registrar reputation database
 */
const REGISTRAR_REPUTATION_DATA: Record<string, RegistrarReputation> = {
  'GoDaddy.com, LLC': {
    registrar: 'GoDaddy.com, LLC',
    ianaId: '146',
    reputation: 'good',
    score: 75,
    riskFactors: [
      'Large registrar with mixed customer service reviews',
      'Some privacy concerns with data collection'
    ],
    recommendations: [
      'Verify domain ownership through multiple channels',
      'Check for additional security measures'
    ],
    lastUpdated: '2024-01-01',
    sources: ['ICANN', 'User Reviews', 'Security Reports']
  },
  'NameCheap, Inc.': {
    registrar: 'NameCheap, Inc.',
    ianaId: '1068',
    reputation: 'excellent',
    score: 90,
    riskFactors: [
      'Generally well-regarded for privacy and security'
    ],
    recommendations: [
      'Standard due diligence recommended'
    ],
    lastUpdated: '2024-01-01',
    sources: ['ICANN', 'User Reviews', 'Security Reports']
  },
  'Google LLC': {
    registrar: 'Google LLC',
    ianaId: '895',
    reputation: 'excellent',
    score: 95,
    riskFactors: [
      'High-profile target for attacks'
    ],
    recommendations: [
      'Standard due diligence recommended'
    ],
    lastUpdated: '2024-01-01',
    sources: ['ICANN', 'User Reviews', 'Security Reports']
  },
  'Cloudflare, Inc.': {
    registrar: 'Cloudflare, Inc.',
    ianaId: '1910',
    reputation: 'excellent',
    score: 92,
    riskFactors: [
      'Generally well-regarded for security'
    ],
    recommendations: [
      'Standard due diligence recommended'
    ],
    lastUpdated: '2024-01-01',
    sources: ['ICANN', 'User Reviews', 'Security Reports']
  },
  'Porkbun LLC': {
    registrar: 'Porkbun LLC',
    ianaId: '1861',
    reputation: 'good',
    score: 80,
    riskFactors: [
      'Smaller registrar with good reputation'
    ],
    recommendations: [
      'Standard due diligence recommended'
    ],
    lastUpdated: '2024-01-01',
    sources: ['ICANN', 'User Reviews', 'Security Reports']
  }
};

/**
 * Suspicious registrar patterns
 */
const SUSPICIOUS_REGISTRARS = [
  'unknown',
  'private',
  'anonymous',
  'hidden',
  'masked',
  'protected'
];

/**
 * Assesses the reputation of a registrar
 * 
 * @param registrar - Registrar name
 * @param ianaId - Registrar IANA ID (optional)
 * @returns Registrar assessment
 */
export async function assessRegistrarReputation(
  registrar: string,
  ianaId?: string
): Promise<RegistrarAssessment> {
  try {
    console.log(`Assessing registrar reputation for: ${registrar} (ID: ${ianaId})`);

    // Check if we have reputation data for this registrar
    const reputation = REGISTRAR_REPUTATION_DATA[registrar];
    
    if (reputation) {
      return createAssessment(registrar, ianaId, reputation);
    }

    // Check for suspicious patterns
    const isSuspicious = SUSPICIOUS_REGISTRARS.some(pattern => 
      registrar.toLowerCase().includes(pattern.toLowerCase())
    );

    if (isSuspicious) {
      const suspiciousReputation: RegistrarReputation = {
        registrar,
        ianaId,
        reputation: 'poor',
        score: 20,
        riskFactors: [
          'Registrar name contains suspicious patterns',
          'May be using privacy protection or proxy services'
        ],
        recommendations: [
          'Verify actual domain ownership',
          'Request additional verification',
          'Check for legitimate business presence'
        ],
        lastUpdated: new Date().toISOString(),
        sources: ['Pattern Analysis']
      };

      return createAssessment(registrar, ianaId, suspiciousReputation);
    }

    // Unknown registrar - default assessment
    const unknownReputation: RegistrarReputation = {
      registrar,
      ianaId,
      reputation: 'unknown',
      score: 50,
      riskFactors: [
        'Registrar not in known reputation database',
        'Limited information available'
      ],
      recommendations: [
        'Conduct additional research on registrar',
        'Verify domain ownership through multiple channels',
        'Check for legitimate business presence'
      ],
      lastUpdated: new Date().toISOString(),
      sources: ['Default Assessment']
    };

    return createAssessment(registrar, ianaId, unknownReputation);

  } catch (error) {
    console.error('Error assessing registrar reputation:', error);
    
    // Return default assessment on error
    const errorReputation: RegistrarReputation = {
      registrar,
      ianaId,
      reputation: 'unknown',
      score: 50,
      riskFactors: [
        'Error occurred during reputation assessment'
      ],
      recommendations: [
        'Manual verification recommended'
      ],
      lastUpdated: new Date().toISOString(),
      sources: ['Error Assessment']
    };

    return createAssessment(registrar, ianaId, errorReputation);
  }
}

/**
 * Creates a registrar assessment from reputation data
 * 
 * @param registrar - Registrar name
 * @param ianaId - Registrar IANA ID
 * @param reputation - Reputation data
 * @returns Registrar assessment
 */
function createAssessment(
  registrar: string,
  ianaId: string | undefined,
  reputation: RegistrarReputation
): RegistrarAssessment {
  const isRisky = reputation.score < 50;
  const riskLevel = reputation.score >= 80 ? 'low' : 
                   reputation.score >= 60 ? 'medium' : 'high';

  const warnings: string[] = [];
  
  if (reputation.score < 50) {
    warnings.push('High risk registrar - additional verification required');
  } else if (reputation.score < 70) {
    warnings.push('Medium risk registrar - standard verification recommended');
  }

  if (reputation.riskFactors.length > 0) {
    warnings.push(...reputation.riskFactors);
  }

  return {
    registrar,
    ianaId,
    reputation,
    isRisky,
    riskLevel,
    warnings
  };
}

/**
 * Updates registrar reputation data
 * 
 * @param registrar - Registrar name
 * @param reputation - New reputation data
 */
export function updateRegistrarReputation(
  registrar: string,
  reputation: Partial<RegistrarReputation>
): void {
  const existing = REGISTRAR_REPUTATION_DATA[registrar];
  
  if (existing) {
    REGISTRAR_REPUTATION_DATA[registrar] = {
      ...existing,
      ...reputation,
      lastUpdated: new Date().toISOString()
    };
  } else {
    REGISTRAR_REPUTATION_DATA[registrar] = {
      registrar,
      reputation: 'unknown',
      score: 50,
      riskFactors: [],
      recommendations: [],
      lastUpdated: new Date().toISOString(),
      sources: ['Manual Update'],
      ...reputation
    };
  }
}

/**
 * Gets all registrar reputation data
 * 
 * @returns All registrar reputation data
 */
export function getAllRegistrarReputations(): Record<string, RegistrarReputation> {
  return { ...REGISTRAR_REPUTATION_DATA };
}

/**
 * Searches for registrars by name pattern
 * 
 * @param pattern - Search pattern
 * @returns Matching registrars
 */
export function searchRegistrars(pattern: string): RegistrarReputation[] {
  const matches: RegistrarReputation[] = [];
  const lowerPattern = pattern.toLowerCase();

  Object.values(REGISTRAR_REPUTATION_DATA).forEach(reputation => {
    if (reputation.registrar.toLowerCase().includes(lowerPattern)) {
      matches.push(reputation);
    }
  });

  return matches;
} 