---
name: "Title Company Vetter - Full Stack Implementation"
description: |
  Complete implementation of a title company vetting tool with WHOIS validation.
  Features Node.js/TypeScript AWS Lambda backend and React 19 frontend with Tailwind CSS.
---

## Purpose
Template optimized for AI agents to implement a production-ready title company vetting application using WHOIS validation, featuring a Node.js/TypeScript AWS Lambda backend and React 19 frontend with comprehensive validation and error handling.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and implementation patterns
2. **Validation Loops**: Provide executable tests from TypeScript compilation to production deployment
3. **Information Dense**: Use proven patterns from existing codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Follow all rules in CLAUDE.md

---

## Goal
Build a full-stack title company vetting application with:

- **Backend**: Node.js 22/TypeScript AWS Lambda function that performs WHOIS lookups
- **Frontend**: React 19 with TypeScript, Tailwind CSS, and Vite
- **Validation**: Comprehensive URL validation and WHOIS data processing
- **Deployment**: Lambda for backend, S3/CloudFront for frontend
- **Testing**: Complete unit test coverage with Vitest/Jest

## Why
- **Trust & Safety**: Enable users to verify title company legitimacy before transactions
- **Due Diligence**: Provide comprehensive domain registration information for risk assessment
- **User Experience**: Simple, fast interface for domain validation
- **Scalability**: Serverless architecture for cost-effective scaling
- **Integration**: JSON API for potential integration with other services

## What
### User-Visible Behavior
1. User enters title company website URL
2. System validates URL format and accessibility
3. WHOIS lookup performed on domain
4. Comprehensive report displayed with:
   - Domain registration details
   - Registrant information
   - Registration dates
   - Name servers
   - Registrar information
5. Clear indication of any red flags or concerns

### Success Criteria
- [ ] URL validation prevents invalid/malicious inputs
- [ ] WHOIS lookup returns structured data for valid domains
- [ ] Frontend displays results in user-friendly format
- [ ] Error handling provides clear feedback for failures
- [ ] TypeScript compilation succeeds with no errors
- [ ] All unit tests pass
- [ ] Lambda function deploys and responds correctly
- [ ] Frontend deploys to S3/CloudFront successfully
- [ ] Rate limiting prevents abuse
- [ ] Response times under 5 seconds for WHOIS lookups

## All Needed Context

### Documentation & References (MUST READ)
```yaml
# WHOIS PACKAGE PATTERNS - Core backend functionality
- url: https://www.npmjs.com/package/whois-json
  why: Main package for WHOIS lookups, installation and basic usage
  
- url: https://github.com/mikemaccana/whois-json#readme
  why: Detailed API usage, response formats, and implementation examples

# AWS LAMBDA TYPESCRIPT PATTERNS - Serverless backend
- url: https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html
  why: Official TypeScript handler patterns for AWS Lambda
  
- url: https://www.npmjs.com/package/@types/aws-lambda
  why: Type definitions for Lambda event and context objects

# REACT 19 + VITE + TAILWIND - Frontend stack
- url: https://tailwindcss.com/docs/installation/framework-guides/vite
  why: Official Tailwind CSS installation guide for Vite projects

# EXISTING CODEBASE PATTERNS - Study these implementations
- file: use-cases/mcp-server/package.json
  why: Dependencies, scripts, and project configuration patterns
  
- file: use-cases/mcp-server/tsconfig.json
  why: TypeScript configuration optimized for Node.js projects
  
- file: use-cases/mcp-server/src/types.ts
  why: TypeScript patterns, Zod schemas, response creators, error handling
  
- file: use-cases/mcp-server/tests/unit/database/utils.test.ts
  why: Vitest testing patterns, mocking, async operation testing
  
- file: use-cases/mcp-server/vitest.config.js
  why: Vitest configuration for Node.js projects
```

