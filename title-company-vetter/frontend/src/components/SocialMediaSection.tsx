import React from 'react';
import type { SocialMediaValidation } from '../types/whois';

interface SocialMediaSectionProps {
  data: SocialMediaValidation;
  className?: string;
}

const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({ data, className = '' }) => {
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return '📘';
      case 'x':
        return '🐦';
      case 'linkedin':
        return '💼';
      case 'instagram':
        return '📷';
      default:
        return '🌐';
    }
  };

  const getCredibilityColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCredibilityText = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    if (score >= 40) return 'Low';
    return 'Very Low';
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Social Media Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-orange-400">
          Social Media Presence
        </h3>
        <div className="flex items-center space-x-4">
          {data.totalProfiles !== undefined && (
            <span className="text-sm text-gray-400">
              {data.totalProfiles} profile{data.totalProfiles !== 1 ? 's' : ''}
            </span>
          )}
          {data.credibilityScore !== undefined && (
            <span className={`text-sm font-medium ${getCredibilityColor(data.credibilityScore)}`}>
              {getCredibilityText(data.credibilityScore)} Credibility ({data.credibilityScore}/100)
            </span>
          )}
        </div>
      </div>

      {/* Social Media Summary */}
      {(data.totalProfiles !== undefined || data.verifiedProfiles !== undefined || data.hasConsistentPresence !== undefined) && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-orange-400 mb-3">Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {data.totalProfiles !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Total Profiles:</span>
                <span className="text-white font-mono">{data.totalProfiles}</span>
              </div>
            )}
            {data.verifiedProfiles !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Verified Profiles:</span>
                <span className={`font-mono ${data.verifiedProfiles > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {data.verifiedProfiles}
                </span>
              </div>
            )}
            {data.hasConsistentPresence !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-400">Consistent Presence:</span>
                <span className={`font-mono ${data.hasConsistentPresence ? 'text-green-400' : 'text-yellow-400'}`}>
                  {data.hasConsistentPresence ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Social Media Profiles */}
      {data.profiles && data.profiles.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-orange-400 mb-3">
            Social Media Profiles ({data.profiles.length})
          </h4>
          <div className="space-y-3">
            {data.profiles.map((profile, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getPlatformIcon(profile.platform)}</span>
                    <span className="text-white font-medium capitalize">{profile.platform}</span>
                    <span className={`text-xs px-2 py-1 rounded ${profile.exists ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {profile.exists ? 'Found' : 'Not Found'}
                    </span>
                    {profile.verified && (
                      <span className="text-xs px-2 py-1 rounded bg-blue-900 text-blue-300">
                        Verified
                      </span>
                    )}
                  </div>
                  {profile.followers !== undefined && (
                    <span className="text-sm text-gray-400">
                      {profile.followers.toLocaleString()} followers
                    </span>
                  )}
                </div>
                
                {profile.urls && profile.urls.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-gray-400">URLs:</span>
                    {profile.urls.map((url, urlIndex) => (
                      <div key={urlIndex} className="text-xs text-blue-400 font-mono break-all bg-gray-600 p-2 rounded">
                        {url}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vetting Assessment */}
      {data.vettingAssessment && data.vettingAssessment.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-orange-400 mb-3">Vetting Assessment</h4>
          <div className="space-y-2">
            {data.vettingAssessment.map((assessment, index) => {
              const isPositive = assessment.includes('✅') || assessment.includes('🟢');
              const isWarning = assessment.includes('⚠️') || assessment.includes('🟡');
              const isNegative = assessment.includes('❌') || assessment.includes('🔴');
              
              let colorClass = 'text-gray-300';
              if (isPositive) colorClass = 'text-green-300';
              else if (isWarning) colorClass = 'text-yellow-300';
              else if (isNegative) colorClass = 'text-red-300';
              
              return (
                <div key={index} className={`text-sm ${colorClass} flex items-start space-x-2`}>
                  <span className="mt-1">•</span>
                  <span>{assessment}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Social Media Data */}
      {(!data.profiles || data.profiles.length === 0) && !data.error && (
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-gray-400 text-sm">
            <span className="text-2xl mb-2 block">📱</span>
            No social media profiles found or analyzed.
          </div>
        </div>
      )}

      {/* Error Information */}
      {data.error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h4 className="text-md font-semibold text-red-400 mb-2">Social Media Analysis Error</h4>
          <div className="text-sm text-red-300 break-words">
            {data.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialMediaSection; 