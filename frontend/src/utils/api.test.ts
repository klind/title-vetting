import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, createApiClient, isOnline, waitForOnline, formatApiError } from './api';
import { ErrorType } from '../types/whois';
import { createMockResponse } from '../test/setup';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigator.onLine = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('ApiClient', () => {
    describe('Constructor and Configuration', () => {
      it('creates client with default config', () => {
        const client = createApiClient({});
        const config = client.getConfig();
        
        expect(config.baseUrl).toBe('http://localhost:3000');
        expect(config.timeout).toBe(30000);
        expect(config.retries).toBe(3);
        expect(config.retryDelay).toBe(1000);
      });

      it('creates client with custom config', () => {
        const customConfig = {
          baseUrl: 'https://api.example.com',
          timeout: 10000,
          retries: 1,
          retryDelay: 500,
        };
        
        const client = createApiClient(customConfig);
        const config = client.getConfig();
        
        expect(config).toEqual(customConfig);
      });

      it('updates configuration', () => {
        const client = createApiClient({});
        
        client.updateConfig({ timeout: 15000 });
        
        expect(client.getConfig().timeout).toBe(15000);
      });
    });

    describe('Request Methods', () => {
      beforeEach(() => {
        mockFetch.mockResolvedValue(createMockResponse({ success: true, data: 'test' }));
      });

      it('makes GET request', async () => {
        const response = await apiClient.get('/test');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/test',
          expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }),
          })
        );
        
        expect(response.success).toBe(true);
      });

      it('makes POST request with data', async () => {
        const testData = { url: 'https://example.com' };
        
        await apiClient.post('/whois', testData);
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/whois',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(testData),
          })
        );
      });

      it('makes PUT request', async () => {
        const testData = { id: 1, name: 'test' };
        
        await apiClient.put('/resource/1', testData);
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/resource/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify(testData),
          })
        );
      });

      it('makes DELETE request', async () => {
        await apiClient.delete('/resource/1');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/resource/1',
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });

      it('handles custom headers', async () => {
        const customHeaders = { 'Authorization': 'Bearer token' };
        
        await apiClient.get('/test', { headers: customHeaders });
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer token',
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }),
          })
        );
      });
    });

    describe('URL Building', () => {
      it('builds URLs correctly with base URL', async () => {
        await apiClient.get('test');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/test',
          expect.any(Object)
        );
      });

      it('handles leading slashes in endpoints', async () => {
        await apiClient.get('/test');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/test',
          expect.any(Object)
        );
      });

      it('handles trailing slashes in base URL', async () => {
        const client = createApiClient({ baseUrl: 'https://api.example.com/' });
        
        await client.get('test');
        
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.example.com/test',
          expect.any(Object)
        );
      });
    });

    describe('Error Handling', () => {
      it('handles 400 Bad Request', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ error: 'Invalid input' }),
        });

        try {
          await apiClient.get('/test');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
          expect(error.message).toBe('Invalid input');
        }
      });

      it('handles 429 Rate Limited', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({ error: 'Rate limited' }),
        });

        try {
          await apiClient.get('/test');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR);
        }
      });

      it('handles 500 Internal Server Error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        });

        try {
          await apiClient.get('/test');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.API_ERROR);
          expect(error.message).toBe('Server error');
        }
      });

      it('handles network errors', async () => {
        mockFetch.mockRejectedValue(new TypeError('Network error'));

        try {
          await apiClient.get('/test');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.NETWORK_ERROR);
          expect(error.message).toBe('Network error occurred');
        }
      });

      it('handles timeout errors', async () => {
        mockFetch.mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(createMockResponse({})), 35000)
          )
        );

        try {
          await apiClient.get('/test', { timeout: 1000 });
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.TIMEOUT_ERROR);
        }
      });

      it('handles abort errors', async () => {
        mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

        try {
          await apiClient.get('/test');
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.NETWORK_ERROR);
          expect(error.message).toBe('Request was aborted');
        }
      });
    });

    describe('Retry Logic', () => {
      it('retries on retryable errors', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          })
          .mockResolvedValueOnce(createMockResponse({ success: true }));

        const response = await apiClient.get('/test', { retries: 2 });
        
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(response.success).toBe(true);
      });

      it('does not retry on non-retryable errors', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: () => Promise.resolve({ error: 'Invalid input' }),
        });

        try {
          await apiClient.get('/test', { retries: 2 });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(mockFetch).toHaveBeenCalledTimes(1);
        }
      });

      it('respects retry delay', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: () => Promise.resolve({ error: 'Server error' }),
          })
          .mockResolvedValueOnce(createMockResponse({ success: true }));

        const startTime = Date.now();
        await apiClient.get('/test', { retries: 1, retryDelay: 100 });
        
        // Fast-forward timers to simulate delay
        vi.advanceTimersByTime(100);
        
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('stops retrying after max retries', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: 'Server error' }),
        });

        try {
          await apiClient.get('/test', { retries: 2 });
          expect.fail('Should have thrown an error');
        } catch (error) {
          expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
        }
      });
    });

    describe('Request Abortion', () => {
      it('aborts all pending requests', () => {
        const client = createApiClient({});
        
        // Start multiple requests
        client.get('/test1');
        client.get('/test2');
        client.get('/test3');
        
        // Abort all
        expect(() => client.abortAll()).not.toThrow();
      });
    });

    describe('Body Serialization', () => {
      it('serializes object to JSON', async () => {
        const testData = { key: 'value' };
        
        await apiClient.post('/test', testData);
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: JSON.stringify(testData),
          })
        );
      });

      it('handles string body', async () => {
        const testData = 'plain text';
        
        await apiClient.post('/test', testData);
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: testData,
          })
        );
      });

      it('handles undefined body', async () => {
        await apiClient.post('/test');
        
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: undefined,
          })
        );
      });

      it('handles serialization errors', async () => {
        const circularObj: any = {};
        circularObj.self = circularObj;

        try {
          await apiClient.post('/test', circularObj);
          expect.fail('Should have thrown an error');
        } catch (error: any) {
          expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
          expect(error.message).toBe('Failed to serialize request body');
        }
      });
    });
  });

  describe('Utility Functions', () => {
    describe('isOnline', () => {
      it('returns true when online', () => {
        navigator.onLine = true;
        expect(isOnline()).toBe(true);
      });

      it('returns false when offline', () => {
        navigator.onLine = false;
        expect(isOnline()).toBe(false);
      });
    });

    describe('waitForOnline', () => {
      it('resolves immediately when already online', async () => {
        navigator.onLine = true;
        
        const promise = waitForOnline();
        
        await expect(promise).resolves.toBeUndefined();
      });

      it('waits for online event when offline', async () => {
        navigator.onLine = false;
        
        const promise = waitForOnline();
        
        // Simulate going online
        setTimeout(() => {
          navigator.onLine = true;
          window.dispatchEvent(new Event('online'));
        }, 100);
        
        vi.advanceTimersByTime(100);
        
        await expect(promise).resolves.toBeUndefined();
      });
    });

    describe('formatApiError', () => {
      it('formats string errors', () => {
        const formatted = formatApiError('Simple error message');
        expect(formatted).toBe('Simple error message');
      });

      it('formats network errors', () => {
        const error = {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network failed',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: true,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Network connection error. Please check your internet connection.');
      });

      it('formats timeout errors', () => {
        const error = {
          type: ErrorType.TIMEOUT_ERROR,
          message: 'Request timeout',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: true,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Request timed out. Please try again.');
      });

      it('formats rate limit errors', () => {
        const error = {
          type: ErrorType.RATE_LIMIT_ERROR,
          message: 'Too many requests',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: false,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Too many requests. Please wait a moment and try again.');
      });

      it('formats validation errors', () => {
        const error = {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Invalid URL provided',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: false,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Invalid URL provided');
      });

      it('formats API errors', () => {
        const error = {
          type: ErrorType.API_ERROR,
          message: 'Internal server error',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: true,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Internal server error');
      });

      it('formats unknown errors', () => {
        const error = {
          type: ErrorType.UNKNOWN_ERROR,
          message: 'Something went wrong',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: false,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Something went wrong');
      });

      it('handles errors without messages', () => {
        const error = {
          type: ErrorType.VALIDATION_ERROR,
          message: '',
          timestamp: '2024-01-01T00:00:00Z',
          retryable: false,
        };
        
        const formatted = formatApiError(error);
        expect(formatted).toBe('Invalid input provided.');
      });
    });
  });
});