# Title Company Vetter

A comprehensive WHOIS lookup and risk assessment tool designed to verify title company legitimacy. This application performs domain registration analysis, identifies potential red flags, and provides actionable recommendations for due diligence procedures.

## 🏗️ Architecture Overview

This is a full-stack application built with modern TypeScript technologies:

- **Backend**: Node.js 22 + TypeScript deployed as AWS Lambda function
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **Testing**: Vitest with comprehensive test coverage
- **API**: RESTful API with comprehensive error handling and validation

```
title-company-vetter/
├── backend/                # AWS Lambda backend
│   ├── src/
│   │   ├── index.ts       # Lambda handler
│   │   ├── types.ts       # TypeScript types and Zod schemas
│   │   ├── whois-service.ts  # Core WHOIS lookup logic
│   │   ├── url-validator.ts  # URL validation and security checks
│   │   └── response-helpers.ts # HTTP response utilities
│   └── tests/             # Backend unit tests
└── frontend/              # React frontend application
    ├── src/
    │   ├── components/    # React components
    │   ├── hooks/        # Custom React hooks
    │   ├── types/        # TypeScript type definitions
    │   ├── utils/        # API client and utilities
    │   └── test/         # Test setup and mocks
    └── tests/            # Frontend component tests
```

## ✨ Features

### Core Functionality
- **WHOIS Domain Lookup**: Comprehensive domain registration information retrieval
- **Risk Assessment**: Automated analysis of potential security and legitimacy risks
- **Real-time Validation**: URL format validation with security checks
- **Error Handling**: Robust error handling with user-friendly messages
- **Progress Tracking**: Real-time progress updates during lookup process

### Risk Analysis
- Domain age analysis (newly registered domains flagged)
- Expiration date monitoring (soon-to-expire domains flagged)
- Privacy protection detection
- Contact information availability assessment
- Suspicious pattern detection
- Typosquatting prevention

### User Experience
- Responsive design that works on all devices
- Real-time form validation with helpful error messages
- Loading states with progress indicators
- Comprehensive error boundaries
- Keyboard shortcuts (Escape to reset)
- Example URLs for quick testing

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** (required for both backend and frontend)
- **npm** or **yarn** package manager
- **AWS Account** (for Lambda deployment)
- **AWS CLI** configured (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd title-company-vetter
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Development Setup

#### Backend Development

1. **Environment Configuration**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Run Tests**
   ```bash
   npm test
   npm run test:coverage  # With coverage report
   ```

3. **Type Checking**
   ```bash
   npm run type-check
   ```

4. **Build**
   ```bash
   npm run build
   ```

#### Frontend Development

1. **Environment Configuration**
   ```bash
   cd frontend
   # Create .env file
   echo "VITE_API_ENDPOINT=http://localhost:3000" > .env
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

3. **Run Tests**
   ```bash
   npm test          # Watch mode
   npm run test:run  # Single run
   npm run test:ui   # Test UI
   npm run test:coverage  # With coverage
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm run preview  # Preview production build
   ```

5. **Linting**
   ```bash
   npm run lint
   ```

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` file:

```bash
# Optional: Custom timeout settings
REQUEST_TIMEOUT=30000
MAX_RETRIES=3

# Optional: Rate limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Logging level
LOG_LEVEL=info
```

### Frontend Environment Variables

Create `frontend/.env` file:

```bash
# API endpoint (required)
VITE_API_ENDPOINT=https://your-lambda-function-url

# Optional: Development settings
VITE_DEBUG=false
VITE_API_TIMEOUT=30000
```

## 🧪 Testing

### Running All Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests  
cd frontend && npm test
```

### Test Coverage

```bash
# Backend coverage
cd backend && npm run test:coverage

# Frontend coverage
cd frontend && npm run test:coverage
```

### Test Structure

**Backend Tests:**
- Unit tests for all modules in `tests/unit/`
- Test utilities in `tests/setup.ts`
- Mocks for external services

**Frontend Tests:**
- Component tests for UI components
- Hook tests for custom React hooks
- API utility tests
- Integration tests for user workflows

## 🚀 Deployment

### AWS Lambda Deployment

1. **Build the backend**
   ```bash
   cd backend
   npm run build
   ```

2. **Create deployment package**
   ```bash
   zip -r function.zip dist/ node_modules/ package.json
   ```

3. **Deploy using AWS CLI**
   ```bash
   aws lambda create-function \
     --function-name title-company-vetter \
     --runtime nodejs22.x \
     --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
     --handler dist/index.handler \
     --zip-file fileb://function.zip
   ```

4. **Create Function URL (for HTTP access)**
   ```bash
   aws lambda create-function-url-config \
     --function-name title-company-vetter \
     --auth-type NONE \
     --cors '{
       "AllowCredentials": false,
       "AllowHeaders": ["Content-Type", "X-Amz-Date", "Authorization"],
       "AllowMethods": ["GET", "POST", "OPTIONS"],
       "AllowOrigins": ["*"],
       "ExposeHeaders": ["Date"],
       "MaxAge": 86400
     }'
   ```

### Frontend Deployment

The frontend can be deployed to any static hosting service:

**Vercel:**
```bash
cd frontend
npm run build
npx vercel --prod
```

**Netlify:**
```bash
cd frontend
npm run build
npx netlify deploy --prod --dir=dist
```

**AWS S3 + CloudFront:**
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

## 📖 API Documentation

### Endpoints

#### `POST /whois`

Perform WHOIS lookup for a domain.

**Request:**
```json
{
  "url": "https://example-title-company.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain": "example-title-company.com",
    "registrant": {
      "name": "Example Title Company",
      "organization": "Example Title LLC",
      "email": "admin@example-title-company.com",
      "country": "US",
      "phone": "+1-555-0123"
    },
    "registration": {
      "createdDate": "2020-01-15T00:00:00Z",
      "expirationDate": "2025-01-15T00:00:00Z",
      "registrar": "Example Registrar Inc.",
      "registrarWhoisServer": "whois.example-registrar.com"
    },
    "technical": {
      "nameServers": ["ns1.example-dns.com", "ns2.example-dns.com"],
      "status": "clientTransferProhibited",
      "dnssec": "unsigned"
    },
    "admin": {
      "name": "Admin Contact",
      "email": "admin@example-title-company.com"
    },
    "tech": {
      "name": "Tech Contact", 
      "email": "tech@example-title-company.com"
    },
    "riskFactors": [],
    "metadata": {
      "lookupTime": 1247,
      "source": "whois-service",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_1705310200_abc123"
}
```

#### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

#### `GET /status`

Detailed status information.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "operational",
    "uptime": 3600,
    "requests": {
      "total": 1250,
      "successful": 1200,
      "failed": 50
    },
    "performance": {
      "avgResponseTime": 850,
      "p95ResponseTime": 1200
    }
  }
}
```

### Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Invalid URL format",
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_1705310200_abc123"
}
```

**Common Error Codes:**
- `400` - Bad Request (validation errors)
- `429` - Rate Limited
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

## 🛠️ Development Workflow

### Code Style

The project uses consistent code style enforced by:

- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting (via ESLint integration)
- **TypeScript** for type checking

### Git Workflow

1. **Feature branches**: Create feature branches from `main`
2. **Commit messages**: Use conventional commit format
3. **Testing**: All tests must pass before merging
4. **Type checking**: No TypeScript errors allowed
5. **Linting**: Code must pass ESLint checks

### Adding New Features

1. **Backend changes:**
   ```bash
   cd backend
   # Add your changes
   npm test
   npm run type-check
   npm run build
   ```

2. **Frontend changes:**
   ```bash
   cd frontend
   # Add your changes
   npm test
   npm run lint
   npm run build
   ```

3. **Update types** if API changes affect the frontend
4. **Update tests** for new functionality
5. **Update documentation** as needed

## 🐛 Troubleshooting

### Common Issues

**Backend Issues:**

1. **"Module not found" errors**
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript compilation: `npm run type-check`

2. **WHOIS lookup timeouts**
   - Increase timeout in environment variables
   - Check network connectivity
   - Verify domain is accessible

3. **Lambda deployment failures**
   - Verify AWS credentials are configured
   - Check IAM permissions for Lambda functions
   - Ensure Node.js 22 runtime is available

**Frontend Issues:**

1. **API connection errors**
   - Verify `VITE_API_ENDPOINT` environment variable
   - Check CORS configuration on backend
   - Ensure Lambda function URL is accessible

2. **Build failures**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npx tsc --noEmit`
   - Verify all imports are correct

