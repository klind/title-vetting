import React from 'react';
import { LoadingProps, ProcessingStatus } from '../types/whois';

interface LoadingSpinnerProps extends LoadingProps {
  status?: ProcessingStatus;
  progress?: number;
  currentStep?: string;
  showProgress?: boolean;
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
}

export function LoadingSpinner({ 
  size = 'md',
  color = 'primary',
  text,
  status = ProcessingStatus.IDLE,
  progress = 0,
  currentStep,
  showProgress = false,
  variant = 'spinner',
  className = '',
  children 
}: LoadingSpinnerProps) {
  
  // Size configurations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12',
  };

  // Color configurations
  const colorClasses = {
    primary: 'border-primary-600',
    success: 'border-success-600',
    warning: 'border-warning-600',
    error: 'border-error-600',
    gray: 'border-gray-600',
  };

  /**
   * Renders the spinning circle variant
   */
  const renderSpinner = () => (
    <div 
      className={`
        loading-spinner 
        ${sizeClasses[size]} 
        ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary}
      `}
      role="status"
      aria-label={text || currentStep || 'Loading'}
    >
      <span className="sr-only">{text || currentStep || 'Loading...'}</span>
    </div>
  );

  /**
   * Renders the pulsing dots variant
   */
  const renderDots = () => (
    <div className="flex space-x-1" role="status" aria-label={text || currentStep || 'Loading'}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`
            ${size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}
            ${colorClasses[color as keyof typeof colorClasses]?.replace('border-', 'bg-') || 'bg-primary-600'}
            rounded-full animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
      <span className="sr-only">{text || currentStep || 'Loading...'}</span>
    </div>
  );

  /**
   * Renders the pulse variant
   */
  const renderPulse = () => (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color as keyof typeof colorClasses]?.replace('border-', 'bg-') || 'bg-primary-600'}
        rounded-full animate-pulse-slow opacity-75
      `}
      role="status"
      aria-label={text || currentStep || 'Loading'}
    >
      <span className="sr-only">{text || currentStep || 'Loading...'}</span>
    </div>
  );

  /**
   * Renders the bars variant
   */
  const renderBars = () => (
    <div className="flex space-x-1" role="status" aria-label={text || currentStep || 'Loading'}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`
            ${size === 'sm' ? 'w-1 h-4' : size === 'lg' ? 'w-2 h-8' : 'w-1.5 h-6'}
            ${colorClasses[color as keyof typeof colorClasses]?.replace('border-', 'bg-') || 'bg-primary-600'}
            rounded-sm animate-pulse
          `}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s',
          }}
        />
      ))}
      <span className="sr-only">{text || currentStep || 'Loading...'}</span>
    </div>
  );

  /**
   * Renders the appropriate variant
   */
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      default:
        return renderSpinner();
    }
  };

  /**
   * Gets status text based on processing status
   */
  const getStatusText = () => {
    if (text) return text;
    if (currentStep) return currentStep;
    
    switch (status) {
      case ProcessingStatus.VALIDATING:
        return 'Validating input...';
      case ProcessingStatus.FETCHING:
        return 'Connecting to service...';
      case ProcessingStatus.PROCESSING:
        return 'Processing data...';
      case ProcessingStatus.COMPLETED:
        return 'Complete!';
      case ProcessingStatus.FAILED:
        return 'Failed';
      default:
        return 'Loading...';
    }
  };

  /**
   * Renders progress bar if enabled
   */
  const renderProgressBar = () => {
    if (!showProgress) return null;

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`
              h-2 rounded-full transition-all duration-300 ease-out
              ${colorClasses[color as keyof typeof colorClasses]?.replace('border-', 'bg-') || 'bg-primary-600'}
            `}
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress: ${Math.round(progress)}%`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoadingIndicator()}
      
      {showProgress ? (
        renderProgressBar()
      ) : (
        (text || currentStep) && (
          <p className="text-sm text-gray-600 text-center animate-pulse">
            {getStatusText()}
          </p>
        )
      )}
      
      {children && (
        <div className="text-center">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Simple inline spinner for buttons and small spaces
 */
export function InlineSpinner({ 
  size = 'sm', 
  color = 'primary',
  className = '' 
}: Pick<LoadingSpinnerProps, 'size' | 'color' | 'className'>) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const colorClasses = {
    primary: 'border-primary-600',
    success: 'border-success-600',
    warning: 'border-warning-600',
    error: 'border-error-600',
    gray: 'border-gray-600',
    white: 'border-white',
  };

  return (
    <div
      className={`
        inline-block animate-spin rounded-full border-2 border-gray-300
        ${sizeClasses[size]}
        ${colorClasses[color as keyof typeof colorClasses] || colorClasses.primary}
        border-t-transparent
        ${className}
      `}
      role="status"
      aria-hidden="true"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Full page loading overlay
 */
export function LoadingOverlay({ 
  isVisible, 
  text, 
  progress, 
  currentStep,
  showProgress = false,
  variant = 'spinner' 
}: {
  isVisible: boolean;
  text?: string;
  progress?: number;
  currentStep?: string;
  showProgress?: boolean;
  variant?: LoadingSpinnerProps['variant'];
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
        <LoadingSpinner
          size="lg"
          text={text}
          progress={progress}
          currentStep={currentStep}
          showProgress={showProgress}
          variant={variant}
          className="py-4"
        />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLoader({ 
  lines = 3, 
  className = '' 
}: { 
  lines?: number; 
  className?: string; 
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`
            h-4 bg-gray-200 rounded
            ${i === lines - 1 ? 'w-3/4' : 'w-full'}
          `}
        />
      ))}
    </div>
  );
}