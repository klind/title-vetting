/**
 * Custom WHOIS Service
 * 
 * Enhanced WHOIS lookup with better parsing, error handling,
 * and support for various WHOIS server formats.
 */

import { ErrorType, ApiError } from '../../types/common.js';

/**
 * WHOIS server configuration
 */
interface WhoisServerConfig {
  server: string;
  query: string;
  timeout: number;
  follow: number;
}

/**
 * WHOIS response parser result
 */
interface WhoisParseResult {
  success: boolean;
  data: Record<string, any>;
  raw: string;
  errors: string[];
}

/**
 * Custom WHOIS lookup options
 */
interface CustomWhoisOptions {
  timeout?: number;
  follow?: number;
  verbose?: boolean;
  parseResponse?: boolean;
}

/**
 * WHOIS server mappings for common TLDs
 */
const WHOIS_SERVERS: Record<string, WhoisServerConfig> = {
  'com': {
    server: 'whois.verisign-grs.com',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'net': {
    server: 'whois.verisign-grs.com',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'org': {
    server: 'whois.pir.org',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'info': {
    server: 'whois.afilias.net',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'biz': {
    server: 'whois.biz',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'us': {
    server: 'whois.nic.us',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'uk': {
    server: 'whois.nic.uk',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ca': {
    server: 'whois.cira.ca',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'au': {
    server: 'whois.auda.org.au',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'de': {
    server: 'whois.denic.de',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'fr': {
    server: 'whois.nic.fr',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'it': {
    server: 'whois.nic.it',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'es': {
    server: 'whois.nic.es',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'nl': {
    server: 'whois.domain-registry.nl',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'se': {
    server: 'whois.iis.se',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'no': {
    server: 'whois.norid.no',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'dk': {
    server: 'whois.dk-hostmaster.dk',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'fi': {
    server: 'whois.fi',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'pl': {
    server: 'whois.dns.pl',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cz': {
    server: 'whois.nic.cz',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'sk': {
    server: 'whois.sk-nic.sk',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'hu': {
    server: 'whois.nic.hu',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ro': {
    server: 'whois.rotld.ro',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bg': {
    server: 'whois.register.bg',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'hr': {
    server: 'whois.dns.hr',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'si': {
    server: 'whois.arnes.si',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'rs': {
    server: 'whois.rnids.rs',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'me': {
    server: 'whois.nic.me',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'co': {
    server: 'whois.nic.co',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'mx': {
    server: 'whois.mx',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'br': {
    server: 'whois.registro.br',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ar': {
    server: 'whois.nic.ar',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cl': {
    server: 'whois.nic.cl',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'pe': {
    server: 'whois.nic.pe',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'uy': {
    server: 'whois.nic.org.uy',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'py': {
    server: 'whois.nic.py',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bo': {
    server: 'whois.nic.bo',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ec': {
    server: 'whois.nic.ec',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  've': {
    server: 'whois.nic.ve',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'co.za': {
    server: 'whois.registry.net.za',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'za': {
    server: 'whois.registry.net.za',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ke': {
    server: 'whois.kenic.or.ke',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ug': {
    server: 'whois.co.ug',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'tz': {
    server: 'whois.tznic.or.tz',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'zm': {
    server: 'whois.zicta.zm',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bw': {
    server: 'whois.nic.net.bw',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'na': {
    server: 'whois.na-nic.com.na',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'sz': {
    server: 'whois.nic.org.sz',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ls': {
    server: 'whois.nic.ls',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'mw': {
    server: 'whois.nic.mw',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'mz': {
    server: 'whois.nic.mz',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ao': {
    server: 'whois.ao',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cv': {
    server: 'whois.nic.cv',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'gw': {
    server: 'whois.nic.gw',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'st': {
    server: 'whois.nic.st',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'gq': {
    server: 'whois.dominio.gq',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cf': {
    server: 'whois.dot.cf',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'td': {
    server: 'whois.nic.td',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ne': {
    server: 'whois.nic.ne',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ml': {
    server: 'whois.dot.ml',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bf': {
    server: 'whois.bf',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ci': {
    server: 'whois.nic.ci',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'sn': {
    server: 'whois.nic.sn',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'gn': {
    server: 'whois.nic.gn',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'sl': {
    server: 'whois.nic.sl',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'lr': {
    server: 'whois.nic.lr',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'tg': {
    server: 'whois.nic.tg',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bj': {
    server: 'whois.nic.bj',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'gh': {
    server: 'whois.nic.gh',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'ga': {
    server: 'whois.dot.ga',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cg': {
    server: 'whois.nic.cg',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'cd': {
    server: 'whois.nic.cd',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'rw': {
    server: 'whois.ricta.org.rw',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'bi': {
    server: 'whois.nic.bi',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'et': {
    server: 'whois.ethiotelecom.et',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'er': {
    server: 'whois.nic.er',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'so': {
    server: 'whois.nic.so',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'km': {
    server: 'whois.nic.km',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'mg': {
    server: 'whois.nic.mg',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'mu': {
    server: 'whois.nic.mu',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'sc': {
    server: 'whois2.afilias-grs.net',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  're': {
    server: 'whois.nic.re',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  },
  'yt': {
    server: 'whois.nic.yt',
    query: 'domain {domain}',
    timeout: 30000,
    follow: 3
  }
};

/**
 * Performs a custom WHOIS lookup
 * 
 * @param domain - Domain to lookup
 * @param options - Lookup options
 * @returns WHOIS data
 */
export async function customWhoisLookup(
  domain: string,
  options: CustomWhoisOptions = {}
): Promise<any> {
  try {
    console.log(`Performing custom WHOIS lookup for: ${domain}`);

    const {
      timeout = 30000,
      follow = 3,
      verbose = false,
      parseResponse = true
    } = options;

    // Extract TLD from domain
    const tld = extractTLD(domain);
    if (!tld) {
      throw createApiError(
        ErrorType.VALIDATION_ERROR,
        `Invalid domain format: ${domain}`,
        400
      );
    }

    const lookupResults = {
      domain,
      tld,
      ianaServer: 'whois.iana.org',
      registryServer: null as string | null,
      registrarServer: null as string | null,
      ianaResponse: null as string | null,
      registryResponse: null as string | null,
      registrarResponse: null as string | null,
      parsedData: {} as Record<string, any>,
      rawData: {} as Record<string, any>,
      metadata: {
        lookupTime: Date.now(),
        serversQueried: [] as string[],
        errors: [] as string[],
        warnings: [] as string[],
        totalFields: 0
      }
    };

    // Step 1: Query IANA WHOIS server for TLD information
    console.log(`[WHOIS] Step 1: Querying IANA server for TLD: ${tld}`);
    try {
      const ianaResponse = await performWhoisQuery(tld, {
        server: 'whois.iana.org',
        query: 'domain {domain}',
        timeout,
        follow,
      }, {
        timeout,
        follow,
        verbose
      }, false);

      lookupResults.ianaResponse = ianaResponse;
      lookupResults.metadata.serversQueried.push('whois.iana.org');

      // Parse IANA response to get registry server
      const ianaParseResult = parseWhoisResponse(ianaResponse, tld);
      Object.assign(lookupResults.rawData, { iana: ianaParseResult.data });

      // Extract registry WHOIS server from IANA response
      const registryServer = extractRegistryWhoisServer(ianaResponse);
      if (registryServer) {
        lookupResults.registryServer = registryServer;
        console.log(`[WHOIS] IANA referral: Registry server = ${registryServer}`);
      }

      if (ianaParseResult.errors.length > 0) {
        lookupResults.metadata.errors.push(...ianaParseResult.errors);
      }
    } catch (err) {
      console.warn(`[WHOIS] Failed to query IANA server:`, err);
      lookupResults.metadata.warnings.push('Failed to query IANA server');
    }

    // Step 2: Query registry WHOIS server (either from IANA or fallback)
    let registryServer = lookupResults.registryServer;
    if (!registryServer) {
      // Fallback to our predefined server list
      const serverConfig = getWhoisServerConfig(tld);
      if (serverConfig) {
        registryServer = serverConfig.server;
        lookupResults.registryServer = registryServer;
      }
    }

    if (registryServer) {
      console.log(`[WHOIS] Step 2: Querying registry server: ${registryServer}`);
      try {
        const registryResponse = await performWhoisQuery(domain, {
          server: registryServer,
          query: 'domain {domain}',
          timeout,
          follow,
        }, {
          timeout,
          follow,
          verbose
        }, false);

        lookupResults.registryResponse = registryResponse;
        lookupResults.metadata.serversQueried.push(registryServer);

        // Parse registry response
        if (parseResponse) {
          const registryParseResult = parseWhoisResponse(registryResponse, domain);
          Object.assign(lookupResults.rawData, { registry: registryParseResult.data });
          
          if (registryParseResult.errors.length > 0) {
            lookupResults.metadata.errors.push(...registryParseResult.errors);
          }
        }

        // Step 3: Check for Registrar WHOIS Server referral
        const registrarWhoisServer = extractRegistrarWhoisServer(registryResponse);
        if (registrarWhoisServer && registrarWhoisServer !== registryServer) {
          console.log(`[WHOIS] Step 3: Registry referral found: Registrar WHOIS Server = ${registrarWhoisServer}`);
          lookupResults.registrarServer = registrarWhoisServer;
          
          try {
            console.log(`[WHOIS] Querying registrar server: ${registrarWhoisServer}`);
            const registrarResponse = await performWhoisQuery(domain, {
              server: registrarWhoisServer,
              query: 'domain {domain}',
              timeout,
              follow,
            }, {
              timeout,
              follow,
              verbose
            }, true); // registrar referral
            
            lookupResults.registrarResponse = registrarResponse;
            lookupResults.metadata.serversQueried.push(registrarWhoisServer);
            console.log(`[WHOIS] Used referred registrar server: ${registrarWhoisServer}`);

            // Parse registrar response
            if (parseResponse) {
              const registrarParseResult = parseWhoisResponse(registrarResponse, domain);
              Object.assign(lookupResults.rawData, { registrar: registrarParseResult.data });
              
              if (registrarParseResult.errors.length > 0) {
                lookupResults.metadata.errors.push(...registrarParseResult.errors);
              }
            }
          } catch (err) {
            console.warn(`[WHOIS] Failed to query referred registrar server (${registrarWhoisServer}), using original response.`);
            lookupResults.metadata.warnings.push(`Failed to query registrar server: ${registrarWhoisServer}`);
          }
        }
      } catch (err) {
        console.warn(`[WHOIS] Failed to query registry server:`, err);
        lookupResults.metadata.warnings.push(`Failed to query registry server: ${registryServer}`);
      }
    } else {
      lookupResults.metadata.errors.push(`No registry server found for TLD: ${tld}`);
    }

    // Add lookup completion metadata
    lookupResults.metadata.lookupTime = Date.now() - lookupResults.metadata.lookupTime;
    lookupResults.metadata.totalFields = Object.values(lookupResults.rawData).reduce((total, serverData) => 
      total + Object.keys(serverData as Record<string, any>).length, 0
    );

    console.log(`[WHOIS] Lookup completed for ${domain}`);
    console.log(`[WHOIS] Total fields parsed: ${lookupResults.metadata.totalFields}`);
    console.log(`[WHOIS] Servers queried: ${lookupResults.metadata.serversQueried.join(', ')}`);

    return lookupResults;

  } catch (error) {
    console.error(`Custom WHOIS lookup failed for ${domain}:`, error);
    throw error;
  }
}

/**
 * Extracts TLD from domain
 * 
 * @param domain - Domain name
 * @returns TLD or null
 */
function extractTLD(domain: string): string | null {
  const parts = domain.toLowerCase().split('.');
  if (parts.length < 2) return null;

  // Handle multi-level TLDs (e.g., co.uk, com.au)
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join('.');
    if (WHOIS_SERVERS[lastTwo]) {
      return lastTwo;
    }
  }

  return parts[parts.length - 1] || null;
}

/**
 * Gets WHOIS server configuration for TLD
 * 
 * @param tld - Top level domain
 * @returns Server configuration or null
 */
function getWhoisServerConfig(tld: string): WhoisServerConfig | null {
  return WHOIS_SERVERS[tld] || null;
}

/**
 * Performs WHOIS query
 * 
 * @param domain - Domain to query
 * @param config - Server configuration
 * @param options - Query options
 * @returns Raw response
 */
async function performWhoisQuery(
  domain: string,
  config: WhoisServerConfig,
  options: { timeout: number; follow: number; verbose: boolean },
  isRegistrarReferral = false
): Promise<string> {
  console.log(`[WHOIS] Starting query for domain: ${domain}`);
  console.log(`[WHOIS] Using server: ${config.server}`);
  console.log(`[WHOIS] Query format: ${config.query}`);
  try {
    console.log(`🔍 Querying ${config.server} for ${domain}`);
    const net = await import('net');
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let response = '';
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error(`WHOIS query timed out after ${options.timeout}ms`));
      }, options.timeout);
      client.connect(43, config.server, () => {
        console.log(`📡 Connected to ${config.server}`);
        // Use just the domain for registrar referrals
        let query;
        if (isRegistrarReferral) {
          query = domain;
        } else {
          query = config.query.replace('{domain}', domain);
        }
        console.log(`🔍 Sending query: ${query}`);
        client.write(query + '\r\n');
      });
      client.on('data', (data) => {
        response += data.toString();
      });
      client.on('end', () => {
        clearTimeout(timeout);
        console.log(`✅ Received response from ${config.server}`);
        console.log(`[WHOIS] Raw response from ${config.server}:`);
        console.log('='.repeat(80));
        console.log(response);
        console.log('='.repeat(80));
        resolve(response);
      });
      client.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ WHOIS query error:`, error);
        reject(error);
      });
      client.on('close', () => {
        clearTimeout(timeout);
      });
    });
  } catch (error) {
    console.error(`❌ Failed to perform WHOIS query:`, error);
    // Fallback: return a structured mock response for testing
    return `Domain Name: ${domain}\nRegistrar: Not available`;
  }
}

/**
 * Parses WHOIS response
 * 
 * @param response - Raw WHOIS response
 * @param domain - Original domain
 * @returns Parsed data
 */
function parseWhoisResponse(response: string, domain: string): WhoisParseResult {
  const lines = response.split('\n');
  const data: Record<string, any> = {};
  const errors: string[] = [];

  console.log(`[WHOIS] Parsing response for domain: ${domain}`);
  console.log(`[WHOIS] Response has ${lines.length} lines`);

  try {
    for (const line of lines) {
      const trimmed = line.trim();
      // Don't skip comments - they might contain important info
      if (!trimmed) {
        continue;
      }

      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) {
        // Handle lines without colons (like status codes)
        if (trimmed.startsWith('%') || trimmed.startsWith('#')) {
          // Store comments as metadata
          const commentKey = `comment_${Object.keys(data).filter(k => k.startsWith('comment_')).length}`;
          data[commentKey] = trimmed;
        }
        continue;
      }

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (key && value) {
        // Store only the original key names for clean data
        data[key] = value;
        
        console.log(`[WHOIS] Parsed: ${key} = ${value}`);
      }
    }

    console.log(`[WHOIS] Parsed ${Object.keys(data).length} fields`);
    console.log(`[WHOIS] Parsed data:`, JSON.stringify(data, null, 2));

    return {
      success: true,
      data,
      raw: response,
      errors
    };

  } catch (error) {
    errors.push(`Failed to parse WHOIS response: ${error}`);
    return {
      success: false,
      data: {},
      raw: response,
      errors
    };
  }
}

/**
 * Normalizes WHOIS key names
 * 
 * @param key - Raw key name
 * @returns Normalized key name
 */
function normalizeWhoisKey(key: string): string {
  const normalized = key
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

  // Map common variations
  const keyMap: Record<string, string> = {
    'domainname': 'domainName',
    'registrantname': 'registrantName',
    'registrantorganization': 'registrantOrganization',
    'registrantemail': 'registrantEmail',
    'registrantphone': 'registrantPhone',
    'registrantcountry': 'registrantCountry',
    'creationdate': 'creationDate',
    'expirationdate': 'expirationDate',
    'updateddate': 'updatedDate',
    'registrar': 'registrar',
    'registrarwhoisserver': 'registrarWhoisServer',
    'nameservers': 'nameServers',
    'status': 'status',
    'dnssec': 'dnssec'
  };

  return keyMap[normalized] || normalized;
}

/**
 * Creates a standardized API error
 * 
 * @param type - Error type
 * @param message - Error message
 * @param statusCode - HTTP status code
 * @returns ApiError
 */
function createApiError(
  type: ErrorType,
  message: string,
  statusCode: number
): ApiError {
  const error = new Error(message) as any;
  error.name = 'ApiError';
  error.type = type;
  error.statusCode = statusCode;
  return error;
} 

// Helper to extract Registrar WHOIS Server from raw response
function extractRegistrarWhoisServer(response: string): string | null {
  const match = response.match(/Registrar WHOIS Server:\s*([\w\.-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
} 

// Helper to extract Registry WHOIS Server from IANA response
function extractRegistryWhoisServer(response: string): string | null {
  const match = response.match(/whois:\s*([\w\.-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
} 