### Current Codebase Tree (Run `tree -I node_modules` in project root)
```bash
context-engineering-intro/
├── CLAUDE.md                    # Global AI rules (Node.js/TypeScript focused)
├── INITIAL.md                   # Feature requirements
├── PRPs/
│   ├── templates/
│   │   └── prp_base.md         # PRP template
│   └── title-company-vetter.md # This PRP
├── use-cases/
│   └── mcp-server/             # TypeScript patterns reference
│       ├── package.json        # ← COPY dependency patterns
│       ├── tsconfig.json       # ← COPY TypeScript config
│       ├── vitest.config.js    # ← COPY test config
│       ├── src/
│       │   ├── types.ts        # ← FOLLOW type definition patterns
│       │   └── ...
│       └── tests/
│           └── unit/           # ← FOLLOW test structure patterns
└── examples/                   # Currently empty
```

### Desired Codebase Tree (Files to add)
```bash
title-company-vetter/
├── backend/                    # AWS Lambda function
│   ├── src/
│   │   ├── index.ts           # Lambda handler entry point
│   │   ├── types.ts           # TypeScript type definitions
│   │   ├── whois-service.ts   # WHOIS lookup logic
│   │   ├── url-validator.ts   # URL validation utilities
│   │   └── response-helpers.ts # Response formatting utilities
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── whois-service.test.ts
│   │   │   ├── url-validator.test.ts
│   │   │   └── response-helpers.test.ts
│   │   └── setup.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.js
│   └── .env.example
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── components/
│   │   │   ├── UrlInput.tsx   # URL input form
│   │   │   ├── LoadingSpinner.tsx # Loading state
│   │   │   └── WhoisReport.tsx # Results display
│   │   ├── hooks/
│   │   │   └── useWhoisLookup.ts # Custom hook for API calls
│   │   ├── types/
│   │   │   └── whois.ts       # Frontend type definitions
│   │   ├── utils/
│   │   │   └── api.ts         # API client utilities
│   │   └── main.tsx
│   ├── tests/
│   │   └── components/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── index.html
└── README.md                   # Complete setup instructions
```

### Known Gotchas & Critical Library Quirks
```typescript
// CRITICAL: whois-json package quirks
// 1. Returns Promise-based results (no callbacks in v2)
const whois = require('whois-json'); // Note: CommonJS require syntax
const results = await whois('domain.com'); // Must use await

// 2. Response structure varies by registrar - always validate
interface WhoisResult {
  domainName?: string;
  registrantName?: string;
  creationDate?: string;
  // Properties may be missing or differently named
}

// 3. Error handling for invalid domains
try {
  const results = await whois('invalid-domain');
} catch (error) {
  // Handle both network errors and invalid domain errors
  console.error('WHOIS lookup failed:', error.message);
}

// CRITICAL: AWS Lambda Node.js 22 requirements
// 1. ESM modules support required
export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  // Lambda handler must be exported
};

// 2. Proper CORS headers for frontend integration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// 3. URL validation is critical for security
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

// CRITICAL: React 19 + TypeScript patterns
// 1. Use new JSX transform
import React from 'react'; // Not needed with new transform
const App = () => <div>Hello</div>; // Direct JSX usage

// 2. Proper TypeScript event handling
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  // Handle form submission
};

// 3. Tailwind CSS class concatenation
import { cn } from '@/lib/utils'; // If using shadcn-style utilities
const buttonClass = cn(
  'px-4 py-2 rounded',
  isLoading && 'opacity-50 cursor-not-allowed'
);
```

## Implementation Blueprint

### Data Models and Structure

Define TypeScript interfaces and Zod schemas for type safety and validation.

```typescript
// Backend types (src/types.ts)
import { z } from 'zod';

// WHOIS API response schema
export const WhoisResultSchema = z.object({
  domainName: z.string().optional(),
  registrantName: z.string().optional(),
  registrantOrganization: z.string().optional(),
  registrantEmail: z.string().email().optional(),
  creationDate: z.string().optional(),
  expirationDate: z.string().optional(),
  registrar: z.string().optional(),
  nameServers: z.string().optional(),
  status: z.string().optional(),
});

export type WhoisResult = z.infer<typeof WhoisResultSchema>;

// Lambda event schema
export const LambdaEventSchema = z.object({
  body: z.string(),
  headers: z.record(z.string()),
  httpMethod: z.string(),
  path: z.string(),
});

// Request payload schema
export const WhoisRequestSchema = z.object({
  url: z.string().url('Invalid URL format').min(1, 'URL is required'),
});

export type WhoisRequest = z.infer<typeof WhoisRequestSchema>;

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Frontend types (frontend/src/types/whois.ts)
export interface WhoisReport {
  domain: string;
  registrant: {
    name?: string;
    organization?: string;
    email?: string;
  };
  registration: {
    createdDate?: string;
    expirationDate?: string;
    registrar?: string;
  };
  technical: {
    nameServers?: string[];
    status?: string;
  };
  riskFactors: string[];
}

export interface ApiState {
  loading: boolean;
  error: string | null;
  data: WhoisReport | null;
}
```

