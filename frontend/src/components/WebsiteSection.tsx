import React from 'react';
import type { WebsiteValidation } from '../types/whois';

interface WebsiteSectionProps {
  data: WebsiteValidation;
  className?: string;
}

const WebsiteSection: React.FC<WebsiteSectionProps> = ({ data, className = '' }) => {

  return (
    <div className={`space-y-4 ${className}`}>


      {/* Website Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Website Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-orange-400 mb-3">Basic Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Has Website:</span>
              <span className={`font-mono ${data.hasWebsite ? 'text-green-400' : 'text-red-400'}`}>
                {data.hasWebsite ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Accessible:</span>
              <span className={`font-mono ${data.isAccessible ? 'text-green-400' : 'text-red-400'}`}>
                {data.isAccessible ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Has DNS:</span>
              <span className={`font-mono ${data.hasDns ? 'text-green-400' : 'text-red-400'}`}>
                {data.hasDns ? 'Yes' : 'No'}
              </span>
            </div>
            {data.statusCode && (
              <div className="flex justify-between">
                <span className="text-gray-400">Status Code:</span>
                <span className={`font-mono ${data.statusCode === 200 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {data.statusCode}
                </span>
              </div>
            )}
            {data.contentType && (
              <div className="flex justify-between">
                <span className="text-gray-400">Content Type:</span>
                <span className="text-white font-mono text-xs">{data.contentType}</span>
              </div>
            )}
            {data.responseTime && (
              <div className="flex justify-between">
                <span className="text-gray-400">Response Time:</span>
                <span className="text-white font-mono">{data.responseTime}ms</span>
              </div>
            )}
            {data.title && (
              <div className="flex justify-between">
                <span className="text-gray-400">Page Title:</span>
                <span className="text-white text-xs text-right break-words max-w-xs">{data.title}</span>
              </div>
            )}
            {data.redirectUrl && (
              <div className="flex justify-between">
                <span className="text-gray-400">Redirect URL:</span>
                <span className="text-blue-400 text-xs text-right break-all max-w-xs">{data.redirectUrl}</span>
              </div>
            )}
          </div>
        </div>

        {/* SSL Information */}
        {data.ssl && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-md font-semibold text-orange-400 mb-3">SSL Certificate</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Has SSL:</span>
                <span className={`font-mono ${data.ssl.hasSSL ? 'text-green-400' : 'text-red-400'}`}>
                  {data.ssl.hasSSL ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Valid SSL:</span>
                <span className={`font-mono ${data.ssl.isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {data.ssl.isValid ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Self-Signed:</span>
                <span className={`font-mono ${data.ssl.isSelfSigned ? 'text-yellow-400' : 'text-green-400'}`}>
                  {data.ssl.isSelfSigned ? 'Yes' : 'No'}
                </span>
              </div>
              {data.ssl.error && (
                <div className="space-y-1">
                  <span className="text-gray-400">SSL Error:</span>
                  <div className="text-red-400 text-xs break-words bg-gray-700 p-2 rounded">
                    {data.ssl.error}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Contact Information */}
      {data.contacts && (data.contacts.emails.length > 0 || data.contacts.phones.length > 0 || data.contacts.addresses.length > 0) && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-md font-semibold text-orange-400 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Addresses */}
            {data.contacts.emails.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">
                  Email Addresses ({data.contacts.emails.length})
                </h5>
                <div className="space-y-1">
                  {data.contacts.emails.map((email, index) => (
                    <div key={index} className="text-xs text-blue-400 font-mono break-all">
                      {email}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phone Numbers */}
            {data.contacts.phones.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">
                  Phone Numbers ({data.contacts.phones.length})
                </h5>
                <div className="space-y-1">
                  {data.contacts.phones.map((phone, index) => (
                    <div key={index} className="text-xs text-green-400 font-mono">
                      {phone}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Addresses */}
            {data.contacts.addresses.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">
                  Addresses ({data.contacts.addresses.length})
                </h5>
                <div className="space-y-1">
                  {data.contacts.addresses.map((address, index) => (
                    <div key={index} className="text-xs text-yellow-400 break-words">
                      {address}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Information */}
      {data.error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <h4 className="text-md font-semibold text-red-400 mb-2">Validation Error</h4>
          <div className="text-sm text-red-300 break-words">
            {data.error}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteSection; 