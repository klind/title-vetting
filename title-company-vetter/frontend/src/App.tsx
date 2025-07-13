import React, { useState, useCallback, useEffect } from 'react';
import { UrlInput } from './components/UrlInput';
import { LoadingSpinner, LoadingOverlay } from './components/LoadingSpinner';
import { WhoisReport } from './components/WhoisReport';
import { useWhoisLookup } from './hooks/useWhoisLookup';
import { ProcessingStatus, RiskLevel } from './types/whois';
import './App.css';

/**
 * Error Boundary Component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset?: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-error-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please refresh the page or try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary w-full"
              >
                Refresh Page
              </button>
              {this.props.onReset && (
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                    this.props.onReset?.();
                  }}
                  className="btn-secondary w-full"
                >
                  Try Again
                </button>
              )}
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
                <pre className="mt-2 text-xs text-gray-700 bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}

/**
 * Main Application Component
 */
function App() {
  const [showResults, setShowResults] = useState(false);
  const {
    state,
    lookupDomain,
    reset,
    validateUrl,
    getRiskAssessment,
    loading,
    error,
    data: whoisData,
    status,
    progress,
  } = useWhoisLookup();

  /**
   * Handles URL submission for WHOIS lookup
   */
  const handleUrlSubmit = useCallback(async (url: string) => {
    try {
      await lookupDomain(url);
      setShowResults(true);
    } catch (error) {
      console.error('Lookup failed:', error);
    }
  }, [lookupDomain]);

  /**
   * Handles starting a new lookup
   */
  const handleNewLookup = useCallback(() => {
    reset();
    setShowResults(false);
  }, [reset]);

  /**
   * Handles keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (loading) {
          // Could implement abort functionality here if needed
        } else if (showResults) {
          handleNewLookup();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, showResults, handleNewLookup]);

  /**
   * Gets the appropriate loading message based on status
   */
  const getLoadingMessage = (): string => {
    switch (status) {
      case ProcessingStatus.VALIDATING:
        return 'Validating URL...';
      case ProcessingStatus.FETCHING:
        return 'Connecting to WHOIS service...';
      case ProcessingStatus.PROCESSING:
        return 'Processing domain information...';
      default:
        return 'Processing request...';
    }
  };

  /**
   * Risk assessment from the data
   */
  const riskAssessment = whoisData ? getRiskAssessment(whoisData) : state.riskAssessment;

  return (
    <ErrorBoundary onReset={handleNewLookup}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Title Company Vetter</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Verify domain registration information and assess potential risks
                </p>
              </div>
              
              {showResults && (
                <button
                  onClick={handleNewLookup}
                  className="btn-secondary"
                  disabled={loading}
                >
                  New Lookup
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!showResults ? (
            /* Input Form */
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Verify Title Company Legitimacy
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Enter a title company's website URL to perform a comprehensive WHOIS lookup 
                  and risk assessment. We'll analyze domain registration information, identify 
                  potential red flags, and provide recommendations for due diligence.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-8">
                <UrlInput
                  onSubmit={handleUrlSubmit}
                  loading={loading}
                  validationErrors={state.validationErrors}
                  disabled={loading}
                />
                
                {/* Loading State */}
                {loading && (
                  <div className="mt-8">
                    <LoadingSpinner
                      size="lg"
                      variant="spinner"
                      showProgress={true}
                      progress={progress}
                      currentStep={state.currentStep}
                      text={getLoadingMessage()}
                    />
                  </div>
                )}
                
                {/* Error State */}
                {error && !loading && (
                  <div className="mt-6 p-4 bg-error-50 border border-error-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-error-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-error-800">
                          Lookup Failed
                        </h3>
                        <p className="text-sm text-error-700 mt-1">
                          {error}
                        </p>
                        <div className="mt-3">
                          <button
                            onClick={() => reset()}
                            className="text-sm text-error-600 hover:text-error-700 font-medium"
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-primary-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Domain Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Comprehensive WHOIS lookup with registration details, contact information, and technical data.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-primary-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                  <p className="text-sm text-gray-600">
                    Automated analysis of potential red flags and risk factors based on domain patterns.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="text-primary-600 mb-3">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Recommendations</h3>
                  <p className="text-sm text-gray-600">
                    Actionable insights and recommendations for due diligence procedures.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              {whoisData && (
                <WhoisReport
                  report={whoisData}
                  riskAssessment={riskAssessment}
                  onNewLookup={handleNewLookup}
                />
              )}
            </div>
          )}
        </main>

        {/* Loading Overlay */}
        <LoadingOverlay
          isVisible={loading && status === ProcessingStatus.FETCHING}
          text={getLoadingMessage()}
          progress={progress}
          showProgress={true}
          variant="spinner"
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;
