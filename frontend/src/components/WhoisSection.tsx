import React, { useState } from 'react';

interface WhoisData {
  domain: string;
  tld: string;
  ianaServer: string;
  registryServer: string | null;
  registrarServer: string | null;
  parsedData: Record<string, any>;
  rawData: {
    iana?: Record<string, any>;
    registry?: Record<string, any>;
    registrar?: Record<string, any>;
  };
  metadata: {
    lookupTime: number;
    source: string;
    timestamp: string;
    serversQueried: string[];
    errors: string[];
    warnings: string[];
    totalFields: number;
  };
}

interface WhoisSectionProps {
  data: WhoisData;
  className?: string;
}

// Helper function to find field values with multiple possible keys
const findField = (data: Record<string, any>, keys: string[]): string | null => {
  for (const key of keys) {
    if (data[key]) {
      return data[key];
    }
  }
  return null;
};

// Helper function to clean up domain status (remove URL part)
const cleanDomainStatus = (status: string | null): string | null => {
  if (!status) return null;
  // Remove any URLs from the status (everything after and including 'http')
  return status.split(' http')[0].trim();
};

// Helper function to detect and format privacy protection emails
const formatEmailField = (email: string | null): { value: string; isPrivacy: boolean } => {
  if (!email) return { value: 'Not available', isPrivacy: false };
  
  // Check if it's a privacy protection URL
  if (email.includes('whois/results.aspx') || 
      email.includes('contactDomainOwner') || 
      email.includes('privacy') ||
      email.startsWith('http')) {
    return { 
      value: 'Privacy Protected', 
      isPrivacy: true 
    };
  }
  
  return { value: email, isPrivacy: false };
};

// Helper function to format phone numbers in US format
const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return 'Not available';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a US number (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } 
  // If it's a US number with country code (11 digits starting with 1)
  else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // If it's exactly 12 digits and starts with 1 (sometimes there are extra digits)
  else if (digits.length === 12 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  }
  
  // For non-US numbers or unrecognized formats, return original
  return phone;
};

// Helper function to clean up field values for the advanced view
const cleanFieldValue = (key: string, value: string): string => {
  // Clean domain status fields
  if (key.toLowerCase().includes('domain status') || key.toLowerCase().includes('status')) {
    return cleanDomainStatus(value) || value;
  }
  
  // Clean email fields that might be privacy URLs
  if (key.toLowerCase().includes('email')) {
    const formatted = formatEmailField(value);
    return formatted.value;
  }
  
  // Format phone numbers
  if (key.toLowerCase().includes('phone')) {
    return formatPhoneNumber(value);
  }
  
  return value;
};

