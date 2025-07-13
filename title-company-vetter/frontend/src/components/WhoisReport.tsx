import React from 'react';
import { WhoisReport as WhoisReportType, RiskLevel, RiskAssessment } from '../types/whois';

interface WhoisReportProps {
  report: WhoisReportType;
  riskAssessment?: RiskAssessment;
  className?: string;
  onNewLookup?: () => void;
}

export function WhoisReport({ 
  report, 
  riskAssessment, 
  className = '',
  onNewLookup 
}: WhoisReportProps) {
  
  /**
   * Gets the risk level color classes
   */
  const getRiskLevelClasses = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.LOW:
        return 'bg-success-100 text-success-800 border-success-200';
      case RiskLevel.MEDIUM:
        return 'bg-warning-100 text-warning-800 border-warning-200';
      case RiskLevel.HIGH:
        return 'bg-error-100 text-error-800 border-error-200';
      case RiskLevel.CRITICAL:
        return 'bg-red-100 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Gets the risk level icon
   */
  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.LOW:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case RiskLevel.MEDIUM:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case RiskLevel.HIGH:
      case RiskLevel.CRITICAL:
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Calculates days until expiration
   */
  const getDaysUntilExpiration = (expirationDate?: string): string => {
    if (!expirationDate) return '';
    
    try {
      const expiration = new Date(expirationDate);
      const now = new Date();
      const diffTime = expiration.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return `Expired ${Math.abs(diffDays)} days ago`;
      } else if (diffDays === 0) {
        return 'Expires today';
      } else if (diffDays === 1) {
        return 'Expires tomorrow';
      } else {
        return `Expires in ${diffDays} days`;
      }
    } catch {
      return '';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              WHOIS Report
            </h2>
            <p className="text-primary-100 text-sm mt-1">
              {report.domain}
            </p>
          </div>
          {onNewLookup && (
            <button
              onClick={onNewLookup}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-md transition-colors text-sm font-medium"
            >
              New Lookup
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Risk Assessment */}
        {riskAssessment && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
            
            <div className={`p-4 rounded-lg border ${getRiskLevelClasses(riskAssessment.level)}`}>
              <div className="flex items-center gap-3">
                {getRiskLevelIcon(riskAssessment.level)}
                <div>
                  <div className="font-semibold text-sm uppercase tracking-wide">
                    {riskAssessment.level} Risk
                  </div>
                  <div className="text-sm opacity-90">
                    Risk Score: {riskAssessment.score}/100
                  </div>
                </div>
              </div>
            </div>

            {riskAssessment.factors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Risk Factors</h4>
                <ul className="space-y-1">
                  {riskAssessment.factors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-warning-500 rounded-full mt-2 flex-shrink-0" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {riskAssessment.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {riskAssessment.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Registration Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Registration Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Domain</dt>
                <dd className="text-sm text-gray-900 font-mono">{report.domain}</dd>
              </div>
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Registrar</dt>
                <dd className="text-sm text-gray-900">
                  {report.registration.registrar || 'Not available'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                <dd className="text-sm text-gray-900">
                  {formatDate(report.registration.createdDate)}
                </dd>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Expiration Date</dt>
                <dd className="text-sm text-gray-900">
                  <div>{formatDate(report.registration.expirationDate)}</div>
                  {report.registration.expirationDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      {getDaysUntilExpiration(report.registration.expirationDate)}
                    </div>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">WHOIS Server</dt>
                <dd className="text-sm text-gray-900 font-mono break-all">
                  {report.registration.registrarWhoisServer || 'Not available'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">
                  {report.technical.status || 'Not available'}
                </dd>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Registrant */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Registrant</h4>
              <div className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</dt>
                  <dd className="text-sm text-gray-900">
                    {report.registrant.name || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Organization</dt>
                  <dd className="text-sm text-gray-900">
                    {report.registrant.organization || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                  <dd className="text-sm text-gray-900 break-all">
                    {report.registrant.email || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Country</dt>
                  <dd className="text-sm text-gray-900">
                    {report.registrant.country || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                  <dd className="text-sm text-gray-900">
                    {report.registrant.phone || 'Not available'}
                  </dd>
                </div>
              </div>
            </div>

            {/* Administrative Contact */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Administrative</h4>
              <div className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</dt>
                  <dd className="text-sm text-gray-900">
                    {report.admin.name || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                  <dd className="text-sm text-gray-900 break-all">
                    {report.admin.email || 'Not available'}
                  </dd>
                </div>
              </div>
            </div>

            {/* Technical Contact */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">Technical</h4>
              <div className="space-y-2">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</dt>
                  <dd className="text-sm text-gray-900">
                    {report.tech.name || 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                  <dd className="text-sm text-gray-900 break-all">
                    {report.tech.email || 'Not available'}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 mb-2">Name Servers</dt>
              <dd>
                {report.technical.nameServers && report.technical.nameServers.length > 0 ? (
                  <ul className="space-y-1">
                    {report.technical.nameServers.map((ns, index) => (
                      <li key={index} className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                        {ns}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-gray-500">Not available</span>
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">DNSSEC</dt>
              <dd className="text-sm text-gray-900">
                {report.technical.dnssec || 'Not available'}
              </dd>
            </div>
          </div>
        </div>

        {/* Additional Risk Factors */}
        {report.riskFactors.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Additional Risk Factors</h3>
            <ul className="space-y-2">
              {report.riskFactors.map((factor, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-4 h-4 text-warning-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>
              Lookup completed in {report.metadata.lookupTime}ms
            </span>
            <span>•</span>
            <span>
              Source: {report.metadata.source}
            </span>
            <span>•</span>
            <span>
              {new Date(report.metadata.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified card variant for displaying basic domain info
 */
export function WhoisReportCard({ 
  report, 
  riskAssessment, 
  onClick,
  className = '' 
}: {
  report: WhoisReportType;
  riskAssessment?: RiskAssessment;
  onClick?: () => void;
  className?: string;
}) {
  const getRiskLevelColor = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.LOW: return 'text-success-600';
      case RiskLevel.MEDIUM: return 'text-warning-600';
      case RiskLevel.HIGH: return 'text-error-600';
      case RiskLevel.CRITICAL: return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 truncate">{report.domain}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {report.registrant.organization || report.registrant.name || 'Unknown organization'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Registered: {report.registration.createdDate ? 
              new Date(report.registration.createdDate).toLocaleDateString() : 
              'Unknown'
            }
          </p>
        </div>
        
        {riskAssessment && (
          <div className="text-right">
            <div className={`text-sm font-medium ${getRiskLevelColor(riskAssessment.level)}`}>
              {riskAssessment.level.toUpperCase()}
            </div>
            <div className="text-xs text-gray-500">
              {riskAssessment.score}/100
            </div>
          </div>
        )}
      </div>
    </div>
  );
}