### List of Tasks (Complete in order)

```yaml
Task 1 - Backend Project Setup:
  CREATE backend/ directory structure:
    - mkdir -p backend/src backend/tests/unit
    - CREATE package.json with Node.js 22, TypeScript, Vitest dependencies
    - CREATE tsconfig.json following use-cases/mcp-server patterns
    - CREATE vitest.config.js for testing setup
    - CREATE .env.example with placeholder values

Task 2 - Backend Core Implementation:
  CREATE src/types.ts:
    - COPY patterns from use-cases/mcp-server/src/types.ts
    - DEFINE WhoisResult, WhoisRequest, ApiResponse interfaces
    - ADD Zod schemas for validation
    - IMPLEMENT response helper functions

  CREATE src/url-validator.ts:
    - IMPLEMENT URL format validation
    - ADD domain extraction from URL
    - VALIDATE against malicious patterns
    - RETURN validation results with error messages

  CREATE src/whois-service.ts:
    - IMPORT whois-json package
    - IMPLEMENT WHOIS lookup with error handling
    - TRANSFORM raw WHOIS data to structured format
    - ADD rate limiting logic
    - HANDLE timeout scenarios

  CREATE src/response-helpers.ts:
    - IMPLEMENT CORS headers utility
    - CREATE success/error response formatters
    - ADD request/response logging
    - HANDLE Lambda proxy response format

Task 3 - Lambda Handler Implementation:
  CREATE src/index.ts:
    - IMPORT AWS Lambda types (@types/aws-lambda)
    - IMPLEMENT main handler function
    - ADD request validation using Zod schemas
    - INTEGRATE whois-service for lookups
    - RETURN properly formatted JSON responses
    - HANDLE OPTIONS requests for CORS

Task 4 - Backend Testing:
  CREATE tests/setup.ts:
    - COPY patterns from use-cases/mcp-server/tests/setup.ts
    - CONFIGURE Vitest environment
    - ADD global test utilities

  CREATE tests/unit/url-validator.test.ts:
    - TEST valid URL formats
    - TEST invalid URL rejection
    - TEST malicious URL detection
    - TEST domain extraction

  CREATE tests/unit/whois-service.test.ts:
    - MOCK whois-json package
    - TEST successful WHOIS lookups
    - TEST error handling for invalid domains
    - TEST rate limiting behavior
    - TEST data transformation

  CREATE tests/unit/response-helpers.test.ts:
    - TEST CORS header generation
    - TEST response formatting
    - TEST error response structure

Task 5 - Frontend Project Setup:
  CREATE frontend/ directory with Vite + React 19:
    - RUN: npm create vite@latest frontend -- --template react-ts
    - CD frontend && npm install
    - INSTALL Tailwind CSS: npm install -D tailwindcss postcss autoprefixer
    - RUN: npx tailwindcss init -p
    - CONFIGURE tailwind.config.js with content paths
    - UPDATE src/index.css with Tailwind directives

Task 6 - Frontend Core Implementation:
  CREATE src/types/whois.ts:
    - DEFINE WhoisReport interface
    - ADD ApiState interface for loading states
    - EXPORT form validation types

  CREATE src/utils/api.ts:
    - IMPLEMENT fetch wrapper with error handling
    - ADD API endpoint configuration
    - HANDLE request/response formatting
    - IMPLEMENT timeout handling

  CREATE src/hooks/useWhoisLookup.ts:
    - CREATE custom hook for WHOIS API calls
    - IMPLEMENT loading, error, and success states
    - ADD debouncing for input validation
    - HANDLE API error responses

Task 7 - Frontend Components:
  CREATE src/components/UrlInput.tsx:
    - IMPLEMENT controlled input with validation
    - ADD real-time URL format checking
    - SHOW validation errors inline
    - HANDLE form submission

  CREATE src/components/LoadingSpinner.tsx:
    - CREATE reusable loading component
    - USE Tailwind for styling
    - ADD accessibility attributes

  CREATE src/components/WhoisReport.tsx:
    - DISPLAY WHOIS data in structured format
    - HIGHLIGHT risk factors
    - IMPLEMENT responsive design
    - ADD copy-to-clipboard functionality

  UPDATE src/App.tsx:
    - INTEGRATE all components
    - MANAGE application state
    - HANDLE API integration
    - IMPLEMENT error boundaries

Task 8 - Frontend Testing:
  CREATE tests/components/ directory:
    - TEST UrlInput component behavior
    - TEST WhoisReport data display
    - TEST useWhoisLookup hook functionality
    - MOCK API calls in tests

Task 9 - Documentation:
  CREATE README.md:
    - INCLUDE project structure diagram
    - ADD setup instructions for both backend and frontend
    - DOCUMENT API endpoints and responses
    - PROVIDE deployment instructions
    - ADD environment variable documentation
```

