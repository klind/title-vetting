/**
 * Request logging configuration
 */
export interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  sourceIp?: string;
  timestamp: string;
  duration?: number;
}

/**
 * Response logging configuration
 */
export interface ResponseLogData extends RequestLogData {
  statusCode: number;
  responseSize: number;
  error?: string;
}

/**
 * Logs incoming request details
 * 
 * @param data - Request log data
 */
export function logRequest(data: RequestLogData): void {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (['debug', 'info'].includes(logLevel)) {
    const sanitized = sanitizeLogData(data);
    console.log(`[${sanitized.timestamp}] ${sanitized.method} ${sanitized.path}`, {
      requestId: sanitized.requestId,
      userAgent: sanitized.userAgent,
      sourceIp: sanitized.sourceIp,
    });
  }
}

/**
 * Logs response details
 * 
 * @param data - Response log data
 */
export function logResponse(data: ResponseLogData): void {
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  if (['debug', 'info'].includes(logLevel)) {
    const sanitized = sanitizeLogData(data);
    const level = sanitized.statusCode >= 400 ? 'ERROR' : 'INFO';
    
    console.log(`[${sanitized.timestamp}] ${level} ${sanitized.method} ${sanitized.path} - ${sanitized.statusCode}`, {
      requestId: sanitized.requestId,
      responseSize: sanitized.responseSize,
      duration: sanitized.duration,
      error: sanitized.error,
    });
  }
}

/**
 * Sanitizes sensitive data from logs
 * 
 * @param data - Data to sanitize
 * @returns Sanitized data
 */
export function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'authorization'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Mask part of IP addresses for privacy
  if (sanitized.sourceIp) {
    const parts = sanitized.sourceIp.split('.');
    if (parts.length === 4) {
      sanitized.sourceIp = `${parts[0]}.${parts[1]}.*.***`;
    }
  }

  return sanitized;
} 