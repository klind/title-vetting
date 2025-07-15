import { z } from 'zod';
import { WebsiteValidationResult } from './validation.js';
import { RiskAssessmentResult } from './risk.js';

/**
 * WHOIS API response schema for validation
 * Note: Properties may vary by registrar, so most fields are optional
 */
export const WhoisResultSchema = z.object({
  // Basic domain info
  domainName: z.string().optional(),
  registryDomainId: z.string().optional(),
  
  // Registrant information
  registrantName: z.string().optional(),
  registrantOrganization: z.string().optional(),
  registrantEmail: z.string().optional(),
  registrantCountry: z.string().optional(),
  registrantPhone: z.string().optional(),
  registrantPhoneExt: z.string().optional(),
  registrantFax: z.string().optional(),
  registrantFaxExt: z.string().optional(),
  registrantStreet: z.string().optional(),
  registrantCity: z.string().optional(),
  registrantState: z.string().optional(),
  registrantPostalCode: z.string().optional(),
  
  // Administrative contact
  adminName: z.string().optional(),
  adminOrganization: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPhone: z.string().optional(),
  adminPhoneExt: z.string().optional(),
  adminFax: z.string().optional(),
  adminFaxExt: z.string().optional(),
  adminStreet: z.string().optional(),
  adminCity: z.string().optional(),
  adminState: z.string().optional(),
  adminPostalCode: z.string().optional(),
  adminCountry: z.string().optional(),
  
  // Technical contact
  techName: z.string().optional(),
  techOrganization: z.string().optional(),
  techEmail: z.string().optional(),
  techPhone: z.string().optional(),
  techPhoneExt: z.string().optional(),
  techFax: z.string().optional(),
  techFaxExt: z.string().optional(),
  techStreet: z.string().optional(),
  techCity: z.string().optional(),
  techState: z.string().optional(),
  techPostalCode: z.string().optional(),
  techCountry: z.string().optional(),
  
  // Registration details
  creationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  updatedDate: z.string().optional(),
  registrar: z.string().optional(),
  registrarWhoisServer: z.string().optional(),
  registrarUrl: z.string().optional(),
  registrarIanaId: z.string().optional(),
  registrarAbuseContactEmail: z.string().optional(),
  registrarAbuseContactPhone: z.string().optional(),
  
  // Technical details
  nameServers: z.string().optional(),
  status: z.string().optional(),
  dnssec: z.string().optional(),
  
  // Additional fields that might be present
  registryRegistrantId: z.string().optional(),
  registryAdminId: z.string().optional(),
  registryTechId: z.string().optional(),
  
  // Raw WHOIS data for reference
  rawWhoisData: z.any().optional(),
});

export type WhoisResult = z.infer<typeof WhoisResultSchema>;

/**
 * Request payload schema for WHOIS lookup
 */
export const WhoisRequestSchema = z.object({
  url: z.string().min(1, 'URL is required').refine(
    (value) => {
      // Accept both URLs and domain names
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      return urlRegex.test(value) || domainRegex.test(value);
    },
    'Must be a valid URL or domain name'
  ),
});

export type WhoisRequest = z.infer<typeof WhoisRequestSchema>;

/**
 * Processed WHOIS report interface
 */
export interface WhoisReport {
  domain: string;
  
  // Basic domain info
  registryDomainId?: string;
  
  // Registrant information
  registrant: {
    name?: string;
    organization?: string;
    email?: string;
    country?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  
  // Administrative contact
  admin: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Technical contact
  tech: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Registration details
  registration: {
    createdDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    registrar?: string;
    registrarWhoisServer?: string;
    registrarUrl?: string;
    registrarIanaId?: string;
    registrarAbuseContactEmail?: string;
    registrarAbuseContactPhone?: string;
  };
  
  // Technical details
  technical: {
    nameServers?: string[];
    status?: string;
    dnssec?: string;
  };
  
  // Additional validation results
  website?: WebsiteValidationResult;
  
  // Risk assessment results
  riskAssessment?: RiskAssessmentResult;
  
  // Raw WHOIS data for reference
  rawWhoisData?: any;
  
  // Metadata
  metadata: {
    lookupTime: number;
    source: string;
    timestamp: string;
  };
}

 