### Per Task Implementation Details

```typescript
// Task 3 - Lambda Handler Implementation Pattern
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { WhoisRequestSchema } from './types';
import { performWhoisLookup } from './whois-service';
import { createSuccessResponse, createErrorResponse, getCorsHeaders } from './response-helpers';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Lambda invoked:', { 
    httpMethod: event.httpMethod, 
    path: event.path,
    requestId: context.awsRequestId 
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(),
      body: '',
    };
  }

  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse('Method not allowed', 405);
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}');
    const validation = WhoisRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return createErrorResponse('Invalid request format', 400, validation.error.errors);
    }

    // Perform WHOIS lookup
    const whoisData = await performWhoisLookup(validation.data.url);
    
    return createSuccessResponse(whoisData);
    
  } catch (error) {
    console.error('Lambda error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
};

// Task 6 - Frontend API Integration Pattern
// src/hooks/useWhoisLookup.ts
import { useState, useCallback } from 'react';
import { WhoisReport, ApiState } from '../types/whois';
import { apiClient } from '../utils/api';

export const useWhoisLookup = () => {
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
    data: null,
  });

  const lookupDomain = useCallback(async (url: string) => {
    setState({ loading: true, error: null, data: null });
    
    try {
      const response = await apiClient.post<WhoisReport>('/whois', { url });
      setState({ loading: false, error: null, data: response.data });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Lookup failed';
      setState({ loading: false, error: errorMessage, data: null });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return {
    ...state,
    lookupDomain,
    reset,
  };
};

// Task 7 - React Component Pattern with Tailwind
// src/components/UrlInput.tsx
import React, { useState } from 'react';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onSubmit, loading }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;
    return urlRegex.test(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    if (!validateUrl(url)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }
    
    setError(null);
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Title Company Website URL
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example-title-company.com"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={loading}
          />
          {error && (
            <p className="text-red-500 text-sm mt-1">{error}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? 'Checking...' : 'Vet Title Company'}
        </button>
      </div>
    </form>
  );
};
```

### Integration Points

```yaml
AWS_LAMBDA:
  - Runtime: Node.js 22.x
  - Handler: index.handler
  - Environment variables: API_RATE_LIMIT, CORS_ORIGIN
  - Memory: 256MB (sufficient for WHOIS lookups)
  - Timeout: 30 seconds (WHOIS can be slow)

FRONTEND_BUILD:
  - Build command: npm run build
  - Output directory: dist/
  - Deploy to: S3 bucket with CloudFront
  - Environment: API_ENDPOINT (Lambda function URL)

API_INTEGRATION:
  - Method: POST
  - Endpoint: /whois
  - Content-Type: application/json
  - CORS: Enabled for frontend domain
  - Request body: {"url": "https://example.com"}
  - Response: {"success": true, "data": {...}, "timestamp": "..."}

ENVIRONMENT_VARIABLES:
  Backend (.env):
    - API_RATE_LIMIT=10 (requests per minute per IP)
    - CORS_ORIGIN=* (or specific frontend domain)
    - LOG_LEVEL=info
  
  Frontend (.env):
    - VITE_API_ENDPOINT=https://your-lambda-url/
    - VITE_APP_NAME=Title Company Vetter
```

