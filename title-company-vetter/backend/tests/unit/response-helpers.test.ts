import { describe, it, expect, vi } from 'vitest';
import { 
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
  createMethodNotAllowedResponse,
  getClientIp,
  parseRequestBody,
  isValidContentType,
  isMethodAllowed,
  StatusCodes
} from '../../src/response-helpers.js';
import { TestUtils } from '../setup.js';

describe('Response Helpers', () => {
  describe('createSuccessResponse', () => {
    it('should create a successful response', () => {
      const data = { message: 'success' };
      const event = TestUtils.createMockEvent();
      const context = TestUtils.createMockContext();

      const response = createSuccessResponse(data, event, context);

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
      expect(body.requestId).toBe(context.awsRequestId);
    });

    it('should work without event and context', () => {
      const data = { message: 'success' };
      const response = createSuccessResponse(data);

      expect(response.statusCode).toBe(StatusCodes.OK);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(data);
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const errorMessage = 'Something went wrong';
      const event = TestUtils.createMockEvent();
      const context = TestUtils.createMockContext();

      const response = createErrorResponse(errorMessage, event, context);

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('An unknown error occurred'); // String errors get this default message
      expect(body.requestId).toBe(context.awsRequestId);
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const response = createErrorResponse(error);

      expect(response.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Test error');
    });

    it('should handle custom status codes', () => {
      const errorMessage = 'Not found';
      const response = createErrorResponse(errorMessage, undefined, undefined, StatusCodes.NOT_FOUND);

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });

  describe('createCorsResponse', () => {
    it('should create a CORS preflight response', () => {
      const event = TestUtils.createMockEvent({ httpMethod: 'OPTIONS' });
      const context = TestUtils.createMockContext();

      const response = createCorsResponse(event, context);

      expect(response.statusCode).toBe(StatusCodes.OK);
      expect(response.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Methods');
      expect(response.headers).toHaveProperty('Access-Control-Allow-Headers');
      expect(response.body).toBe('');
    });
  });

  describe('createMethodNotAllowedResponse', () => {
    it('should create a method not allowed response', () => {
      const method = 'DELETE';
      const allowedMethods = ['GET', 'POST'];
      const event = TestUtils.createMockEvent({ httpMethod: method });
      const context = TestUtils.createMockContext();

      const response = createMethodNotAllowedResponse(method, allowedMethods, event, context);

      expect(response.statusCode).toBe(StatusCodes.METHOD_NOT_ALLOWED);
      expect(response.headers).toHaveProperty('Allow', 'GET, POST');
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Method DELETE not allowed');
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'X-Forwarded-For': '203.0.113.1, 70.41.3.18' }
      });

      const ip = getClientIp(event);
      expect(ip).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'X-Real-IP': '203.0.113.1' }
      });

      const ip = getClientIp(event);
      expect(ip).toBe('203.0.113.1');
    });

    it('should fallback to request context IP', () => {
      const event = TestUtils.createMockEvent();
      
      const ip = getClientIp(event);
      expect(ip).toBe('127.0.0.1');
    });

    it('should return unknown if no IP found', () => {
      const event = TestUtils.createMockEvent({
        requestContext: { ...TestUtils.createMockEvent().requestContext, identity: {} }
      });

      const ip = getClientIp(event);
      expect(ip).toBe('unknown');
    });
  });

  describe('parseRequestBody', () => {
    it('should parse valid JSON', () => {
      const body = '{"key": "value"}';
      const parsed = parseRequestBody(body);
      
      expect(parsed).toEqual({ key: 'value' });
    });

    it('should return null for null body', () => {
      const parsed = parseRequestBody(null);
      expect(parsed).toBeNull();
    });

    it('should throw error for invalid JSON', () => {
      const body = 'invalid json';
      
      expect(() => parseRequestBody(body)).toThrow('Invalid JSON');
    });

    it('should handle empty string', () => {
      const parsed = parseRequestBody('');
      expect(parsed).toBeNull();
    });
  });

  describe('isValidContentType', () => {
    it('should validate correct content type', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'Content-Type': 'application/json' }
      });

      const isValid = isValidContentType(event);
      expect(isValid).toBe(true);
    });

    it('should validate content type with charset', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });

      const isValid = isValidContentType(event);
      expect(isValid).toBe(true);
    });

    it('should reject invalid content type', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'Content-Type': 'text/plain' }
      });

      const isValid = isValidContentType(event);
      expect(isValid).toBe(false);
    });

    it('should handle missing content type', () => {
      const event = TestUtils.createMockEvent({
        headers: {}
      });

      const isValid = isValidContentType(event);
      expect(isValid).toBe(false);
    });

    it('should handle case insensitive headers', () => {
      const event = TestUtils.createMockEvent({
        headers: { 'content-type': 'application/json' }
      });

      const isValid = isValidContentType(event);
      expect(isValid).toBe(true);
    });
  });

  describe('isMethodAllowed', () => {
    it('should allow valid methods', () => {
      const isAllowed = isMethodAllowed('POST', ['GET', 'POST', 'PUT']);
      expect(isAllowed).toBe(true);
    });

    it('should reject invalid methods', () => {
      const isAllowed = isMethodAllowed('DELETE', ['GET', 'POST', 'PUT']);
      expect(isAllowed).toBe(false);
    });

    it('should handle case insensitive comparison', () => {
      const isAllowed = isMethodAllowed('post', ['GET', 'POST', 'PUT']);
      expect(isAllowed).toBe(true);
    });
  });

  describe('Environment handling', () => {
    it('should use environment variables for CORS', () => {
      const originalEnv = process.env.CORS_ORIGIN;
      process.env.CORS_ORIGIN = 'https://example.com';

      const response = createSuccessResponse({ test: true });
      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');

      // Restore original environment
      if (originalEnv) {
        process.env.CORS_ORIGIN = originalEnv;
      } else {
        delete process.env.CORS_ORIGIN;
      }
    });
  });
});