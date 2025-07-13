## FEATURE:

- A feature for anyone to vet a title compny. 
- A user will input the url/website address of the title company,
- We will then validate all the info we can find with WHOIS. We will use the whois command line tool. (npm install whois-json)
- Generate a report of the result.
- Simple React frontend with Tailwind CSS for user interface
- Frontend built with Vite for fast development and bundling

## EXAMPLES:

In the `examples/` folder, there is a README for you to read to understand what the example is all about and also how to structure your own README when you create documentation for the above feature.

## DOCUMENTATION:

whois npm package: https://www.npmjs.com/package/whois-json
whois github repo: https://github.com/mikemaccana/whois-json#readme

## OTHER CONSIDERATIONS:

- Include a .env.example, README with instructions for setup including how to configure Gmail and Brave.
- Include the project structure in the README.
- Use Node 22
- Package manager: Use npm (not yarn or pnpm)
- TypeScript: Use TypeScript for type safety
- Testing framework: Use Jest or Vitest for unit tests
- Linting: Include ESLint configuration
- Error handling: Implement proper try/catch for all async operations
- Input validation: Validate URLs before processing
- Rate limiting: Consider rate limits for WHOIS lookups
- Environment variables: Use dotenv for configuration management
- Deployment: Deploy as AWS Lambda function
- Response format: Lambda should return JSON response for the WHOIS validation result
- AWS Lambda handler: Structure code with proper Lambda event/context handling
- Frontend: React 19 with TypeScript, Tailwind CSS, and Vite
- Frontend deployment: Deploy to S3/CloudFront (AWS account already available)
- API integration: Frontend should call the AWS Lambda endpoint
- UI components: Input field for URL, submit button, loading state, results display
