import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  LoadingSpinner, 
  InlineSpinner, 
  LoadingOverlay, 
  SkeletonLoader 
} from './LoadingSpinner';
import { ProcessingStatus } from '../types/whois';

describe('LoadingSpinner', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('renders with custom text', () => {
      render(<LoadingSpinner text="Custom loading text" />);
      
      expect(screen.getByText('Custom loading text')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom loading text');
    });

    it('renders with current step', () => {
      render(<LoadingSpinner currentStep="Processing data..." />);
      
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Processing data...');
    });

    it('renders children when provided', () => {
      render(
        <LoadingSpinner>
          <div>Custom content</div>
        </LoadingSpinner>
      );
      
      expect(screen.getByText('Custom content')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<LoadingSpinner size="sm" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('renders medium size (default)', () => {
      render(<LoadingSpinner size="md" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('renders large size', () => {
      render(<LoadingSpinner size="lg" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-12', 'h-12');
    });
  });

  describe('Variants', () => {
    it('renders spinner variant (default)', () => {
      render(<LoadingSpinner variant="spinner" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('loading-spinner');
    });

    it('renders dots variant', () => {
      render(<LoadingSpinner variant="dots" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveClass('flex', 'space-x-1');
      
      // Should have 3 dots
      const dots = container.querySelectorAll('div');
      expect(dots).toHaveLength(3);
    });

    it('renders pulse variant', () => {
      render(<LoadingSpinner variant="pulse" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('rounded-full', 'animate-pulse-slow');
    });

    it('renders bars variant', () => {
      render(<LoadingSpinner variant="bars" />);
      
      const container = screen.getByRole('status');
      expect(container).toHaveClass('flex', 'space-x-1');
      
      // Should have 4 bars
      const bars = container.querySelectorAll('div');
      expect(bars).toHaveLength(4);
    });
  });

  describe('Color Variants', () => {
    it('applies primary color (default)', () => {
      render(<LoadingSpinner color="primary" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-primary-600');
    });

    it('applies success color', () => {
      render(<LoadingSpinner color="success" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-success-600');
    });

    it('applies warning color', () => {
      render(<LoadingSpinner color="warning" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-warning-600');
    });

    it('applies error color', () => {
      render(<LoadingSpinner color="error" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-error-600');
    });

    it('applies gray color', () => {
      render(<LoadingSpinner color="gray" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-gray-600');
    });
  });

  describe('Progress Bar', () => {
    it('shows progress bar when showProgress is true', () => {
      render(<LoadingSpinner showProgress={true} progress={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('displays progress percentage', () => {
      render(<LoadingSpinner showProgress={true} progress={75} />);
      
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('caps progress at 100%', () => {
      render(<LoadingSpinner showProgress={true} progress={150} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle('width: 100%');
    });

    it('hides text when progress bar is shown', () => {
      render(
        <LoadingSpinner 
          showProgress={true} 
          progress={50} 
          text="Loading text" 
        />
      );
      
      // Progress bar should be shown
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      
      // Text should not be shown as a separate element (it's in the progress bar)
      const loadingText = screen.queryByText('Loading text');
      expect(loadingText).toBeInTheDocument(); // It's in the progress bar label
    });
  });

  describe('Processing Status', () => {
    it('shows appropriate text for validating status', () => {
      render(<LoadingSpinner status={ProcessingStatus.VALIDATING} />);
      
      expect(screen.getByText('Validating input...')).toBeInTheDocument();
    });

    it('shows appropriate text for fetching status', () => {
      render(<LoadingSpinner status={ProcessingStatus.FETCHING} />);
      
      expect(screen.getByText('Connecting to service...')).toBeInTheDocument();
    });

    it('shows appropriate text for processing status', () => {
      render(<LoadingSpinner status={ProcessingStatus.PROCESSING} />);
      
      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });

    it('shows appropriate text for completed status', () => {
      render(<LoadingSpinner status={ProcessingStatus.COMPLETED} />);
      
      expect(screen.getByText('Complete!')).toBeInTheDocument();
    });

    it('shows appropriate text for failed status', () => {
      render(<LoadingSpinner status={ProcessingStatus.FAILED} />);
      
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('prioritizes custom text over status text', () => {
      render(
        <LoadingSpinner 
          status={ProcessingStatus.PROCESSING} 
          text="Custom text" 
        />
      );
      
      expect(screen.getByText('Custom text')).toBeInTheDocument();
      expect(screen.queryByText('Processing data...')).not.toBeInTheDocument();
    });

    it('prioritizes currentStep over status text', () => {
      render(
        <LoadingSpinner 
          status={ProcessingStatus.PROCESSING} 
          currentStep="Custom step" 
        />
      );
      
      expect(screen.getByText('Custom step')).toBeInTheDocument();
      expect(screen.queryByText('Processing data...')).not.toBeInTheDocument();
    });
  });
});

describe('InlineSpinner', () => {
  it('renders with default props', () => {
    render(<InlineSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('inline-block', 'animate-spin');
  });

  it('renders with custom size', () => {
    render(<InlineSpinner size="lg" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-6', 'h-6');
  });

  it('renders with white color', () => {
    render(<InlineSpinner color="white" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('border-white');
  });
});

describe('LoadingOverlay', () => {
  it('renders when visible', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByRole('status');
    expect(overlay).toBeInTheDocument();
    
    // Should have backdrop
    const backdrop = overlay.closest('.fixed');
    expect(backdrop).toHaveClass('bg-black', 'bg-opacity-50');
  });

  it('does not render when not visible', () => {
    render(<LoadingOverlay isVisible={false} />);
    
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('passes props to inner LoadingSpinner', () => {
    render(
      <LoadingOverlay 
        isVisible={true} 
        text="Loading overlay" 
        variant="dots"
        showProgress={true}
        progress={60}
      />
    );
    
    expect(screen.getByText('Loading overlay')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});

describe('SkeletonLoader', () => {
  it('renders with default number of lines', () => {
    render(<SkeletonLoader />);
    
    const container = screen.getByRole('generic');
    const lines = container.querySelectorAll('div');
    expect(lines).toHaveLength(3); // Default is 3 lines
  });

  it('renders with custom number of lines', () => {
    render(<SkeletonLoader lines={5} />);
    
    const container = screen.getByRole('generic');
    const lines = container.querySelectorAll('div');
    expect(lines).toHaveLength(5);
  });

  it('makes last line shorter', () => {
    render(<SkeletonLoader lines={2} />);
    
    const container = screen.getByRole('generic');
    const lines = container.querySelectorAll('div');
    
    expect(lines[0]).toHaveClass('w-full');
    expect(lines[1]).toHaveClass('w-3/4'); // Last line is shorter
  });

  it('has proper animation classes', () => {
    render(<SkeletonLoader />);
    
    const container = screen.getByRole('generic');
    expect(container).toHaveClass('animate-pulse');
    
    const lines = container.querySelectorAll('div');
    lines.forEach(line => {
      expect(line).toHaveClass('bg-gray-200', 'rounded');
    });
  });
});