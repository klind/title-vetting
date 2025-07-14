import { beforeEach, afterEach, vi } from 'vitest';

/**
 * Global test setup and teardown
 */

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.API_RATE_LIMIT = '100'; // Higher limit for tests
process.env.CORS_ORIGIN = '*';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
process.env.WHOIS_TIMEOUT = '5000'; // Shorter timeout for tests
process.env.MAX_CONCURRENT_REQUESTS = '10';

/**
 * Setup before each test
 */
beforeEach(() => {
  // Clear all timers
  vi.clearAllTimers();
  
  // Reset all mocks
  vi.resetAllMocks();
  
  // Clear console to avoid log noise
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

/**
 * Cleanup after each test
 */
afterEach(() => {
  // Restore all mocks
  vi.restoreAllMocks();
  
  // Clear any remaining timers
  vi.clearAllTimers();
});

/**
 * Mock whois-json module for tests
 */
vi.mock('whois-json', () => ({
  default: vi.fn(),
}));

/**
 * Test utilities
 */
export const TestUtils = {
  /**
   * Creates a mock API Gateway event
   */
  createMockEvent: (overrides: any = {}) => ({
    httpMethod: 'POST',
    path: '/whois',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
    },
    body: JSON.stringify({ url: 'https://example.com' }),
    requestContext: {
      requestId: 'test-request-id',
      accountId: 'test-account',
      identity: {
        sourceIp: '127.0.0.1',
      },
    },
    queryStringParameters: null,
    ...overrides,
  }),

  /**
   * Creates a mock Lambda context
   */
  createMockContext: (overrides: any = {}) => ({
    awsRequestId: 'test-aws-request-id',
    functionName: 'test-function',
    functionVersion: '1.0.0',
    memoryLimitInMB: 256,
    getRemainingTimeInMillis: () => 30000,
    ...overrides,
  }),

  /**
   * Creates mock WHOIS data
   */
  createMockWhoisData: (overrides: any = {}) => ({
    domainName: 'example.com',
    registrantName: 'Test Registrant',
    registrantOrganization: 'Test Organization',
    registrantEmail: 'test@example.com',
    registrantCountry: 'US',
    creationDate: '2020-01-01T00:00:00Z',
    expirationDate: '2025-01-01T00:00:00Z',
    registrar: 'Test Registrar',
    nameServers: 'ns1.example.com ns2.example.com',
    status: 'ok',
    ...overrides,
  }),

  /**
   * Waits for a specified amount of time (useful for async tests)
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Creates a promise that rejects after a timeout
   */
  createTimeoutPromise: (ms: number, message = 'Timeout') =>
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
};