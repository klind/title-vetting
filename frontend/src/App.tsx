import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import LoadingSpinner from './components/LoadingSpinner';
import WhoisSection from './components/WhoisSection';
import WebsiteSection from './components/WebsiteSection';
import SocialMediaSection from './components/SocialMediaSection';
import { RiskAssessmentSection } from './components/RiskAssessmentSection';
import { useDomainAnalysis } from './hooks/useDomainAnalysis';
import type { CombinedReport, WhoisReport as WhoisReportType } from './types/whois';

const App: React.FC = () => {
  console.log('App component rendering...');
  
  const [url, setUrl] = useState('');
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  
  // Use the domain analysis hook instead of manual state management
  const {
    loading,
    error,
    data: whoisReport,
    progress,
    state,
    lookupDomain,
    reset
  } = useDomainAnalysis();

  // Transform WhoisReport back to CombinedReport format for compatibility with existing UI
  const transformToCombinedReport = (whoisReport: WhoisReportType): CombinedReport => {
    return {
      data: {
        whois: {
          domain: whoisReport.domain,
          tld: whoisReport.domain.split('.').pop() || '',
          ianaServer: '',
          registryServer: null,
          registrarServer: null,
          parsedData: {
            'Registry Domain ID': whoisReport.registryDomainId,
            'Registrant Name': whoisReport.registrant.name,
            'Registrant Organization': whoisReport.registrant.organization,
            'Registrant Email': whoisReport.registrant.email,
            'Registrant Phone': whoisReport.registrant.phone,
            'Registrant Street': whoisReport.registrant.street,
            'Registrant City': whoisReport.registrant.city,
            'Registrant State/Province': whoisReport.registrant.state,
            'Registrant Postal Code': whoisReport.registrant.postalCode,
            'Registrant Country': whoisReport.registrant.country,
            'Admin Name': whoisReport.admin.name,
            'Admin Organization': whoisReport.admin.organization,
            'Admin Email': whoisReport.admin.email,
            'Admin Phone': whoisReport.admin.phone,
            'Admin Street': whoisReport.admin.street,
            'Admin City': whoisReport.admin.city,
            'Admin State/Province': whoisReport.admin.state,
            'Admin Postal Code': whoisReport.admin.postalCode,
            'Admin Country': whoisReport.admin.country,
            'Tech Name': whoisReport.tech.name,
            'Tech Organization': whoisReport.tech.organization,
            'Tech Email': whoisReport.tech.email,
            'Tech Phone': whoisReport.tech.phone,
            'Tech Street': whoisReport.tech.street,
            'Tech City': whoisReport.tech.city,
            'Tech State/Province': whoisReport.tech.state,
            'Tech Postal Code': whoisReport.tech.postalCode,
            'Tech Country': whoisReport.tech.country,
            'Creation Date': whoisReport.registration.createdDate,
            'Registrar Registration Expiration Date': whoisReport.registration.expirationDate,
            'Updated Date': whoisReport.registration.updatedDate,
            'Registrar': whoisReport.registration.registrar,
            'Registrar WHOIS Server': whoisReport.registration.registrarWhoisServer,
            'Registrar URL': whoisReport.registration.registrarUrl,
            'Registrar IANA ID': whoisReport.registration.registrarIanaId,
            'Registrar Abuse Contact Email': whoisReport.registration.registrarAbuseContactEmail,
            'Registrar Abuse Contact Phone': whoisReport.registration.registrarAbuseContactPhone,
            'Name Server': whoisReport.technical.nameServers?.[0],
            'Domain Status': whoisReport.technical.status,
            'DNSSEC': whoisReport.technical.dnssec,
                     },
           rawData: whoisReport.rawWhoisData,
           metadata: whoisReport.metadata,
         },
         website: whoisReport.website,
         socialMedia: whoisReport.socialMedia,
       },
      riskFactors: [], // Legacy field, now handled by riskAssessment
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with URL:', url);
    if (!url.trim()) return;

    try {
      // Add protocol if missing
      let fullUrl = url.trim();
      if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
        fullUrl = `https://${fullUrl}`;
      }

      console.log('Starting domain analysis for:', fullUrl);
      await lookupDomain(fullUrl);
    } catch (err) {
      console.error('Domain analysis failed:', err);
      // Error is already handled by the hook
    }
  };

  // Get the report data for display
  const reportData = whoisReport ? transformToCombinedReport(whoisReport) : null;

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
            
            {/* Progress Bar */}
            {loading && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">{state.currentStep}</span>
                  <span className="text-sm text-gray-300">{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
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
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-400 font-semibold">Error:</div>
                <div className="ml-2 text-red-300">{error}</div>
              </div>
              <button
                onClick={reset}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {reportData && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Risk Assessment Section */}
            {whoisReport?.riskAssessment && (
              <ExpandableSection title="Risk Assessment" defaultOpen>
                <RiskAssessmentSection riskAssessment={whoisReport.riskAssessment} />
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
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
