import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { specs } from '../config/swagger.js';
import { handler } from '../api/index.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Convert Express request to API Gateway event format
 */
function createApiGatewayEvent(req: express.Request): any {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body ? JSON.stringify(req.body) : null,
    isBase64Encoded: false,
    requestContext: {
      requestId: Math.random().toString(36).substring(7),
      httpMethod: req.method,
      path: req.path,
      stage: 'prod',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
    },
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    pathParameters: null,
    stageVariables: null,
  };
}

/**
 * Create Lambda context
 */
function createLambdaContext() {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'title-company-vetter-prod',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:title-company-vetter-prod',
    memoryLimitInMB: '128',
    awsRequestId: Math.random().toString(36).substring(7),
    logGroupName: '/aws/lambda/title-company-vetter-prod',
    logStreamName: '2023/01/01/[$LATEST]123456789012345678901234567890123456789012345678901234567890',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

// Swagger UI endpoints
app.get('/docs', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="Title Company Vetter API Documentation" />
      <title>Title Company Vetter API Documentation</title>
      <link rel="stylesheet" type="text/css" href="/docs/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="/docs/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/docs/swagger.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

app.get('/docs/swagger.json', (_req, res) => {
  res.json(specs);
});

app.get('/docs/swagger-ui.css', (_req, res) => {
  try {
    const cssPath = join(process.cwd(), 'node_modules', 'swagger-ui-dist', 'swagger-ui.css');
    const css = readFileSync(cssPath, 'utf8');
    res.setHeader('Content-Type', 'text/css');
    res.send(css);
  } catch (error) {
    console.error('Error serving Swagger UI CSS:', error);
    res.status(404).send('CSS not found');
  }
});

app.get('/docs/swagger-ui-bundle.js', (_req, res) => {
  try {
    const jsPath = join(process.cwd(), 'node_modules', 'swagger-ui-dist', 'swagger-ui-bundle.js');
    const js = readFileSync(jsPath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript');
    res.send(js);
  } catch (error) {
    console.error('Error serving Swagger UI JS:', error);
    res.status(404).send('JS not found');
  }
});

// API routes - proxy to Lambda handler
app.all('*', async (req, res) => {
  try {
    const event = createApiGatewayEvent(req);
    const context = createLambdaContext();
    
    const response = await handler(event, context);
    
    // Send Lambda response through Express
    res.status(response.statusCode);
    
    // Set headers if they exist
    if (response.headers) {
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
    }
    
    res.send(response.body);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Title Company Vetter Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 WHOIS endpoint: http://localhost:${PORT}/whois`);
  console.log(`📈 Status endpoint: http://localhost:${PORT}/status`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});