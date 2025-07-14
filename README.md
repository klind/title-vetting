# Title Company Vetter

A comprehensive tool for vetting title companies by analyzing their website, WHOIS data, social media presence, and other digital footprints to assess credibility and legitimacy.

## Features

- **WHOIS Analysis** - Validate domain registration details and registrar information
- **Website Validation** - Check SSL certificates, URL structure, and website security
- **Social Media Verification** - Validate social media presence and authenticity
- **Contact Information Extraction** - Extract and verify contact details from websites
- **Risk Assessment** - Generate comprehensive risk reports based on multiple data sources

## Tech Stack

### Backend
- **Node.js 22** - Runtime environment
- **TypeScript** - Type-safe JavaScript
- **Express.js** - Web framework
- **Zod** - Schema validation
- **Vitest** - Testing framework
- **ESLint** - Code linting

### Frontend
- **React 19** - Frontend framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Vitest** - Testing framework
- **Testing Library** - React component testing

## Project Structure

```
title-vetter/
├── backend/                    # Node.js backend application
│   ├── src/
│   │   ├── api/               # API routes and middleware
│   │   ├── services/          # Business logic services
│   │   ├── types/             # TypeScript type definitions
│   │   ├── utils/             # Utility functions
│   │   └── config/            # Configuration files
│   ├── tests/                 # Backend tests
│   └── package.json
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── utils/             # Utility functions
│   │   └── types/             # TypeScript type definitions
│   ├── public/                # Static assets
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm (comes with Node.js)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration:
   ```bash
   # Copy environment template (if available)
   cp .env.example .env
   
   # Edit .env with your configuration
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Run tests:
   ```bash
   npm test
   ```

6. Build for production:
   ```bash
   npm run build
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Development

### Backend Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix

### Frontend Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with Vitest UI
- `npm run lint` - Run ESLint

## API Endpoints

The backend provides the following API endpoints:

- `GET /api/health` - Health check endpoint
- `POST /api/whois` - WHOIS lookup for domain analysis
- `POST /api/website` - Website validation and analysis
- `POST /api/social-media` - Social media verification
- `POST /api/combined` - Combined analysis of all data sources

## Testing

Both frontend and backend include comprehensive test suites:

- Unit tests for individual functions and components
- Integration tests for API endpoints
- Component tests for React components
- Type checking with TypeScript

Run tests in either directory with:
```bash
npm test          # Watch mode
npm run test:run  # Single run
npm run test:coverage  # With coverage
```

## Deployment

### Backend Deployment
The backend is designed to be deployed as AWS Lambda functions or traditional Node.js servers.

### Frontend Deployment
The frontend can be deployed to any static hosting service (Vercel, Netlify, S3/CloudFront, etc.).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[Add your license information here]