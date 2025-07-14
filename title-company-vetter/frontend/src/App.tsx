import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import LoadingSpinner from './components/LoadingSpinner';

interface WhoisData {
  [key: string]: any;
}

const App: React.FC = () => {
  console.log('App component rendering...');
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with URL:', url);
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setWhoisData(null);

    try {
      // Add protocol if missing
      let fullUrl = url.trim();
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
      }

      console.log('Making API call to:', fullUrl);
      const response = await fetch('http://localhost:3001/whois', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: fullUrl }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      
      // Check if the response has the expected structure
      if (data.success === false) {
        throw new Error(data.error || 'API returned error');
      }
      
      // Extract the actual data from the response
      const whoisData = data.data || data;
      console.log('Processed WHOIS data:', whoisData);
      setWhoisData(whoisData);
    } catch (err) {
      console.error('API error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Component to render a formatted report from JSON data
  const renderReport = (data: WhoisData): JSX.Element => {
    const renderField = (label: string, value: any, type: 'text' | 'date' | 'status' = 'text') => {
      if (value === null || value === undefined || value === '') {
        return null;
      }

      let displayValue = value;
      let statusClass = '';

      if (type === 'date' && typeof value === 'string') {
        try {
          const date = new Date(value);
          displayValue = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } catch {
          displayValue = value;
        }
      } else if (type === 'status') {
        const status = String(value).toLowerCase();
        if (status.includes('active') || status.includes('ok') || status.includes('valid')) {
          statusClass = 'bg-green-100 text-green-800 border-green-200';
        } else if (status.includes('pending') || status.includes('processing')) {
          statusClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        } else {
          statusClass = 'bg-red-100 text-red-800 border-red-200';
        }
      }

      return (
        <div key={label} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-700 last:border-b-0">
          <dt className="text-sm font-medium text-gray-400 sm:w-1/3 sm:pr-4">{label}</dt>
          <dd className="text-sm text-white mt-1 sm:mt-0 sm:w-2/3">
            {type === 'status' ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
                {displayValue}
              </span>
            ) : (
              <span className="font-mono">{displayValue}</span>
            )}
          </dd>
        </div>
      );
    };

    const renderSection = (title: string, data: any, fields: Array<{ key: string; label: string; type?: 'text' | 'date' | 'status' }>) => {
      if (!data || typeof data !== 'object') return null;

      return (
        <div key={title} className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-orange-400 mb-4">{title}</h3>
          <dl className="space-y-0">
            {fields.map(field => renderField(field.label, data[field.key], field.type))}
          </dl>
        </div>
      );
    };

    const renderArraySection = (title: string, data: any[], itemRenderer: (item: any, index: number) => JSX.Element) => {
      if (!Array.isArray(data) || data.length === 0) return null;

      return (
        <div key={title} className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-orange-400 mb-4">{title}</h3>
          <div className="space-y-3">
            {data.map((item, index) => itemRenderer(item, index))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Domain Information */}
        {renderSection('Domain Information', { domain: data.domain }, [
          { key: 'domain', label: 'Domain Name' },
        ])}

        {/* Registration Information */}
        {renderSection('Registration Information', data.registration, [
          { key: 'registrar', label: 'Registrar' },
          { key: 'createdDate', label: 'Creation Date', type: 'date' },
          { key: 'expirationDate', label: 'Expiration Date', type: 'date' },
          { key: 'updatedDate', label: 'Last Updated', type: 'date' },
          { key: 'registrarUrl', label: 'Registrar URL' },
          { key: 'registrarIanaId', label: 'Registrar IANA ID' },
        ])}

        {/* Registrant Information */}
        {renderSection('Registrant Information', data.registrant, [
          { key: 'name', label: 'Name' },
          { key: 'organization', label: 'Organization' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'country', label: 'Country' },
          { key: 'state', label: 'State/Province' },
          { key: 'city', label: 'City' },
          { key: 'street', label: 'Street Address' },
          { key: 'postalCode', label: 'Postal Code' },
        ])}

        {/* Admin Contact Information */}
        {renderSection('Admin Contact', data.admin, [
          { key: 'name', label: 'Name' },
          { key: 'organization', label: 'Organization' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'country', label: 'Country' },
          { key: 'state', label: 'State/Province' },
          { key: 'city', label: 'City' },
        ])}

        {/* Technical Contact Information */}
        {renderSection('Technical Contact', data.tech, [
          { key: 'name', label: 'Name' },
          { key: 'organization', label: 'Organization' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'country', label: 'Country' },
          { key: 'state', label: 'State/Province' },
          { key: 'city', label: 'City' },
        ])}

        {/* Technical Information */}
        {renderSection('Technical Information', data.technical, [
          { key: 'nameServers', label: 'Name Servers' },
          { key: 'status', label: 'Domain Status', type: 'status' },
          { key: 'dnssec', label: 'DNSSEC' },
        ])}

        {/* Website Validation */}
        {data.website && renderSection('Website Validation', data.website, [
          { key: 'hasWebsite', label: 'Website Accessible', type: 'status' },
          { key: 'isAccessible', label: 'Website Reachable', type: 'status' },
          { key: 'hasDns', label: 'DNS Resolution', type: 'status' },
          { key: 'responseTime', label: 'Response Time' },
        ])}

        {/* Contact Information from Website */}
        {data.website?.contacts && renderSection('Website Contact Information', data.website.contacts, [
          { key: 'emails', label: 'Email Addresses' },
          { key: 'phones', label: 'Phone Numbers' },
          { key: 'addresses', label: 'Addresses' },
        ])}

        {/* Social Media */}
        {data.website?.socialMedia && renderArraySection('Social Media Presence', data.website.socialMedia, (platform, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <span className="text-white font-medium">{platform.platform}</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              platform.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {platform.exists ? 'Found' : 'Not Found'}
            </span>
          </div>
        ))}

        {/* Risk Assessment */}
        {data.riskFactors && renderArraySection('Risk Factors', data.riskFactors, (factor, index) => (
          <div key={index} className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-500 rounded-lg">
            <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
            <span className="text-red-300">{factor}</span>
          </div>
        ))}

        {/* Metadata */}
        {data.metadata && renderSection('Lookup Information', data.metadata, [
          { key: 'lookupTime', label: 'Lookup Duration (ms)' },
          { key: 'source', label: 'Data Source' },
          { key: 'timestamp', label: 'Lookup Time', type: 'date' },
        ])}

        {/* Fallback: Show raw data if no structured sections have data */}
        {(!data.registration && !data.registrant && !data.technical && !data.website) && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-orange-400 mb-4">Raw Response Data</h3>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
              <pre className="text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Raw Data Button */}
        <div className="text-center">
          <button
            onClick={() => setShowRawJsonModal(true)}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
          >
            View Raw JSON Data
          </button>
        </div>
      </div>
    );
  };

  // Modal component for raw JSON
  const RawJsonModal: React.FC<{ isOpen: boolean; onClose: () => void; data: WhoisData }> = ({ 
    isOpen, 
    onClose, 
    data 
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-orange-400">Raw JSON Data</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Test message to verify rendering */}
          <div className="text-center mb-4 p-4 bg-green-900/20 border border-green-500 rounded-lg">
            <p className="text-green-300">React is rendering! App component loaded successfully.</p>
          </div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-orange-400 mb-2">
              Title Company Vetter
            </h1>
            <p className="text-gray-400">
              Comprehensive domain validation and risk assessment
            </p>
          </div>

          {/* Input Form */}
          <div className="bg-gray-900 rounded-lg p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <UrlInput
                value={url}
                onChange={setUrl}
                placeholder="Enter domain name (e.g., legacytitleok.com)"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner />
                    <span className="ml-2">Vetting Domain...</span>
                  </div>
                ) : (
                  'Vet Title Company'
                )}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="text-red-400 font-semibold">Error:</div>
                <div className="ml-2 text-red-300">{error}</div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {whoisData && (
            <div className="bg-gray-900 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-orange-400">
                  WHOIS Report
                </h2>
                <div className="text-sm text-gray-400">
                  Domain: {whoisData.domain || 'Unknown'}
                </div>
              </div>
              
              {renderReport(whoisData)}
            </div>
          )}

          {/* Raw JSON Modal */}
          {whoisData && (
            <RawJsonModal
              isOpen={showRawJsonModal}
              onClose={() => setShowRawJsonModal(false)}
              data={whoisData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
