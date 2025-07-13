declare module 'whois-json' {
  interface WhoisOptions {
    follow?: number;
    verbose?: boolean;
    [key: string]: any;
  }

  interface WhoisResult {
    domain?: string;
    registrant?: {
      name?: string;
      organization?: string;
      email?: string;
      country?: string;
      phone?: string;
    };
    admin?: {
      name?: string;
      email?: string;
    };
    tech?: {
      name?: string;
      email?: string;
    };
    nameServer?: string[] | string;
    status?: string[] | string;
    dnssec?: string;
    registrar?: string;
    registrarWhoisServer?: string;
    updatedDate?: string;
    creationDate?: string;
    expirationDate?: string;
    [key: string]: any;
  }

  function whoisLookup(domain: string, options?: WhoisOptions): Promise<WhoisResult>;
  
  export = whoisLookup;
}