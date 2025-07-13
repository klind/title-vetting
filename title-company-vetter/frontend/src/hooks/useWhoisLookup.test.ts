import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWhoisLookup } from './useWhoisLookup';
import { ProcessingStatus, RiskLevel } from '../types/whois';
import { createMockResponse, mockWhoisReport, mockApiResponse } from '../test/setup';
import * as apiUtils from '../utils/api';

// Mock the API module
vi.mock('../utils/api', async () => {
  const actual = await vi.importActual('../utils/api');
  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
    isOnline: vi.fn(() => true),
  };
});

const mockApiClient = vi.mocked(apiUtils.apiClient);
const mockIsOnline = vi.mocked(apiUtils.isOnline);

describe('useWhoisLookup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline.mockReturnValue(true);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useWhoisLookup());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toBe(null);
      expect(result.current.status).toBe(ProcessingStatus.IDLE);
      expect(result.current.progress).toBe(0);
      expect(result.current.state.validationErrors).toEqual([]);
      expect(result.current.state.riskAssessment).toBeUndefined();
    });

    it('provides all required methods', () => {
      const { result } = renderHook(() => useWhoisLookup());

      expect(typeof result.current.lookupDomain).toBe('function');
      expect(typeof result.current.validateUrl).toBe('function');
      expect(typeof result.current.getRiskAssessment).toBe('function');
      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.abort).toBe('function');
    });
  });

  describe('URL Validation', () => {
    it('validates empty URL', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors = result.current.validateUrl('');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: 'url',
        message: 'URL is required'
      });
    });

    it('validates whitespace-only URL', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors = result.current.validateUrl('   ');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: 'url',
        message: 'URL cannot be empty'
      });
    });

    it('validates invalid URL format', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors = result.current.validateUrl('not-a-url');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: 'url',
        message: 'Please enter a valid URL (e.g., https://example.com)'
      });
    });

    it('rejects localhost URLs', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors = result.current.validateUrl('http://localhost:3000');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        field: 'url',
        message: 'Localhost URLs are not allowed'
      });
    });

    it('rejects private IP addresses', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors1 = result.current.validateUrl('http://192.168.1.1');
      expect(errors1[0].message).toBe('Private IP addresses are not allowed');

      const errors2 = result.current.validateUrl('http://10.0.0.1');
      expect(errors2[0].message).toBe('Private IP addresses are not allowed');
    });

    it('accepts valid URLs', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const errors = result.current.validateUrl('https://example.com');
      expect(errors).toHaveLength(0);
    });
  });

  describe('Risk Assessment', () => {
    it('calculates risk for newly created domain', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const recentReport = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
        }
      };

      const assessment = result.current.getRiskAssessment(recentReport);
      
      expect(assessment.level).toBe(RiskLevel.MEDIUM);
      expect(assessment.score).toBeGreaterThan(25);
      expect(assessment.factors).toContain('Domain created very recently (less than 30 days)');
      expect(assessment.recommendations).toContain('Exercise extra caution with newly registered domains');
    });

    it('calculates risk for soon-to-expire domain', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const expiringReport = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        }
      };

      const assessment = result.current.getRiskAssessment(expiringReport);
      
      expect(assessment.factors).toContain('Domain expires soon');
      expect(assessment.recommendations).toContain('Verify the company is renewing their domain registration');
    });

    it('detects privacy protection usage', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const privacyReport = {
        ...mockWhoisReport,
        registrant: {
          ...mockWhoisReport.registrant,
          name: 'Privacy Protection Service'
        }
      };

      const assessment = result.current.getRiskAssessment(privacyReport);
      
      expect(assessment.factors).toContain('Domain uses privacy protection service');
      expect(assessment.recommendations).toContain('Privacy protection is common but limits transparency');
    });

    it('detects missing contact information', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const noContactReport = {
        ...mockWhoisReport,
        registrant: {
          ...mockWhoisReport.registrant,
          email: undefined
        },
        admin: {
          ...mockWhoisReport.admin,
          email: undefined
        }
      };

      const assessment = result.current.getRiskAssessment(noContactReport);
      
      expect(assessment.factors).toContain('No public contact information available');
      expect(assessment.recommendations).toContain('Look for alternative contact methods on the website');
    });

    it('includes existing risk factors from backend', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const riskReport = {
        ...mockWhoisReport,
        riskFactors: ['Suspicious pattern detected', 'Typosquatting potential']
      };

      const assessment = result.current.getRiskAssessment(riskReport);
      
      expect(assessment.factors).toContain('Suspicious pattern detected');
      expect(assessment.factors).toContain('Typosquatting potential');
    });

    it('caps risk score at 100', () => {
      const { result } = renderHook(() => useWhoisLookup());

      const highRiskReport = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          createdDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          expirationDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        },
        registrant: {
          name: 'Privacy Protection Service',
          email: undefined
        },
        admin: { email: undefined },
        riskFactors: ['Factor 1', 'Factor 2', 'Factor 3', 'Factor 4', 'Factor 5']
      };

      const assessment = result.current.getRiskAssessment(highRiskReport);
      
      expect(assessment.score).toBeLessThanOrEqual(100);
    });

    it('determines correct risk levels based on score', () => {
      const { result } = renderHook(() => useWhoisLookup());

      // Low risk (score < 25)
      const lowRiskReport = { ...mockWhoisReport, riskFactors: [] };
      expect(result.current.getRiskAssessment(lowRiskReport).level).toBe(RiskLevel.LOW);

      // Medium risk (25 <= score < 50)
      const mediumRiskReport = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
        }
      };
      expect(result.current.getRiskAssessment(mediumRiskReport).level).toBe(RiskLevel.MEDIUM);
    });
  });

  describe('Domain Lookup', () => {
    it('handles offline state', async () => {
      mockIsOnline.mockReturnValue(false);
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      expect(result.current.error).toContain('No internet connection');
      expect(result.current.status).toBe(ProcessingStatus.FAILED);
    });

    it('handles validation errors', async () => {
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('invalid-url');
      });

      expect(result.current.state.validationErrors).toHaveLength(1);
      expect(result.current.error).toContain('Please enter a valid URL');
      expect(result.current.status).toBe(ProcessingStatus.FAILED);
    });

    it('successfully performs lookup', async () => {
      mockApiClient.post.mockResolvedValue(mockApiResponse);
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).toEqual(mockWhoisReport);
        expect(result.current.status).toBe(ProcessingStatus.COMPLETED);
        expect(result.current.error).toBe(null);
        expect(result.current.progress).toBe(100);
      });
    });

    it('updates progress during lookup', async () => {
      mockApiClient.post.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(mockApiResponse), 100);
        });
      });

      const { result } = renderHook(() => useWhoisLookup());
      const progressValues: number[] = [];

      await act(async () => {
        const promise = result.current.lookupDomain('https://example.com');
        
        // Check initial progress
        expect(result.current.progress).toBe(0);
        expect(result.current.status).toBe(ProcessingStatus.VALIDATING);
        
        await promise;
      });

      expect(result.current.progress).toBe(100);
      expect(result.current.status).toBe(ProcessingStatus.COMPLETED);
    });

    it('updates status during lookup process', async () => {
      mockApiClient.post.mockResolvedValue(mockApiResponse);
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        const promise = result.current.lookupDomain('https://example.com');
        
        // Initial status should be validating
        expect(result.current.status).toBe(ProcessingStatus.VALIDATING);
        
        await promise;
      });

      expect(result.current.status).toBe(ProcessingStatus.COMPLETED);
    });

    it('calculates risk assessment after successful lookup', async () => {
      mockApiClient.post.mockResolvedValue(mockApiResponse);
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      expect(result.current.state.riskAssessment).toBeDefined();
      expect(result.current.state.riskAssessment!.level).toBe(RiskLevel.LOW);
    });

    it('handles API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('API Error'));
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBe(null);
      expect(result.current.status).toBe(ProcessingStatus.FAILED);
    });

    it('handles API response without data', async () => {
      mockApiClient.post.mockResolvedValue({
        success: false,
        error: 'Domain not found'
      });
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Domain not found');
      expect(result.current.status).toBe(ProcessingStatus.FAILED);
    });
  });

  describe('Execute Method', () => {
    it('executes lookup with params', async () => {
      mockApiClient.post.mockResolvedValue(mockApiResponse);
      const { result } = renderHook(() => useWhoisLookup());

      await act(async () => {
        await result.current.execute({ url: 'https://example.com' });
      });

      expect(result.current.data).toEqual(mockWhoisReport);
      expect(mockApiClient.post).toHaveBeenCalledWith('/whois', { url: 'https://example.com' });
    });

    it('throws error when URL is missing', async () => {
      const { result } = renderHook(() => useWhoisLookup());

      await expect(async () => {
        await act(async () => {
          await result.current.execute();
        });
      }).rejects.toThrow('URL parameter is required');
    });
  });

  describe('Reset Functionality', () => {
    it('resets state to initial values', async () => {
      mockApiClient.post.mockResolvedValue(mockApiResponse);
      const { result } = renderHook(() => useWhoisLookup());

      // First perform a lookup
      await act(async () => {
        await result.current.lookupDomain('https://example.com');
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.progress).toBe(100);

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.data).toBe(null);
      expect(result.current.status).toBe(ProcessingStatus.IDLE);
      expect(result.current.progress).toBe(0);
      expect(result.current.state.validationErrors).toEqual([]);
      expect(result.current.state.riskAssessment).toBeUndefined();
    });
  });

  describe('Abort Functionality', () => {
    it('aborts ongoing request', async () => {
      const { result } = renderHook(() => useWhoisLookup());

      act(() => {
        result.current.lookupDomain('https://example.com');
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.abort();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Lookup was cancelled');
      expect(result.current.status).toBe(ProcessingStatus.FAILED);
    });
  });

  describe('Cleanup', () => {
    it('cleans up on unmount', () => {
      const { unmount } = renderHook(() => useWhoisLookup());
      
      // This should not throw any errors
      expect(() => unmount()).not.toThrow();
    });
  });
});