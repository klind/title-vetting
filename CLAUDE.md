# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Title Company Vetter is a full-stack TypeScript application that analyzes title companies by examining their websites, WHOIS data, social media presence, and other digital footprints to assess credibility and legitimacy. The application consists of a Node.js backend API and a React frontend.

## Development Commands

### Backend (Node.js + Express + TypeScript)
```bash
cd backend
npm install
npm run dev               # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm run build:production # Build for production with Playwright setup
npm start               # Run production server
npm run type-check      # Run TypeScript type checking
npm test                # Run tests in watch mode
npm run test:run        # Run tests once
npm run test:coverage   # Run tests with coverage
npm run lint            # Run ESLint
npm run lint:fix        # Run ESLint with auto-fix
```

### Frontend (React + TypeScript + Vite)
```bash
cd frontend
npm install
npm run dev             # Start Vite development server
npm run build          # Build for production
npm run preview        # Preview production build
npm test               # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:coverage  # Run tests with coverage
npm run test:ui        # Run tests with Vitest UI
npm run lint           # Run ESLint
```

## Architecture

### Backend Structure
- **API Layer**: Express.js routes with comprehensive validation using Zod schemas
- **Services Layer**: Business logic separated into services (whois, website, social-media)
- **AWS Lambda Compatible**: Designed to work both as Express server and Lambda functions
- **External Integrations**: Uses Playwright for website scraping and custom WHOIS implementation
- **Error Handling**: Centralized error handling with typed error responses

### Frontend Structure
- **React 19**: Modern React with TypeScript and functional components
- **API Client**: Robust HTTP client with retry logic, timeout handling, and error management
- **Component Architecture**: Modular components with custom hooks for state management
- **Styling**: Tailwind CSS for styling

### Key Services
- **WHOIS Service**: Custom WHOIS lookup with caching and rate limiting
- **Website Validator**: Comprehensive website analysis including SSL, accessibility, and content extraction
- **Social Media Validator**: Social media presence verification
- **Contact Extractor**: Extracts and validates contact information from websites

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/whois` - WHOIS lookup
- `POST /api/website` - Website validation
- `POST /api/social-media` - Social media verification
- `POST /api/combined` - Combined analysis (primary endpoint)

## Testing

Both backend and frontend use Vitest for testing. Key test files:
- `backend/tests/unit/` - Unit tests for utilities and services
- Frontend components tested with Testing Library

## Environment Configuration

Backend uses environment variables validated through Zod schemas. Frontend uses Vite environment variables (VITE_API_ENDPOINT).

## Deployment

- **Backend**: Railway deployment with `railway.toml` configuration
- **Frontend**: Static hosting compatible (uses environment variables for API endpoint)
- **Production Build**: Includes Playwright browser installation for web scraping

## Code Style Guidelines

From .cursor/rules/rule.mdc:
- Use early returns for better readability
- Implement proper TypeScript types
- Use descriptive variable names with "handle" prefix for event functions
- No environment variables in frontend code
- Validation must be in validation files, not controllers
- Use Tailwind classes for styling, avoid inline CSS
- Implement accessibility features (tabindex, aria-label, etc.)

## Important Notes

- Rate limiting implemented for WHOIS lookups
- In-memory caching for WHOIS results (1 hour TTL)
- Comprehensive error handling with typed errors
- Frontend API client includes retry logic and timeout handling
- Backend supports both Express server and AWS Lambda deployment