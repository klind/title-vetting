import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger configuration options
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Title Company Vetter API',
      version: '1.0.0',
      description: 'Comprehensive domain validation and risk assessment API for title companies',
      contact: {
        name: 'API Support',
        email: 'support@titlecompanyvetter.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.titlecompanyvetter.com',
        description: 'Production server'
      }
    ],
    components: {
      schemas: {
        WhoisRequest: {
          type: 'object',
          required: ['url'],
          properties: {
            url: {
              type: 'string',
              description: 'Domain name (e.g., "pattentitle.com") or full URL (e.g., "https://pattentitle.com") to perform WHOIS lookup on',
              example: 'pattentitle.com',
              pattern: '^(https?:\\/\\/)?([\\w-]+\\.)+[\\w-]+(\\/[\\w-./?%&=]*)?$'
            }
          }
        },
        ContactInfo: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Contact name' },
            organization: { type: 'string', description: 'Organization name' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            phoneExt: { type: 'string', description: 'Phone extension' },
            fax: { type: 'string', description: 'Fax number' },
            faxExt: { type: 'string', description: 'Fax extension' },
            street: { type: 'string', description: 'Street address' },
            city: { type: 'string', description: 'City' },
            state: { type: 'string', description: 'State or province' },
            postalCode: { type: 'string', description: 'Postal/ZIP code' },
            country: { type: 'string', description: 'Country code' }
          }
        },
        RegistrationInfo: {
          type: 'object',
          properties: {
            createdDate: { type: 'string', description: 'Domain creation date' },
            expirationDate: { type: 'string', description: 'Domain expiration date' },
            updatedDate: { type: 'string', description: 'Last update date' },
            registrar: { type: 'string', description: 'Registrar name' },
            registrarWhoisServer: { type: 'string', description: 'Registrar WHOIS server' },
            registrarUrl: { type: 'string', description: 'Registrar website URL' },
            registrarIanaId: { type: 'string', description: 'Registrar IANA ID' },
            registrarAbuseContactEmail: { type: 'string', description: 'Registrar abuse contact email' },
            registrarAbuseContactPhone: { type: 'string', description: 'Registrar abuse contact phone' }
          }
        },
        TechnicalInfo: {
          type: 'object',
          properties: {
            nameServers: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of name servers'
            },
            status: { type: 'string', description: 'Domain status' },
            dnssec: { type: 'string', description: 'DNSSEC status' }
          }
        },
        WebsiteValidation: {
          type: 'object',
          properties: {
            hasWebsite: { type: 'boolean', description: 'Whether domain has a website' },
            isAccessible: { type: 'boolean', description: 'Whether website is accessible' },
            hasDns: { type: 'boolean', description: 'Whether domain has DNS records' },
            error: { type: 'string', description: 'Validation error message' }
          }
        },
        WhoisMetadata: {
          type: 'object',
          properties: {
            lookupTime: { type: 'number', description: 'Lookup duration in milliseconds' },
            serversQueried: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of WHOIS servers queried'
            },
            errors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any errors encountered during lookup'
            },
            warnings: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any warnings encountered during lookup'
            },
            totalFields: { type: 'number', description: 'Total number of fields parsed' },
            source: { type: 'string', description: 'Data source identifier' },
            timestamp: { type: 'string', format: 'date-time', description: 'Lookup timestamp' }
          }
        },
        WhoisData: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'The domain that was looked up' },
            tld: { type: 'string', description: 'Top level domain' },
            registryDomainId: { type: 'string', description: 'Registry domain ID' },
            registrant: { '$ref': '#/components/schemas/ContactInfo' },
            admin: { '$ref': '#/components/schemas/ContactInfo' },
            tech: { '$ref': '#/components/schemas/ContactInfo' },
            registration: { '$ref': '#/components/schemas/RegistrationInfo' },
            technical: { '$ref': '#/components/schemas/TechnicalInfo' },
            website: { '$ref': '#/components/schemas/WebsiteValidation' },
            riskFactors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Identified risk factors'
            },
            // Enhanced WHOIS lookup data
            ianaServer: { type: 'string', description: 'IANA WHOIS server' },
            registryServer: { type: 'string', description: 'Registry WHOIS server' },
            registrarServer: { type: 'string', description: 'Registrar WHOIS server' },
            ianaResponse: { type: 'string', description: 'Raw response from IANA WHOIS server' },
            registryResponse: { type: 'string', description: 'Raw response from registry WHOIS server' },
            registrarResponse: { type: 'string', description: 'Raw response from registrar WHOIS server' },
            parsedData: {
              type: 'object',
              additionalProperties: true,
              description: 'All parsed WHOIS fields from all servers',
              example: {
                "domainName": "example.com",
                "registrantName": "John Doe",
                "registrantEmail": "john@example.com",
                "creationDate": "2020-01-15",
                "expirationDate": "2025-01-15",
                "registrar": "GoDaddy.com, LLC"
              }
            },
            rawData: {
              type: 'object',
              additionalProperties: true,
              description: 'Separated raw data from each server',
              properties: {
                iana: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Parsed data from IANA server'
                },
                registry: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Parsed data from registry server'
                },
                registrar: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Parsed data from registrar server'
                }
              }
            },
            rawWhoisData: {
              type: 'object',
              additionalProperties: true,
              description: 'Complete raw WHOIS data for reference'
            },
            metadata: { '$ref': '#/components/schemas/WhoisMetadata' }
          }
        },
        WhoisResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            whois: {
              '$ref': '#/components/schemas/WhoisData'
            },
            website: {
              '$ref': '#/components/schemas/WebsiteAnalysis'
            },
            riskFactors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Identified risk factors'
            },
            error: {
              type: 'string',
              description: 'Error message if request failed'
            }
          }
        },
        WebsiteAnalysis: {
          type: 'object',
          properties: {
            accessibility: {
              type: 'object',
              properties: {
                hasWebsite: { type: 'boolean', description: 'Whether domain has a website' },
                isAccessible: { type: 'boolean', description: 'Whether website is accessible' },
                hasDns: { type: 'boolean', description: 'Whether domain has DNS records' },
                responseTime: { type: 'number', description: 'Website response time in milliseconds' },
                httpStatus: { type: 'number', description: 'HTTP status code' },
                error: { type: 'string', description: 'Error message if any' }
              }
            },
            content: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Website title' },
                description: { type: 'string', description: 'Website meta description' },
                hasContent: { type: 'boolean', description: 'Whether website has meaningful content' },
                contentLength: { type: 'number', description: 'Content length in characters' },
                language: { type: 'string', description: 'Detected content language' }
              }
            },
            contacts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string', description: 'Contact email address' },
                  phone: { type: 'string', description: 'Contact phone number' },
                  source: { type: 'string', description: 'Where the contact was found' }
                }
              },
              description: 'Contact information found on website'
            },
            ssl: {
              type: 'object',
              properties: {
                hasSSL: { type: 'boolean', description: 'Whether website has SSL certificate' },
                isValid: { type: 'boolean', description: 'Whether SSL certificate is valid' },
                issuer: { type: 'string', description: 'SSL certificate issuer' },
                expirationDate: { type: 'string', description: 'SSL certificate expiration date' },
                subject: { type: 'string', description: 'SSL certificate subject' },
                serialNumber: { type: 'string', description: 'SSL certificate serial number' }
              }
            }
          }
        },
        WebsiteResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            website: {
              '$ref': '#/components/schemas/WebsiteAnalysis'
            },
            error: {
              type: 'string',
              description: 'Error message if request failed'
            }
          }
        },
        SocialMediaAnalysis: {
          type: 'object',
          properties: {
            platforms: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: { type: 'string', description: 'Social media platform name' },
                  url: { type: 'string', description: 'Profile URL' },
                  isActive: { type: 'boolean', description: 'Whether profile appears active' },
                  followers: { type: 'number', description: 'Number of followers (if available)' },
                  lastActivity: { type: 'string', description: 'Last activity date (if available)' }
                }
              },
              description: 'Detected social media profiles'
            },
            summary: {
              type: 'object',
              properties: {
                totalPlatforms: { type: 'number', description: 'Total number of platforms found' },
                activePlatforms: { type: 'number', description: 'Number of active platforms' },
                overallPresence: { type: 'string', enum: ['strong', 'moderate', 'weak', 'none'], description: 'Overall social media presence assessment' }
              }
            }
          }
        },
        SocialMediaResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            socialMedia: {
              '$ref': '#/components/schemas/SocialMediaAnalysis'
            },
            error: {
              type: 'string',
              description: 'Error message if request failed'
            }
          }
        },
        CombinedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            whois: {
              '$ref': '#/components/schemas/WhoisData'
            },
            website: {
              '$ref': '#/components/schemas/WebsiteAnalysis'
            },
            socialMedia: {
              '$ref': '#/components/schemas/SocialMediaAnalysis'
            },
            riskFactors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Comprehensive risk factors from all analyses'
            },
            error: {
              type: 'string',
              description: 'Error message if request failed'
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            uptime: {
              type: 'number',
              description: 'Server uptime in seconds'
            }
          }
        },
        StatusResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'healthy'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            },
            service: {
              type: 'string',
              example: 'title-company-vetter'
            },
            version: {
              type: 'string',
              example: '1.0.0'
            },
            environment: {
              type: 'string',
              example: 'development'
            },
            configuration: {
              type: 'object',
              properties: {
                rateLimit: { type: 'number' },
                corsOrigin: { type: 'string' },
                logLevel: { type: 'string' },
                whoisTimeout: { type: 'number' },
                maxConcurrentRequests: { type: 'number' }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            },
            requestId: {
              type: 'string',
              description: 'Unique request identifier'
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication (if required)'
        }
      }
    },
    tags: [
      {
        name: 'WHOIS',
        description: 'Domain WHOIS lookup operations with website validation and risk analysis'
      },
      {
        name: 'Website',
        description: 'Website analysis including accessibility, content, contacts, and SSL validation'
      },
      {
        name: 'Social Media',
        description: 'Social media presence analysis and validation'
      },
      {
        name: 'Combined',
        description: 'Comprehensive analysis combining WHOIS, website, and social media data'
      },
      {
        name: 'Health',
        description: 'Health check and status endpoints'
      }
    ]
  },
  apis: ['./src/api/routes/*.ts', './src/api/index.ts'], // Path to the API docs
};

