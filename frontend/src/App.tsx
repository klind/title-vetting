import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import LoadingSpinner from './components/LoadingSpinner';
import WhoisSection from './components/WhoisSection';
import WebsiteSection from './components/WebsiteSection';
import SocialMediaSection from './components/SocialMediaSection';
import { WhoisReport } from './components/WhoisReport';
import type { CombinedReport, WhoisReport as WhoisReportType } from './types/whois';

const App: React.FC = () => {
  console.log('App component rendering...');
  
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<CombinedReport | null>(null);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);

  // Transform CombinedReport to WhoisReportType
  const transformToWhoisReport = (combinedReport: CombinedReport): WhoisReportType => {
    const whoisData = combinedReport.data.whois.parsedData;
    return {
      domain: combinedReport.data.whois.domain,
      registryDomainId: whoisData['Registry Domain ID'],
      registrant: {
        name: whoisData['Registrant Name'],
        organization: whoisData['Registrant Organization'],
        email: whoisData['Registrant Email'],
        phone: whoisData['Registrant Phone'],
        street: whoisData['Registrant Street'],
        city: whoisData['Registrant City'],
        state: whoisData['Registrant State/Province'],
        postalCode: whoisData['Registrant Postal Code'],
        country: whoisData['Registrant Country'],
      },
      admin: {
        name: whoisData['Admin Name'],
        organization: whoisData['Admin Organization'],
        email: whoisData['Admin Email'],
        phone: whoisData['Admin Phone'],
        street: whoisData['Admin Street'],
        city: whoisData['Admin City'],
        state: whoisData['Admin State/Province'],
        postalCode: whoisData['Admin Postal Code'],
        country: whoisData['Admin Country'],
      },
      tech: {
        name: whoisData['Tech Name'],
        organization: whoisData['Tech Organization'],
        email: whoisData['Tech Email'],
        phone: whoisData['Tech Phone'],
        street: whoisData['Tech Street'],
        city: whoisData['Tech City'],
        state: whoisData['Tech State/Province'],
        postalCode: whoisData['Tech Postal Code'],
        country: whoisData['Tech Country'],
      },
      registration: {
        createdDate: whoisData['Creation Date'],
        expirationDate: whoisData['Registrar Registration Expiration Date'],
        updatedDate: whoisData['Updated Date'],
        registrar: whoisData['Registrar'],
        registrarWhoisServer: whoisData['Registrar WHOIS Server'],
        registrarUrl: whoisData['Registrar URL'],
        registrarIanaId: whoisData['Registrar IANA ID'],
        registrarAbuseContactEmail: whoisData['Registrar Abuse Contact Email'],
        registrarAbuseContactPhone: whoisData['Registrar Abuse Contact Phone'],
      },
      technical: {
        nameServers: whoisData['Name Server'] ? [whoisData['Name Server']] : [],
        status: whoisData['Domain Status'],
        dnssec: whoisData['DNSSEC'],
      },
      website: combinedReport.data.website,
      riskAssessment: (combinedReport as any).riskAssessment, // The risk assessment from the backend
      rawWhoisData: combinedReport.data.whois.rawData,
      riskFactors: combinedReport.riskFactors || [],
      metadata: {
        lookupTime: combinedReport.data.whois.metadata.lookupTime,
        source: combinedReport.data.whois.metadata.source,
        timestamp: combinedReport.data.whois.metadata.timestamp,
      },
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with URL:', url);
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      // Add protocol if missing
      let fullUrl = url.trim();
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
      }

      console.log('Making API call to:', fullUrl);
      const apiBaseUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3001';
      const response = await fetch(`${apiBaseUrl}/combined`, {
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
      const combinedReport = data.data || data;
      console.log('Processed combined report:', combinedReport);
      setReportData(combinedReport);
    } catch (err) {
      console.error('API error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Expandable Section Component
  const ExpandableSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
  }> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 text-left bg-gray-800 hover:bg-gray-750 transition-colors duration-200 flex items-center justify-between"
        >
          <h2 className="text-xl font-semibold text-orange-400">{title}</h2>
          <svg
            className={`w-5 h-5 text-orange-400 transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="px-6 py-4">
            {children}
          </div>
        )}
      </div>
    );
  };

  // Modal component for raw JSON
  const RawJsonModal: React.FC<{ isOpen: boolean; onClose: () => void; data: CombinedReport }> = ({ 
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent mb-4">
            Title Company Vetter Beta 1.0
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Comprehensive domain analysis for title companies. Get WHOIS data, website validation, and social media presence in one report.
          </p>
        </div>

        {/* URL Input Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <UrlInput
              value={url}
              onChange={setUrl}
              disabled={loading}
              placeholder="Enter domain or URL (e.g., pattentitle.com)"
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                                 <div className="flex items-center justify-center">
                   <LoadingSpinner />
                   <span className="ml-2">Analyzing Domain...</span>
                 </div>
              ) : (
                'Analyze Domain'
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
            <div className="flex items-center">
              <div className="text-red-400 font-semibold">Error:</div>
              <div className="ml-2 text-red-300">{error}</div>
            </div>
          </div>
        )}

        {/* Results */}
        {reportData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Risk Assessment Section */}
            {(reportData as any).riskAssessment && (
              <ExpandableSection title="Risk Assessment" defaultOpen>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-white">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">Risk Assessment</h3>
                      <div className="text-xs text-gray-400">
                        {new Date((reportData as any).riskAssessment.timestamp).toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Overall Risk Score */}
                    <div className={`p-4 rounded-lg border-2 mb-6 ${
                      (reportData as any).riskAssessment.riskLevel === 'low' ? 'bg-green-100 text-green-800 border-green-200' :
                      (reportData as any).riskAssessment.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      (reportData as any).riskAssessment.riskLevel === 'high' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-red-200 text-red-900 border-red-300'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-bold text-lg uppercase tracking-wide">
                              {(reportData as any).riskAssessment.riskLevel} Risk
                            </div>
                            <div className="text-sm opacity-90">
                              Overall Score: {(reportData as any).riskAssessment.overallScore}/{(reportData as any).riskAssessment.maxScore}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {(reportData as any).riskAssessment.overallScore}
                          </div>
                          <div className="text-sm opacity-90">
                            /{(reportData as any).riskAssessment.maxScore}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm opacity-90">
                        {(reportData as any).riskAssessment.riskSummary}
                      </div>
                    </div>

                    {/* Key Issues */}
                    {(reportData as any).riskAssessment.keyIssues.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-orange-400 mb-2">Key Issues</h4>
                        <ul className="space-y-1">
                          {(reportData as any).riskAssessment.keyIssues.map((issue: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-red-300">
                              <span className="text-red-400 mt-1">⚠️</span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {(reportData as any).riskAssessment.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-400 mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {(reportData as any).riskAssessment.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-blue-300">
                              <span className="text-blue-400 mt-1">💡</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </ExpandableSection>
            )}

            {/* WHOIS Report Section */}
            <ExpandableSection title="WHOIS Report" defaultOpen>
              <WhoisSection data={reportData.data.whois} />
            </ExpandableSection>

            {/* Website Validation Section */}
            <ExpandableSection title="Website Validation" defaultOpen>
              <WebsiteSection data={reportData.data.website} />
            </ExpandableSection>

            {/* Social Media Section */}
            <ExpandableSection title="Social Media Analysis" defaultOpen>
              <SocialMediaSection data={reportData.data.socialMedia} />
            </ExpandableSection>

            {/* Raw JSON Button */}
            <div className="text-center">
              <button
                onClick={() => setShowRawJsonModal(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 font-medium"
              >
                View Raw JSON Data
              </button>
            </div>

            {/* Raw JSON Modal */}
            {showRawJsonModal && (
              <RawJsonModal
                isOpen={showRawJsonModal}
                onClose={() => setShowRawJsonModal(false)}
                data={reportData}
              />
            )}
          </div>
        )}

        {/* No Results Message */}
        {!reportData && !loading && !error && (
          <div className="text-center text-gray-400 max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg">
              Enter a domain above to start your comprehensive analysis. 
              We'll provide detailed WHOIS information, website validation, and social media presence data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
