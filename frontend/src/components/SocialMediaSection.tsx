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
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      case 'x':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
          </svg>
        );
      case 'linkedin':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
        );
      case 'instagram':
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 3.592-2.043 4.739-1.146 1.147-2.881 1.874-4.739 2.043-.394.036-.79.058-1.186.058-.396 0-.792-.022-1.186-.058-1.858-.169-3.593-.896-4.739-2.043C2.528 11.752 1.801 10.018 1.632 8.16 1.596 7.766 1.574 7.37 1.574 6.974c0-.396.022-.792.058-1.186.169-1.858.896-3.592 2.043-4.739C4.822.902 6.556.175 8.414.006 8.808-.03 9.204-.052 9.6-.052c.396 0 .792.022 1.186.058 1.858.169 3.593.896 4.739 2.043 1.147 1.146 1.874 2.881 2.043 4.739.036.394.058.79.058 1.186 0 .396-.022.792-.058 1.186z"/>
          </svg>
        );
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return 'text-blue-400';
      case 'x':
        return 'text-gray-400';
      case 'linkedin':
        return 'text-blue-500';
      case 'instagram':
        return 'text-pink-400';
      default:
        return 'text-gray-400';
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

  // Helper function to get profile data for a specific platform
  const getProfileForPlatform = (platform: string) => {
    return data.profiles?.find(p => p.platform.toLowerCase() === platform.toLowerCase());
  };

  // Define the 4 main platforms we want to show
  const platforms = ['linkedin', 'facebook', 'x', 'instagram'];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Social Media Header */}
      {data.credibilityScore !== undefined && (
        <div className="flex justify-end mb-4">
          <span className={`text-sm font-medium ${getCredibilityColor(data.credibilityScore)}`}>
            {getCredibilityText(data.credibilityScore)} Credibility ({data.credibilityScore}/100)
          </span>
        </div>
      )}

      {/* Social Media Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map((platform) => {
          const profile = getProfileForPlatform(platform);
          const platformColor = getPlatformColor(platform);
          
          return (
            <div key={platform} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-700">
              {/* Platform Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={platformColor}>
                  {getPlatformIcon(platform)}
                </div>
                <div>
                  <h4 className="text-white font-semibold capitalize">{platform}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      profile?.exists ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {profile?.exists ? 'Possible Match Found' : 'No Match Found'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Platform Details */}
              <div className="space-y-2 text-sm">
                {profile?.followers !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Followers:</span>
                    <span className="text-white font-mono">{profile.followers.toLocaleString()}</span>
                  </div>
                )}
                
                {profile?.urls && profile.urls.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-gray-400 text-xs">
                      {profile.urls.length === 1 ? 'Possible Match:' : `Possible Matches (${profile.urls.length}):`}
                    </span>
                    <div className="space-y-1">
                      {profile.urls.map((url, urlIndex) => (
                        <a 
                          key={urlIndex}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs break-all block"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                
                {!profile && (
                  <div className="text-gray-500 text-xs">
                    No profile data available
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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

      {/* Bot Detection Messages */}
      {data.botDetectionMessages && data.botDetectionMessages.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
          <h4 className="text-md font-semibold text-yellow-400 mb-2">⚠️ Bot Detection Notifications</h4>
          <div className="space-y-2">
            {data.botDetectionMessages.map((message, index) => (
              <div key={index} className="text-sm text-yellow-300 flex items-start space-x-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>{message}</span>
              </div>
            ))}
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