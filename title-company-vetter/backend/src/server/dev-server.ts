import { createServer } from 'http';
import { URL } from 'url';
import { handler } from '../api/index.js';
import { config } from 'dotenv';
import { specs, swaggerUi, swaggerUiOptions } from '../config/swagger.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

const PORT = process.env.PORT || 3001;

/**
 * Convert Node.js HTTP request to API Gateway event format
 */
function createApiGatewayEvent(req: any, body: string): any {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  return {
    httpMethod: req.method,
    path: url.pathname,
    headers: req.headers,
    queryStringParameters: Object.fromEntries(url.searchParams),
    body: body,
    isBase64Encoded: false,
    requestContext: {
      requestId: Math.random().toString(36).substring(7),
      httpMethod: req.method,
      path: url.pathname,
      stage: 'dev',
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
 * Convert API Gateway response to Node.js HTTP response
 */
function sendResponse(res: any, apiResponse: any) {
  res.writeHead(apiResponse.statusCode, apiResponse.headers);
  res.end(apiResponse.body);
}

/**
 * Handle Swagger UI requests
 */
function handleSwaggerRequest(req: any, res: any) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  
  // Serve Swagger UI
  if (url.pathname === '/docs' || url.pathname === '/docs/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
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
    return true;
  }
  
  // Serve Swagger JSON
  if (url.pathname === '/docs/swagger.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(specs));
    return true;
  }
  
  // Serve Swagger UI CSS
  if (url.pathname === '/docs/swagger-ui.css') {
    try {
      const cssPath = join(process.cwd(), 'node_modules', 'swagger-ui-dist', 'swagger-ui.css');
      const css = readFileSync(cssPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(css);
      return true;
    } catch (error) {
      console.error('Error serving Swagger UI CSS:', error);
      res.writeHead(404);
      res.end('CSS not found');
      return true;
    }
  }
  
  // Serve Swagger UI JS
  if (url.pathname === '/docs/swagger-ui-bundle.js') {
    try {
      const jsPath = join(process.cwd(), 'node_modules', 'swagger-ui-dist', 'swagger-ui-bundle.js');
      const js = readFileSync(jsPath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(js);
      return true;
    } catch (error) {
      console.error('Error serving Swagger UI JS:', error);
      res.writeHead(404);
      res.end('JS not found');
      return true;
    }
  }
  
  return false;
}

/**
 * Create HTTP server
 */
const server = createServer(async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Handle Swagger documentation requests
    if (handleSwaggerRequest(req, res)) {
      return;
    }

    // Read request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Create API Gateway event
        const event = createApiGatewayEvent(req, body);
        
        // Create Lambda context
        const context = {
          callbackWaitsForEmptyEventLoop: false,
          functionName: 'title-company-vetter-dev',
          functionVersion: '$LATEST',
          invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:title-company-vetter-dev',
          memoryLimitInMB: '128',
          awsRequestId: event.requestContext.requestId,
          logGroupName: '/aws/lambda/title-company-vetter-dev',
          logStreamName: '2023/01/01/[$LATEST]123456789012345678901234567890123456789012345678901234567890',
          getRemainingTimeInMillis: () => 30000,
          done: () => {},
          fail: () => {},
          succeed: () => {},
        };

        // Call Lambda handler
        const response = await handler(event, context);
        
        // Send response
        sendResponse(res, response);
      } catch (error) {
        console.error('Error processing request:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

/**
 * Start server
 */
server.listen(PORT, () => {
  console.log(`🚀 Title Company Vetter Backend running on http://localhost:${PORT}`);
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
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
}); 