3. **Test failures**
   - Update test snapshots if needed: `npm test -- -u`
   - Check for async/await issues in tests
   - Verify mocks are properly configured

### Debug Mode

Enable debug mode for additional logging:

**Backend:**
```bash
export LOG_LEVEL=debug
```

**Frontend:**
```bash
export VITE_DEBUG=true
```

### Performance Issues

1. **Slow WHOIS lookups**
   - Implement caching for repeat queries
   - Use connection pooling
   - Add request deduplication

2. **Frontend performance**
   - Enable React DevTools Profiler
   - Check for unnecessary re-renders
   - Optimize bundle size with tree shaking

## 📊 Monitoring & Analytics

### Metrics to Track

**Backend Metrics:**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- WHOIS lookup success/failure rates
- Lambda cold start frequency

**Frontend Metrics:**
- Page load times
- User interaction metrics
- Error boundary triggers
- API request performance

### Logging

**Backend Logging:**
- All requests logged with request ID
- Error details with stack traces
- Performance metrics for optimization

**Frontend Logging:**
- User actions for analytics
- Error boundary catches
- API request/response cycles

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write/update tests
5. Ensure all tests pass
6. Submit a pull request

### Pull Request Guidelines

- **Tests**: Include tests for new functionality
- **Documentation**: Update README and code comments
- **Type Safety**: Maintain strict TypeScript compliance
- **Performance**: Consider performance implications
- **Security**: Follow security best practices

### Code Review Checklist

- [ ] Tests pass locally
- [ ] TypeScript compiles without errors
- [ ] Code follows project style guidelines
- [ ] Documentation is updated
- [ ] Security considerations addressed
- [ ] Performance impact assessed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built using [Context Engineering](https://docs.anthropic.com/claude/docs/context-engineering) methodology
- WHOIS data provided by various registrar APIs
- UI components inspired by modern design systems
- Testing patterns based on React Testing Library best practices

---

For additional help, please:
1. Check the [troubleshooting section](#-troubleshooting)
2. Review the [API documentation](#-api-documentation)
3. Open an issue on the repository

**Built with ❤️ using Context Engineering and Claude Code**