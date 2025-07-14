import { 
  ApiResponse, 
  ApiConfig, 
  RequestOptions, 
  HttpMethod, 
  ErrorType, 
  AppError 
} from '../types/whois';

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

/**
 * HTTP status code ranges
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Retry-able status codes
 */
const RETRYABLE_STATUS_CODES = [
  HTTP_STATUS.RATE_LIMITED,
  HTTP_STATUS.INTERNAL_SERVER_ERROR,
  HTTP_STATUS.BAD_GATEWAY,
  HTTP_STATUS.SERVICE_UNAVAILABLE,
  HTTP_STATUS.GATEWAY_TIMEOUT,
];

/**
 * API client class with retry logic and error handling
 */
class ApiClient {
  private config: ApiConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Makes an HTTP request with retry logic
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const requestId = this.generateRequestId();
    const url = this.buildUrl(endpoint);
    
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.retries,
    } = options;

    // Create abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    try {
      return await this.executeWithRetry({
        url,
        method,
        headers: this.buildHeaders(headers),
        body: this.serializeBody(body),
        signal: abortController.signal,
        timeout,
        retries,
        requestId,
      });
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * GET request helper
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T = any>(endpoint: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body: data });
  }

  /**
   * PUT request helper
   */
  async put<T = any>(endpoint: string, data?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  /**
   * DELETE request helper
   */
  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Aborts a specific request
   */
  abort(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Aborts all pending requests
   */
  abortAll(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  /**
   * Updates the API configuration
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Executes request with retry logic
   */
  private async executeWithRetry(params: {
    url: string;
    method: HttpMethod;
    headers: Record<string, string>;
    body?: string;
    signal: AbortSignal;
    timeout: number;
    retries: number;
    requestId: string;
  }): Promise<ApiResponse<any>> {
    const { url, method, headers, body, signal, timeout, retries, requestId } = params;
    let lastError: AppError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timeoutId = setTimeout(() => {
            reject(this.createError(ErrorType.TIMEOUT_ERROR, 'Request timeout'));
          }, timeout);

          // Clear timeout if request is aborted
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(this.createError(ErrorType.NETWORK_ERROR, 'Request aborted'));
          });
        });

        // Make the actual request
        const requestPromise = fetch(url, {
          method,
          headers,
          body,
          signal,
        });

        // Race between request and timeout
        const response = await Promise.race([requestPromise, timeoutPromise]);
        
        // Check if response is ok
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          
          // Check if this error is retryable
          if (attempt < retries && this.isRetryableError(response.status)) {
            await this.delay(this.config.retryDelay * (attempt + 1));
            continue;
          }
          
          throw this.createApiErrorFromResponse(response, errorData);
        }

        // Parse successful response
        const data = await response.json();
        return data as ApiResponse<any>;

      } catch (error) {
        lastError = this.handleRequestError(error);
        
        // Don't retry on certain errors
        if (!this.shouldRetry(lastError, attempt, retries)) {
          break;
        }

        // Wait before retrying
        if (attempt < retries) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || this.createError(ErrorType.UNKNOWN_ERROR, 'Unknown error occurred');
  }

  /**
   * Builds the full URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Builds request headers
   */
  private buildHeaders(customHeaders: Record<string, string>): Record<string, string> {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    return {
      ...defaultHeaders,
      ...customHeaders,
    };
  }

  /**
   * Serializes request body
   */
  private serializeBody(body: any): string | undefined {
    if (!body) return undefined;
    
    if (typeof body === 'string') return body;
    
    try {
      return JSON.stringify(body);
    } catch (error) {
      throw this.createError(
        ErrorType.VALIDATION_ERROR, 
        'Failed to serialize request body'
      );
    }
  }

  /**
   * Parses error response
   */
  private async parseErrorResponse(response: Response): Promise<any> {
    try {
      return await response.json();
    } catch {
      return { error: response.statusText || 'Unknown error' };
    }
  }

  /**
   * Creates an API error from response
   */
  private createApiErrorFromResponse(response: Response, errorData: any): AppError {
    const message = errorData?.error || errorData?.message || response.statusText || 'API request failed';
    
    let errorType: ErrorType;
    switch (response.status) {
      case HTTP_STATUS.BAD_REQUEST:
        errorType = ErrorType.VALIDATION_ERROR;
        break;
      case HTTP_STATUS.RATE_LIMITED:
        errorType = ErrorType.RATE_LIMIT_ERROR;
        break;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.BAD_GATEWAY:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
      case HTTP_STATUS.GATEWAY_TIMEOUT:
        errorType = ErrorType.API_ERROR;
        break;
      default:
        errorType = ErrorType.API_ERROR;
    }

    return this.createError(errorType, message, {
      status: response.status,
      statusText: response.statusText,
      ...errorData,
    });
  }

  /**
   * Handles request errors
   */
  private handleRequestError(error: any): AppError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return this.createError(ErrorType.NETWORK_ERROR, 'Request was aborted');
      }
      
      if (error.message.includes('timeout')) {
        return this.createError(ErrorType.TIMEOUT_ERROR, 'Request timed out');
      }
      
      if (error.message.includes('network') || error.name === 'TypeError') {
        return this.createError(ErrorType.NETWORK_ERROR, 'Network error occurred');
      }
    }

    if (this.isAppError(error)) {
      return error;
    }

    return this.createError(
      ErrorType.UNKNOWN_ERROR, 
      error?.message || 'Unknown error occurred'
    );
  }

  /**
   * Creates a structured error object
   */
  private createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryableErrorType(type),
    };
  }

  /**
   * Checks if error is retryable based on status code
   */
  private isRetryableError(status: number): boolean {
    return RETRYABLE_STATUS_CODES.includes(status);
  }

  /**
   * Checks if error type is retryable
   */
  private isRetryableErrorType(type: ErrorType): boolean {
    return [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.API_ERROR,
    ].includes(type);
  }

  /**
   * Determines if request should be retried
   */
  private shouldRetry(error: AppError, attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries && error.retryable;
  }

  /**
   * Type guard for AppError
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'timestamp' in error;
  }

  /**
   * Delays execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

/**
 * Creates a new API client with custom configuration
 */
export function createApiClient(config: Partial<ApiConfig>): ApiClient {
  return new ApiClient(config);
}

/**
 * Convenience function to check online status
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Convenience function to wait for online status
 */
export function waitForOnline(): Promise<void> {
  return new Promise(resolve => {
    if (isOnline()) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Helper to format API errors for display
 */
export function formatApiError(error: AppError | string): string {
  if (typeof error === 'string') {
    return error;
  }

  switch (error.type) {
    case ErrorType.NETWORK_ERROR:
      return 'Network connection error. Please check your internet connection.';
    case ErrorType.TIMEOUT_ERROR:
      return 'Request timed out. Please try again.';
    case ErrorType.RATE_LIMIT_ERROR:
      return 'Too many requests. Please wait a moment and try again.';
    case ErrorType.VALIDATION_ERROR:
      return error.message || 'Invalid input provided.';
    case ErrorType.API_ERROR:
      return error.message || 'Server error occurred. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}