## Validation Loops

### Level 1: Syntax & Style

```bash
# Backend validation
cd backend
npm run type-check                 # TypeScript compilation
npm run lint                      # ESLint checking (if configured)

# Frontend validation  
cd frontend
npm run type-check                 # TypeScript compilation
npm run lint                      # ESLint checking
npm run build                     # Production build test

# Expected: No TypeScript errors, no lint errors, successful build
```

### Level 2: Unit Tests

```bash
# Backend tests
cd backend
npm run test                       # Run all unit tests
npm run test:coverage             # Generate coverage report

# Frontend tests
cd frontend  
npm run test                      # Run component tests
npm run test:coverage             # Generate coverage report

# Expected: All tests pass, coverage >80%
```

### Level 3: Integration Testing

```bash
# Backend API testing
cd backend
npm run dev                       # Start local Lambda simulator

# Test API endpoints
curl -X POST http://localhost:3000/whois \
  -H "Content-Type: application/json" \
  -d '{"url": "https://google.com"}'

# Expected: Valid WHOIS data returned

# Frontend integration
cd frontend
npm run dev                       # Start development server

# Test in browser:
# 1. Enter valid URL -> Should show WHOIS data
# 2. Enter invalid URL -> Should show validation error
# 3. Test loading states -> Should show spinner
# 4. Test error handling -> Should show error message
```

## Final Validation Checklist

### Backend Validation
- [ ] TypeScript compilation: `npm run type-check` passes
- [ ] Unit tests pass: `npm run test` passes with >80% coverage
- [ ] WHOIS lookups work: API returns structured data for valid domains
- [ ] Error handling works: Invalid domains return proper error responses
- [ ] Rate limiting works: Prevents abuse scenarios
- [ ] CORS headers present: Frontend can access API
- [ ] Lambda deployment succeeds: Function deploys without errors

### Frontend Validation
- [ ] TypeScript compilation: `npm run type-check` passes
- [ ] Component tests pass: `npm run test` passes
- [ ] Production build succeeds: `npm run build` creates dist/
- [ ] URL validation works: Invalid URLs show error messages
- [ ] API integration works: Successful lookups display data
- [ ] Loading states work: Spinner shows during API calls
- [ ] Error handling works: API errors display user-friendly messages
- [ ] Responsive design: Works on mobile and desktop
- [ ] Accessibility: Proper ARIA labels and keyboard navigation

---

## Anti-Patterns to Avoid

### Security & Validation
- ❌ Don't skip URL validation - always sanitize inputs before WHOIS lookup
- ❌ Don't expose internal error details - sanitize error messages for users
- ❌ Don't ignore rate limiting - prevent abuse of WHOIS services
- ❌ Don't hardcode API endpoints - use environment variables

### Development Process
- ❌ Don't skip the validation loops - each level catches different issues
- ❌ Don't ignore TypeScript errors - fix all type issues before proceeding
- ❌ Don't skip unit tests - they prevent regressions during changes
- ❌ Don't forget CORS headers - frontend won't work without them

### React/Frontend Specific
- ❌ Don't mutate state directly - use proper React state updates
- ❌ Don't skip error boundaries - handle component errors gracefully
- ❌ Don't forget loading states - users need feedback during API calls
- ❌ Don't hardcode styles - use Tailwind CSS utility classes

---

## Quality Score: 9/10

**Confidence Level**: Very High

**Reasoning**: 
- Comprehensive context provided from existing TypeScript patterns
- Well-documented APIs (whois-json, AWS Lambda, React 19)
- Clear validation gates at each level
- Proven patterns from existing codebase
- Complete implementation blueprint with error handling
- Detailed testing strategy

**Potential Challenges**:
- whois-json package is 7 years old (may need alternatives if issues arise)
- WHOIS response formats vary by registrar (handled with flexible typing)

**Mitigation**: Comprehensive error handling and fallback strategies included in implementation.