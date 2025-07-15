/**
 * Frontend types for the Title Company Vetter application
 * These types mirror the backend API responses but are optimized for UI consumption
 */

/**
 * WHOIS report structure as returned by the API
 */
export interface WhoisReport {
  domain: string;
  
  // Basic domain info
  registryDomainId?: string;
  
  // Registrant information
  registrant: {
    name?: string;
    organization?: string;
    email?: string;
    country?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  
  // Administrative contact
  admin: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Technical contact
  tech: {
    name?: string;
    organization?: string;
    email?: string;
    phone?: string;
    phoneExt?: string;
    fax?: string;
    faxExt?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Registration details
  registration: {
    createdDate?: string;
    expirationDate?: string;
    updatedDate?: string;
    registrar?: string;
    registrarWhoisServer?: string;
    registrarUrl?: string;
    registrarIanaId?: string;
    registrarAbuseContactEmail?: string;
    registrarAbuseContactPhone?: string;
  };
  
  // Technical details
  technical: {
    nameServers?: string[];
    status?: string;
    dnssec?: string;
  };
  
  // Additional validation results
  website?: any; // WebsiteValidationResult from backend
  socialMedia?: any; // SocialMediaValidationResult from backend
  
  // Risk assessment results
  riskAssessment?: OptimizedRiskAssessmentResult;
  
  // Legacy risk factors (for backward compatibility)
  riskFactors?: string[];
  
  // Raw WHOIS data for reference
  rawWhoisData?: any;
  
  // Metadata
  metadata: {
    lookupTime: number;
    source: string;
    timestamp: string;
    serversQueried: string[];
    errors: string[];
    warnings: string[];
    totalFields: number;
  };
}

/**
 * Website validation result structure
 */
export interface WebsiteValidation {
  hasWebsite: boolean;
  isAccessible: boolean;
  statusCode?: number;
  contentType?: string;
  title?: string;
  responseTime?: number;
  redirectUrl?: string;
  contacts?: {
    emails: string[];
    phones: string[];
    addresses: string[];
  };
  ssl?: {
    hasSSL: boolean;
    isValid: boolean;
    isSelfSigned: boolean;
    error?: string;
  };
  hasDns: boolean;
  error?: string;
}

/**
 * Social media validation result structure
 */
export interface SocialMediaValidation {
  profiles?: Array<{
    platform: string;
    urls?: string[];
    exists: boolean;
    followers?: number;
  }>;
  totalProfiles?: number;
  hasConsistentPresence?: boolean;
  credibilityScore?: number;
  vettingAssessment?: string[];
  botDetectionMessages?: string[];
  error?: string;
}

/**
 * Combined report structure with new API response format
 */
export interface CombinedReport {
  data: {
    whois: {
      domain: string;
      tld: string;
      ianaServer: string;
      registryServer: string | null;
      registrarServer: string | null;
      parsedData: Record<string, any>;
      rawData: {
        iana?: Record<string, any>;
        registry?: Record<string, any>;
        registrar?: Record<string, any>;
      };
      metadata: {
        lookupTime: number;
        source: string;
        timestamp: string;
        serversQueried: string[];
        errors: string[];
        warnings: string[];
        totalFields: number;
      };
    };
    website: WebsiteValidation;
    socialMedia: SocialMediaValidation;
  };
  riskFactors: string[];
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

/**
 * API request for domain analysis (WHOIS, website, social media, risk assessment)
 */
export interface DomainAnalysisRequest {
  url: string;
}

/**
 * Loading states for async operations
 */
export interface ApiState<T = any> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

/**
 * Form validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * URL validation result
 */
export interface UrlValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Risk level type for better type safety
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export const RiskLevel = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
  CRITICAL: 'critical' as const,
} as const;

/**
 * Risk factor with detailed information
 */
export interface RiskFactor {
  id: string;
  category: string;
  condition: string;
  score: number;
  description: string;
  triggered: boolean;
  value?: number | string | boolean;
}

/**
 * Optimized category risk assessment for production UI
 */
export interface OptimizedCategoryRiskAssessment {
  category: 'whois' | 'website' | 'socialMedia';
  score: number;
  maxScore: number;
  riskLevel: RiskLevel;
  contributingFactors: RiskFactor[];
}

/**
 * Optimized risk assessment result for production UI
 */
export interface OptimizedRiskAssessmentResult {
  overallScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  whoisAssessment: OptimizedCategoryRiskAssessment;
  websiteAssessment: OptimizedCategoryRiskAssessment;
  socialMediaAssessment: OptimizedCategoryRiskAssessment;
  contributingFactors: RiskFactor[];
  riskSummary: string;
  keyIssues: string[];
  recommendations: string[];
  timestamp: string;
}

/**
 * Legacy risk assessment for display purposes (backward compatibility)
 */
export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0-100
  factors: string[];
  recommendations: string[];
}

/**
 * Processing status for multi-step operations
 */
export type ProcessingStatus = 'idle' | 'validating' | 'fetching' | 'processing' | 'completed' | 'failed';

export const ProcessingStatus = {
  IDLE: 'idle' as const,
  VALIDATING: 'validating' as const,
  FETCHING: 'fetching' as const,
  PROCESSING: 'processing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
} as const;

/**
 * Extended state for the domain analysis process
 */
export interface DomainAnalysisState extends ApiState<WhoisReport> {
  status: ProcessingStatus;
  progress?: number; // 0-100
  currentStep?: string;
  validationErrors: ValidationError[];
  riskAssessment?: RiskAssessment;
}

/**
 * Configuration for the API client
 */
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

/**
 * HTTP methods supported by the API
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Request options for API calls
 */
export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
}

/**
 * Theme configuration
 */
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: Theme;
  autoRefresh: boolean;
  notifications: boolean;
  maxHistoryItems: number;
}

/**
 * Lookup history item
 */
export interface HistoryItem {
  id: string;
  url: string;
  domain: string;
  timestamp: string;
  riskLevel: RiskLevel;
  success: boolean;
  errorMessage?: string;
}

/**
 * Application state
 */
export interface AppState {
  currentLookup: DomainAnalysisState;
  history: HistoryItem[];
  preferences: UserPreferences;
  isOnline: boolean;
}

/**
 * Error types for better error handling
 */
export type ErrorType = 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'API_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR' | 'UNKNOWN_ERROR';

export const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR' as const,
  VALIDATION_ERROR: 'VALIDATION_ERROR' as const,
  API_ERROR: 'API_ERROR' as const,
  TIMEOUT_ERROR: 'TIMEOUT_ERROR' as const,
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR' as const,
  UNKNOWN_ERROR: 'UNKNOWN_ERROR' as const,
} as const;

/**
 * Structured error object
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: string;
  retryable: boolean;
}

/**
 * Notification object
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  duration?: number; // auto-dismiss after ms
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

/**
 * Component props interfaces
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export interface ErrorDisplayProps extends BaseComponentProps {
  error: string | AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
}

/**
 * Form-related types
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'tel' | 'password';
  placeholder?: string;
  required?: boolean;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
}

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Utility types
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Event handler types
 */
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;
export type ChangeHandler<T = any> = (value: T) => void;

/**
 * Hook return types
 */
export interface UseApiHookReturn<T> extends ApiState<T> {
  execute: (params?: any) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export interface UseFormHookReturn<T> {
  values: T;
  errors: Record<keyof T, string>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  handleChange: (field: keyof T) => ChangeHandler;
  handleBlur: (field: keyof T) => EventHandler;
  handleSubmit: (onSubmit: (values: T) => Promise<void>) => EventHandler;
  reset: () => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
}