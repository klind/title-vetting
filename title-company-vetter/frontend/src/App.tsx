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

  // Component to render ALL data dynamically from any JSON structure
  const renderReport = (data: WhoisData): React.ReactElement => {
    const renderKeyValue = (key: string, value: any, depth: number = 0): React.ReactElement | null => {
      if (value === null || value === undefined) return null;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle nested objects - recursively render all nested fields
        const nestedItems = Object.entries(value).map(([nestedKey, nestedValue]) => 
          renderKeyValue(`${key}.${nestedKey}`, nestedValue, depth + 1)
        ).filter(Boolean);
        
        if (nestedItems.length === 0) return null;
        
        return (
          <div key={key} className="space-y-1">
            {nestedItems}
          </div>
        );
      } else if (Array.isArray(value)) {
        // Handle arrays - show all array items
        if (value.length === 0) return null;
        
        return (
          <div key={key} className="py-1">
            <span className="text-sm text-gray-400">{key}:</span>
            <div className="ml-4 mt-1">
              {value.map((item, index) => (
                <div key={index} className="text-sm text-white font-mono">
                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </div>
              ))}
            </div>
          </div>
        );
      } else {
        // Handle simple values
        let displayValue = String(value);
        
        // Format dates if they look like dates
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          try {
            const date = new Date(value);
            displayValue = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } catch {
            // Keep original value if date parsing fails
          }
        }
        
        return (
          <div key={key} className="flex justify-between items-center py-1">
            <span className="text-sm text-gray-400">{key}:</span>
            <span className="text-sm text-white font-mono max-w-xs truncate" title={String(value)}>
              {displayValue}
            </span>
          </div>
        );
      }
    };

    // Recursively flatten the entire data object to get ALL fields
    const flattenObject = (obj: any, prefix: string = ''): Array<{ key: string; value: any }> => {
      const result: Array<{ key: string; value: any }> = [];
      
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively flatten nested objects
          result.push(...flattenObject(value, newKey));
        } else {
          // Add simple values and arrays
          result.push({ key: newKey, value });
        }
      }
      
      return result;
    };

    // Get ALL data from the response, regardless of structure
    const allData = flattenObject(data);
    
    // Split all data into two columns
    const midPoint = Math.ceil(allData.length / 2);
    const leftColumn = allData.slice(0, midPoint);
    const rightColumn = allData.slice(midPoint);

    return (
      <>
        {/* Left Column - First half of ALL data */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-400 mb-3">
              All Data (Part 1) - {leftColumn.length} fields
            </h3>
            <div className="space-y-1">
              {leftColumn.map(({ key, value }) => renderKeyValue(key, value))}
            </div>
          </div>
        </div>

        {/* Right Column - Second half of ALL data */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-400 mb-3">
              All Data (Part 2) - {rightColumn.length} fields
            </h3>
            <div className="space-y-1">
              {rightColumn.map(({ key, value }) => renderKeyValue(key, value))}
            </div>
          </div>
        </div>
      </>
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

  // ExpandableSection component
  const ExpandableSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }> = ({ title, children, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="mb-6 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-orange-400 group bg-gray-900 hover:bg-gray-800 transition-colors"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="text-xl font-semibold text-orange-400">{title}</span>
          <svg
            className={`w-6 h-6 text-orange-400 transform transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {open && <div className="px-6 pb-6 pt-2">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
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

          {/* Expandable Sections */}
          <ExpandableSection title="Domain Validation (WHOIS)" defaultOpen>
            {whoisData ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-orange-400">
                    WHOIS Report
                  </h2>
                  <div className="text-sm text-gray-400">
                    Domain: {whoisData.domain || 'Unknown'}
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {renderReport(whoisData)}
                </div>
                <div className="text-center mt-6">
                  <button
                    onClick={() => setShowRawJsonModal(true)}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
                  >
                    View Raw JSON Data
                  </button>
                </div>
                {showRawJsonModal && (
                  <RawJsonModal
                    isOpen={showRawJsonModal}
                    onClose={() => setShowRawJsonModal(false)}
                    data={whoisData}
                  />
                )}
              </div>
            ) : (
              <div className="text-gray-400">No WHOIS data yet. Submit a domain above to see results.</div>
            )}
          </ExpandableSection>
          <ExpandableSection title="Website Validation">
            <div className="text-gray-400">Website validation results will appear here in the future.</div>
          </ExpandableSection>
          <ExpandableSection title="Social Media">
            <div className="text-gray-400">Social media validation results will appear here in the future.</div>
          </ExpandableSection>
        </div>
      </div>
    </div>
  );
};

export default App;
