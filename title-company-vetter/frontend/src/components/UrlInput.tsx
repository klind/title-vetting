import React, { useState, useCallback } from 'react';
import { ValidationError } from '../types/whois';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
  validationErrors?: ValidationError[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UrlInput({ 
  onSubmit, 
  loading, 
  validationErrors = [], 
  className = '',
  placeholder = 'https://example-title-company.com',
  disabled = false 
}: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get validation error for URL field
  const urlError = validationErrors.find(error => error.field === 'url')?.message || localError;

  /**
   * Real-time URL validation
   */
  const validateUrl = useCallback((input: string): string | null => {
    if (!input.trim()) return null;

    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;
    if (!urlRegex.test(input.trim())) {
      return 'Please enter a valid URL (e.g., https://example.com)';
    }

    return null;
  }, []);

  /**
   * Handles input change with real-time validation
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUrl(newValue);
    
    // Clear local error when user starts typing
    if (localError) {
      setLocalError(null);
    }

    // Validate on blur or when URL looks complete
    if (newValue.includes('.') && newValue.length > 10) {
      const error = validateUrl(newValue);
      setLocalError(error);
    }
  }, [localError, validateUrl]);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      setLocalError('Please enter a URL');
      return;
    }
    
    const error = validateUrl(trimmedUrl);
    if (error) {
      setLocalError(error);
      return;
    }
    
    setLocalError(null);
    onSubmit(trimmedUrl);
  }, [url, validateUrl, onSubmit]);

  /**
   * Handles input blur
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (url.trim()) {
      const error = validateUrl(url.trim());
      setLocalError(error);
    }
  }, [url, validateUrl]);

  /**
   * Handles input focus
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setLocalError(null);
  }, []);

  /**
   * Handles keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setUrl('');
      setLocalError(null);
      e.currentTarget.blur();
    }
  }, []);

  /**
   * Example URLs for quick testing
   */
  const exampleUrls = [
    'https://www.titlecompany.com',
    'https://example-title.com',
    'https://securetitle.org',
  ];

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label 
            htmlFor="url-input" 
            className="block text-sm font-medium text-gray-700"
          >
            Title Company Website URL
          </label>
          
          <div className="relative">
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={handleChange}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || loading}
              className={`
                input-field
                ${urlError ? 'input-field-error' : ''}
                ${isFocused ? 'ring-2 ring-primary-500 border-primary-500' : ''}
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? 'url-error' : undefined}
              autoComplete="url"
              spellCheck={false}
            />
            
            {/* Clear button */}
            {url && !loading && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  setLocalError(null);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear URL"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Error message */}
          {urlError && (
            <p id="url-error" className="text-sm text-error-600 flex items-center gap-1">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {urlError}
            </p>
          )}
          
          {/* Help text */}
          {!urlError && !isFocused && (
            <p className="text-sm text-gray-500">
              Enter the website URL of the title company you want to verify
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || !!urlError || !url.trim()}
          className={`
            btn-primary w-full
            ${loading ? 'cursor-wait' : ''}
          `}
          aria-describedby="submit-help"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Checking...
            </span>
          ) : (
            'Vet Title Company'
          )}
        </button>
        
        <p id="submit-help" className="text-xs text-gray-500 text-center">
          We'll verify domain registration information and assess potential risks
        </p>
      </form>
      
      {/* Example URLs (only show when not loading and no input) */}
      {!loading && !url && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
          <div className="space-y-1">
            {exampleUrls.map((exampleUrl, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setUrl(exampleUrl)}
                className="block w-full text-left text-sm text-primary-600 hover:text-primary-700 hover:underline transition-colors"
              >
                {exampleUrl}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}