// Helper function to format dates
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Not available';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Helper function to get days until expiration
const getDaysUntilExpiration = (expirationDate: string | null): { days: number; status: 'critical' | 'warning' | 'good' | 'unknown' } => {
  if (!expirationDate) return { days: 0, status: 'unknown' };
  
  try {
    const expDate = new Date(expirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { days, status: 'critical' };
    if (days < 30) return { days, status: 'critical' };
    if (days < 90) return { days, status: 'warning' };
    return { days, status: 'good' };
  } catch {
    return { days: 0, status: 'unknown' };
  }
};

const WhoisSection: React.FC<WhoisSectionProps> = ({ data, className = '' }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showLookupDetails, setShowLookupDetails] = useState(false);

  // Extract key information from parsed data
  const registrantName = findField(data.parsedData, ['Registrant Name', 'registrantName', 'Registrant']);
  const registrantOrg = findField(data.parsedData, ['Registrant Organization', 'registrantOrganization', 'Registrant Org']);
  const registrantEmail = findField(data.parsedData, ['Registrant Email', 'registrantEmail']);
  const registrantPhone = findField(data.parsedData, ['Registrant Phone', 'registrantPhone']);
  const registrantState = findField(data.parsedData, ['Registrant State/Province', 'registrantState', 'Registrant State']);
  const registrantCountry = findField(data.parsedData, ['Registrant Country', 'registrantCountry']);
  
  const adminName = findField(data.parsedData, ['Admin Name', 'adminName', 'Administrative Contact']);
  const adminEmail = findField(data.parsedData, ['Admin Email', 'adminEmail']);
  


  const creationDate = findField(data.parsedData, ['Creation Date', 'creationDate', 'Created Date', 'Domain Registration Date']);
  const expirationDate = findField(data.parsedData, ['Expiry Date', 'expirationDate', 'Expiration Date', 'Registry Expiry Date']);
  const updatedDate = findField(data.parsedData, ['Updated Date', 'updatedDate', 'Last Modified']);
  
  const registrar = findField(data.parsedData, ['Registrar', 'Sponsoring Registrar']);
  const registrarUrl = findField(data.parsedData, ['Registrar URL', 'registrarUrl']);
  const status = findField(data.parsedData, ['Domain Status', 'status', 'Status']);
  const nameServers = findField(data.parsedData, ['Name Server', 'nameServers', 'Name Servers']);

  const expiration = getDaysUntilExpiration(expirationDate);

  // Format email fields
  const formattedRegistrantEmail = formatEmailField(registrantEmail);
  const formattedAdminEmail = formatEmailField(adminEmail);

  // Split all fields for advanced view
  const allFields = Object.entries(data.parsedData)
    .filter(([key, value]) => 
      value && 
      !key.startsWith('comment_') && 
      !key.toLowerCase().includes('terms') &&
      !key.toLowerCase().includes('notice') &&
      !key.toLowerCase().includes('url of the icann') &&
      !key.toLowerCase().includes('>>> last update')
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">WHOIS Information</h3>
          <p className="text-gray-400">Domain registration and ownership details</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-orange-400">{data.domain}</div>
          <div className="text-sm text-gray-400">.{data.tld} domain</div>
        </div>
      </div>

      {/* Key Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Domain Owner Information */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Domain Owner
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Created:</span>
              <span className="text-white font-mono text-sm">{formatDate(creationDate)}</span>
            </div>
            {registrantName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Name:</span>
                <span className="text-white text-sm text-right max-w-xs truncate" title={registrantName}>{registrantName}</span>
              </div>
            )}
            {registrantPhone && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Phone:</span>
                <span className="text-white font-mono text-sm">{formatPhoneNumber(registrantPhone)}</span>
              </div>
            )}
            {registrantState && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">State/Province:</span>
                <span className="text-white text-sm">{registrantState}</span>
              </div>
            )}
            {registrantCountry && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Country:</span>
                <span className="text-white text-sm">{registrantCountry}</span>
              </div>
            )}
          </div>
        </div>

        {/* Domain Status & Dates */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Registration Status
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Expires:</span>
              <div className="text-right">
                <div className="text-sm font-mono text-white">
                  {formatDate(expirationDate)}
                </div>
                {expiration.status !== 'unknown' && (
                  <div className="text-xs text-white">
                    {expiration.days > 0 ? `${expiration.days} days left` : 'Expired'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Last Updated:</span>
              <span className="text-white font-mono text-sm">{formatDate(updatedDate)}</span>
            </div>
            {status && (
              <div className="pt-2 border-t border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white text-sm font-mono">{cleanDomainStatus(status)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registrar Information */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
          <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6m-6 4h6" />
            </svg>
            Registrar
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Company:</div>
              <div className="text-white font-medium">{registrar || 'Not available'}</div>
            </div>
            {registrarUrl && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Website:</div>
                <a 
                  href={registrarUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm font-mono break-all"
                >
                  {registrarUrl}
                </a>
              </div>
            )}
            {nameServers && (
              <div>
                <div className="text-gray-400 text-sm mb-1">Name Servers:</div>
                <div className="text-white text-sm font-mono break-all">{nameServers}</div>
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        {(registrantName || registrantOrg || registrantEmail || adminEmail) && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
            <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Registrant
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Registrant */}
              {(registrantName || registrantOrg || registrantEmail) && (
                <div>
                  <div className="space-y-2">
                    {registrantName && (
                      <div className="text-sm">
                        <span className="text-gray-400">Name:</span>
                        <div className="text-white">{registrantName}</div>
                      </div>
                    )}
                    {registrantOrg && (
                      <div className="text-sm">
                        <span className="text-gray-400">Organization:</span>
                        <div className="text-white">{registrantOrg}</div>
                      </div>
                    )}
                    {registrantEmail && (
                      <div className="text-sm">
                        <span className="text-gray-400">Email:</span>
                        <div className={`font-mono break-all ${formattedRegistrantEmail.isPrivacy ? 'text-white' : 'text-blue-400'}`}>{formattedRegistrantEmail.value}</div>
                      </div>
                    )}
                    {registrantPhone && (
                      <div className="text-sm">
                        <span className="text-gray-400">Phone:</span>
                        <div className="text-white font-mono text-sm">{formatPhoneNumber(registrantPhone)}</div>
                      </div>
                    )}
                    {registrantState && (
                      <div className="text-sm">
                        <span className="text-gray-400">State/Province:</span>
                        <div className="text-white font-mono text-sm">{registrantState}</div>
                      </div>
                    )}
                    {registrantCountry && (
                      <div className="text-sm">
                        <span className="text-gray-400">Country:</span>
                        <div className="text-white">{registrantCountry}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin */}
              {(adminName || adminEmail) && (
                <div>
                  <h5 className="text-white font-medium mb-3 flex items-center">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    Admin Contact
                  </h5>
                  <div className="space-y-2">
                    {adminName && (
                      <div className="text-sm">
                        <span className="text-gray-400">Name:</span>
                        <div className="text-white">{adminName}</div>
                      </div>
                    )}
                    {adminEmail && (
                      <div className="text-sm">
                        <span className="text-gray-400">Email:</span>
                        <div className={`font-mono break-all ${formattedAdminEmail.isPrivacy ? 'text-white' : 'text-blue-400'}`}>{formattedAdminEmail.value}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lookup Details */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
        <button
          onClick={() => setShowLookupDetails(!showLookupDetails)}
          className="w-full flex items-center justify-between text-left hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
        >
          <h4 className="text-lg font-semibold text-orange-400 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Lookup Information
          </h4>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showLookupDetails ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showLookupDetails && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-orange-400">{data.metadata.serversQueried.length}</div>
                <div className="text-xs text-gray-400">Servers Queried</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{data.metadata.totalFields}</div>
                <div className="text-xs text-gray-400">Fields Retrieved</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{(data.metadata.lookupTime / 1000).toFixed(1)}s</div>
                <div className="text-xs text-gray-400">Query Time</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{data.metadata.errors.length + data.metadata.warnings.length}</div>
                <div className="text-xs text-gray-400">Issues</div>
              </div>
            </div>

            {data.metadata.serversQueried.length > 0 && (
              <div className="mt-4">
                <div className="text-sm text-gray-400 mb-2">Servers queried:</div>
                <div className="flex flex-wrap gap-2">
                  {data.metadata.serversQueried.map((server, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-600 rounded text-xs text-gray-300 font-mono">
                      {server}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete WHOIS Data */}
      {allFields.length > 0 && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-left hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors"
          >
            <h4 className="text-lg font-semibold text-orange-400 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Complete WHOIS Data
            </h4>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAdvanced && (
            <div className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allFields.map(([key, value], index) => (
                  <div key={index} className="flex justify-between items-start py-2 border-b border-gray-700 last:border-b-0">
                    <span className="text-gray-400 text-sm pr-4 flex-shrink-0">{key}:</span>
                    <span className="text-white text-sm font-mono text-right break-all">{cleanFieldValue(key, value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhoisSection; 