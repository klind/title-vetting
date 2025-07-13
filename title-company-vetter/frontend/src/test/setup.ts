import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock environment variables
beforeAll(() => {
  Object.defineProperty(import.meta, 'env', {
    value: {
      VITE_API_ENDPOINT: 'http://localhost:3000',
      NODE_ENV: 'test',
    },
    writable: true,
  });
});

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock console.error to avoid noise in tests unless it's expected
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Helper function to create mock responses for fetch
export const createMockResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers({
      'content-type': 'application/json',
    }),
  } as Response);
};

// Mock data for tests
export const mockWhoisReport = {
  domain: 'example.com',
  registrant: {
    name: 'John Doe',
    organization: 'Example Title Company',
    email: 'john@example.com',
    country: 'US',
    phone: '+1-555-0123',
  },
  registration: {
    createdDate: '2020-01-01T00:00:00Z',
    expirationDate: '2025-01-01T00:00:00Z',
    registrar: 'Example Registrar',
    registrarWhoisServer: 'whois.example.com',
  },
  technical: {
    nameServers: ['ns1.example.com', 'ns2.example.com'],
    status: 'clientTransferProhibited',
    dnssec: 'unsigned',
  },
  admin: {
    name: 'Admin User',
    email: 'admin@example.com',
  },
  tech: {
    name: 'Tech User',
    email: 'tech@example.com',
  },
  riskFactors: [],
  metadata: {
    lookupTime: 1500,
    source: 'whois-service',
    timestamp: '2024-01-01T12:00:00Z',
  },
};

export const mockApiResponse = {
  success: true,
  data: mockWhoisReport,
  timestamp: '2024-01-01T12:00:00Z',
  requestId: 'test-request-id',
};