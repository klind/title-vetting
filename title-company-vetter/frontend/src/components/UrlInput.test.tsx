import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrlInput } from './UrlInput';
import { ValidationError } from '../types/whois';

describe('UrlInput', () => {
  const mockOnSubmit = vi.fn();
  
  const defaultProps = {
    onSubmit: mockOnSubmit,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<UrlInput {...defaultProps} />);
      
      expect(screen.getByLabelText(/title company website url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/example-title-company\.com/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /vet title company/i })).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<UrlInput {...defaultProps} placeholder="https://custom.com" />);
      
      expect(screen.getByPlaceholderText('https://custom.com')).toBeInTheDocument();
    });

    it('shows help text by default', () => {
      render(<UrlInput {...defaultProps} />);
      
      expect(screen.getByText(/enter the website url of the title company/i)).toBeInTheDocument();
    });

    it('shows example URLs when not loading and no input', () => {
      render(<UrlInput {...defaultProps} />);
      
      expect(screen.getByText(/try these examples/i)).toBeInTheDocument();
      expect(screen.getByText('https://www.titlecompany.com')).toBeInTheDocument();
      expect(screen.getByText('https://example-title.com')).toBeInTheDocument();
      expect(screen.getByText('https://securetitle.org')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('updates input value when user types', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://example.com');
      
      expect(input).toHaveValue('https://example.com');
    });

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://example.com');
      
      const clearButton = screen.getByLabelText(/clear url/i);
      await user.click(clearButton);
      
      expect(input).toHaveValue('');
    });

    it('sets example URL when example is clicked', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const exampleUrl = screen.getByText('https://www.titlecompany.com');
      await user.click(exampleUrl);
      
      const input = screen.getByLabelText(/title company website url/i);
      expect(input).toHaveValue('https://www.titlecompany.com');
    });

    it('clears input when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://example.com');
      await user.keyboard('{Escape}');
      
      expect(input).toHaveValue('');
    });

    it('hides help text when input is focused', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.click(input);
      
      expect(screen.queryByText(/enter the website url of the title company/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with trimmed URL when form is submitted', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      const submitButton = screen.getByRole('button', { name: /vet title company/i });
      
      await user.type(input, '  https://example.com  ');
      await user.click(submitButton);
      
      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com');
    });

    it('does not submit empty URL', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /vet title company/i });
      await user.click(submitButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/please enter a url/i)).toBeInTheDocument();
    });

    it('does not submit invalid URL', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      const submitButton = screen.getByRole('button', { name: /vet title company/i });
      
      await user.type(input, 'invalid-url');
      await user.click(submitButton);
      
      expect(mockOnSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    });

    it('submits form on Enter key', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://example.com');
      await user.keyboard('{Enter}');
      
      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('Validation', () => {
    it('shows validation error for invalid URL format', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'not-a-valid-url');
      await user.tab(); // Trigger blur
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });

    it('shows external validation errors', () => {
      const validationErrors: ValidationError[] = [
        { field: 'url', message: 'External validation error' }
      ];
      
      render(<UrlInput {...defaultProps} validationErrors={validationErrors} />);
      
      expect(screen.getByText('External validation error')).toBeInTheDocument();
    });

    it('clears validation errors when user starts typing', async () => {
      const user = userEvent.setup();
      const validationErrors: ValidationError[] = [
        { field: 'url', message: 'External validation error' }
      ];
      
      render(<UrlInput {...defaultProps} validationErrors={validationErrors} />);
      
      expect(screen.getByText('External validation error')).toBeInTheDocument();
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'h');
      
      expect(screen.queryByText('External validation error')).not.toBeInTheDocument();
    });

    it('shows real-time validation for long URLs', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://invalid-url-format');
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<UrlInput {...defaultProps} loading={true} />);
      
      const submitButton = screen.getByRole('button', { name: /checking/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('disables input when loading', () => {
      render(<UrlInput {...defaultProps} loading={true} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      expect(input).toBeDisabled();
    });

    it('hides clear button when loading', async () => {
      const user = userEvent.setup();
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      await user.type(input, 'https://example.com');
      
      // Clear button should be visible
      expect(screen.getByLabelText(/clear url/i)).toBeInTheDocument();
      
      // Re-render with loading state
      render(<UrlInput {...defaultProps} loading={true} />);
      
      // Clear button should be hidden
      expect(screen.queryByLabelText(/clear url/i)).not.toBeInTheDocument();
    });

    it('hides example URLs when loading', () => {
      render(<UrlInput {...defaultProps} loading={true} />);
      
      expect(screen.queryByText(/try these examples/i)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables input and submit button when disabled', () => {
      render(<UrlInput {...defaultProps} disabled={true} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      const submitButton = screen.getByRole('button', { name: /vet title company/i });
      
      expect(input).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<UrlInput {...defaultProps} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      expect(input).toHaveAttribute('type', 'url');
      expect(input).toHaveAttribute('autoComplete', 'url');
      expect(input).toHaveAttribute('spellCheck', 'false');
    });

    it('associates error message with input', () => {
      const validationErrors: ValidationError[] = [
        { field: 'url', message: 'Validation error' }
      ];
      
      render(<UrlInput {...defaultProps} validationErrors={validationErrors} />);
      
      const input = screen.getByLabelText(/title company website url/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'url-error');
    });

    it('provides proper button descriptions', () => {
      render(<UrlInput {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /vet title company/i });
      expect(submitButton).toHaveAttribute('aria-describedby', 'submit-help');
      
      const helpText = screen.getByText(/we'll verify domain registration information/i);
      expect(helpText).toHaveAttribute('id', 'submit-help');
    });
  });
});