/**
 * Generate Swagger specification
 */
const specs = swaggerJsdoc(options);

/**
 * Swagger UI options with enhanced JSON formatting
 */
const swaggerUiOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .response-col_description .microlight {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 10px;
      white-space: pre-wrap;
      font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    .swagger-ui .response-col_description .highlight-code {
      background-color: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
    }
    .swagger-ui .responses-inner .response .response-col_description {
      font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
      font-size: 12px;
    }
    .swagger-ui .response-content-type {
      font-weight: bold;
      margin-bottom: 10px;
    }
    .swagger-ui .response .response-col_description pre {
      background: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      padding: 15px !important;
      border-radius: 6px !important;
      overflow-x: auto !important;
      white-space: pre-wrap !important;
      word-wrap: break-word !important;
      font-family: Monaco, Menlo, 'Ubuntu Mono', monospace !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }
    .swagger-ui .btn.download-contents {
      display: none;
    }
    /* Force proper JSON formatting in response body */
    .swagger-ui .response-col_description div[class*="response-col_description"] {
      font-family: Monaco, Menlo, 'Ubuntu Mono', monospace !important;
    }
    .swagger-ui .highlight-code {
      white-space: pre-wrap !important;
      word-break: break-all !important;
    }
    /* Override any inline styles that prevent formatting */
    .swagger-ui .response-col_description * {
      white-space: pre-wrap !important;
    }
  `,
  customSiteTitle: 'Title Company Vetter API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    displayRequestDuration: true,
    showCommonExtensions: true,
    showExtensions: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    syntaxHighlight: {
      activated: true,
      theme: "agate"
    },
    requestInterceptor: function(request: any) {
      // Add request ID for tracking
      request.headers['X-Request-ID'] = 'swagger-' + Date.now();
      return request;
    },
    responseInterceptor: function(response: any) {
      // Pretty print JSON responses if content-type is JSON
      if (response.headers && 
          response.headers['content-type'] && 
          response.headers['content-type'].includes('application/json') && 
          response.text) {
        try {
          const parsed = JSON.parse(response.text);
          response.text = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep original if parsing fails
          console.warn('Failed to parse JSON response for formatting:', e);
        }
      }
      return response;
    }
  }
};

export { specs, swaggerUi, swaggerUiOptions }; 