import type { OptimizedRiskAssessmentResult, RiskLevel, OptimizedCategoryRiskAssessment } from '../types/whois';
import { RiskLevel as RiskLevelEnum } from '../types/whois';

interface RiskAssessmentSectionProps {
  riskAssessment: OptimizedRiskAssessmentResult;
  className?: string;
}

export function RiskAssessmentSection({ riskAssessment, className = '' }: RiskAssessmentSectionProps) {

  /**
   * Gets the risk level color classes
   */
  const getRiskLevelClasses = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevelEnum.LOW:
        return 'bg-green-100 text-green-800 border-green-200';
      case RiskLevelEnum.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case RiskLevelEnum.HIGH:
        return 'bg-red-100 text-red-800 border-red-200';
      case RiskLevelEnum.CRITICAL:
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Gets the risk level progress bar color
   */
  const getRiskLevelProgressColor = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevelEnum.LOW:
        return 'bg-green-500';
      case RiskLevelEnum.MEDIUM:
        return 'bg-yellow-500';
      case RiskLevelEnum.HIGH:
        return 'bg-red-500';
      case RiskLevelEnum.CRITICAL:
        return 'bg-red-700';
      default:
        return 'bg-gray-500';
    }
  };

  /**
   * Gets the risk level icon
   */
  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case RiskLevelEnum.LOW:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case RiskLevelEnum.MEDIUM:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case RiskLevelEnum.HIGH:
      case RiskLevelEnum.CRITICAL:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  /**
   * Gets category icon
   */
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'whois':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'website':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        );
      case 'socialMedia':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  /**
   * Progress bar component
   */
  const ProgressBar = ({ score, maxScore, level }: { score: number; maxScore: number; level: RiskLevel }) => {
    const percentage = (score / maxScore) * 100;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getRiskLevelProgressColor(level)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  /**
   * Category assessment card
   */
  const CategoryCard = ({ assessment }: { assessment: OptimizedCategoryRiskAssessment }) => {
    const categoryNames = {
      whois: 'WHOIS',
      website: 'Website',
      socialMedia: 'Social Media'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getCategoryIcon(assessment.category)}
            <span className="font-medium text-gray-900">
              {categoryNames[assessment.category]}
            </span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelClasses(assessment.riskLevel)}`}>
            {assessment.riskLevel.toUpperCase()}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Score</span>
            <span>{assessment.score}/{assessment.maxScore}</span>
          </div>
          <ProgressBar score={assessment.score} maxScore={assessment.maxScore} level={assessment.riskLevel} />
        </div>

        {assessment.contributingFactors.length > 0 && (
          <div className="text-xs text-gray-500">
            {assessment.contributingFactors.length} issue{assessment.contributingFactors.length > 1 ? 's' : ''} identified
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">Risk Assessment</h3>
        <div className="text-xs text-gray-500">
          {new Date(riskAssessment.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Overall Risk Score */}
      <div className={`p-6 rounded-lg border-2 ${getRiskLevelClasses(riskAssessment.riskLevel)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {getRiskLevelIcon(riskAssessment.riskLevel)}
            <div>
              <div className="font-bold text-lg uppercase tracking-wide">
                {riskAssessment.riskLevel} Risk
              </div>
              <div className="text-sm opacity-90">
                Overall Score: {riskAssessment.overallScore}/{riskAssessment.maxScore}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {riskAssessment.overallScore}
            </div>
            <div className="text-sm opacity-90">
              /{riskAssessment.maxScore}
            </div>
          </div>
        </div>

        <ProgressBar
          score={riskAssessment.overallScore}
          maxScore={riskAssessment.maxScore}
          level={riskAssessment.riskLevel}
        />

        <div className="mt-4 text-sm opacity-90">
          {riskAssessment.riskSummary}
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Category Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CategoryCard assessment={riskAssessment.whoisAssessment} />
          <CategoryCard assessment={riskAssessment.websiteAssessment} />
          <CategoryCard assessment={riskAssessment.socialMediaAssessment} />
        </div>
      </div>

      {/* Key Issues */}
      {riskAssessment.keyIssues.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Key Issues</h4>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul className="space-y-2">
              {riskAssessment.keyIssues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {riskAssessment.recommendations.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-blue-800">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                Always call the title or escrow company using a trusted phone number to verify wire instructions before sending funds.
              </li>
              {riskAssessment.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Contributing Factors Details */}
      {riskAssessment.contributingFactors.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Contributing Factors ({riskAssessment.contributingFactors.length})
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {riskAssessment.contributingFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {factor.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      {factor.category.toUpperCase()}
                    </div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">
                    +{factor.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}