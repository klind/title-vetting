import type { WhoisReport as WhoisReportType, RiskAssessment } from '../types/whois';
import { RiskLevel } from '../types/whois';
import { RiskAssessmentSection } from './RiskAssessmentSection';

interface WhoisReportProps {
  report: WhoisReportType;
  className?: string;
  onNewLookup?: () => void;
}

export function WhoisReport({ 
  report, 
  className = '',
  onNewLookup 
}: WhoisReportProps) {

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

  /**
   * Renders a field with label and value
   */
  const renderField = (label: string, value: any, options?: { 
    isLink?: boolean; 
    isMonospace?: boolean; 
    isEmail?: boolean;
    showExpiration?: boolean;
  }) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
    
    return (
      <div>
        <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</dt>
        <dd className={`text-sm text-gray-900 ${options?.isMonospace ? 'font-mono' : ''} ${options?.isLink ? 'break-all' : ''}`}>
          {options?.isLink ? (
            <a href={displayValue} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700">
              {displayValue}
            </a>
          ) : options?.isEmail ? (
            <a href={`mailto:${displayValue}`} className="text-primary-600 hover:text-primary-700">
              {displayValue}
            </a>
          ) : (
            <>
              <div>{displayValue}</div>
              {options?.showExpiration && value && (
                <div className="text-xs text-gray-500 mt-1">
                  {getDaysUntilExpiration(value)}
                </div>
              )}
            </>
          )}
        </dd>
      </div>
    );
  };

  /**
   * Renders all fields from an object dynamically
   */
  const renderDynamicFields = (title: string, data: any, excludeKeys: string[] = []) => {
    if (!data || typeof data !== 'object') return null;

    const fields = Object.entries(data)
      .filter(([key, value]) => 
        !excludeKeys.includes(key) && 
        value !== undefined && 
        value !== null && 
        value !== '' &&
        typeof value !== 'object'
      );

    if (fields.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700 border-b border-gray-200 pb-2">{title}</h4>
        <div className="space-y-2">
          {fields.map(([key, value]) => 
            renderField(
              key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              value,
              {
                isLink: key.toLowerCase().includes('url'),
                isMonospace: key.toLowerCase().includes('id') || key.toLowerCase().includes('server'),
                isEmail: key.toLowerCase().includes('email'),
                showExpiration: key.toLowerCase().includes('expiration')
              }
            )
          )}
        </div>
      </div>
    );
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
        {report.riskAssessment && (
          <RiskAssessmentSection 
            riskAssessment={report.riskAssessment} 
            className="pb-6 border-b border-gray-200" 
          />
        )}

        {/* Domain Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Domain Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Domain', report.domain, { isMonospace: true })}
            {renderField('Registry Domain ID', report.registryDomainId, { isMonospace: true })}
          </div>
        </div>

        {/* Registration Information */}
        {report.registration && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Registration Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderDynamicFields('Registration Details', report.registration, [])}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderDynamicFields('Registrant', report.registrant, [])}
            {renderDynamicFields('Administrative', report.admin, [])}
            {renderDynamicFields('Technical', report.tech, [])}
          </div>
        </div>

        {/* Technical Details */}
        {report.technical && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Technical Details</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {renderDynamicFields('Technical Information', report.technical, [])}
            </div>
          </div>
        )}

        {/* Website Validation */}
        {report.website && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Website Validation</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(report.website, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Additional Risk Factors */}
        {report.riskFactors && report.riskFactors.length > 0 && (
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

        {/* Raw WHOIS Data (for debugging) */}
        {report.rawWhoisData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Raw WHOIS Data</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(report.rawWhoisData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Complete Report Data (for debugging) */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Complete Report Data</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        </div>

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