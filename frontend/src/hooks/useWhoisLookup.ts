import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  WhoisReport, 
  DomainAnalysisRequest, 
  WhoisLookupState, 
  RiskAssessment,
  AppError,
  ValidationError,
  UseApiHookReturn 
} from '../types/whois';
import { ProcessingStatus, RiskLevel } from '../types/whois';
import { apiClient, formatApiError, isOnline } from '../utils/api';

/**
 * Initial state for WHOIS lookup
 */
const initialState: WhoisLookupState = {
  loading: false,
  error: null,
  data: null,
  status: ProcessingStatus.IDLE,
  progress: 0,
  currentStep: '',
  validationErrors: [],
  riskAssessment: undefined,
};

/**
 * Custom hook for WHOIS domain lookups with comprehensive state management
 */
export function useWhoisLookup(): UseApiHookReturn<WhoisReport> & {
  state: WhoisLookupState;
  lookupDomain: (url: string) => Promise<void>;
  validateUrl: (url: string) => ValidationError[];
  getRiskAssessment: (report: WhoisReport) => RiskAssessment;
  progress: number;
  status: ProcessingStatus;
} {
  const [state, setState] = useState<WhoisLookupState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Validates URL format and returns validation errors
   */
  const validateUrl = useCallback((url: string): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!url) {
      errors.push({
        field: 'url',
        message: 'URL is required',
      });
      return errors;
    }

    const trimmedUrl = url.trim();

    if (trimmedUrl.length === 0) {
      errors.push({
        field: 'url',
        message: 'URL cannot be empty',
      });
      return errors;
    }

    // Basic URL format validation
    const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    if (!urlRegex.test(trimmedUrl)) {
      errors.push({
        field: 'url',
        message: 'Please enter a valid URL (e.g., https://example.com)',
      });
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /localhost/i, message: 'Localhost URLs are not allowed' },
      { pattern: /127\.0\.0\.1/, message: 'Local IP addresses are not allowed' },
      { pattern: /192\.168\./, message: 'Private IP addresses are not allowed' },
      { pattern: /10\./, message: 'Private IP addresses are not allowed' },
    ];

    suspiciousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(trimmedUrl)) {
        errors.push({
          field: 'url',
          message,
        });
      }
    });

    return errors;
  }, []);

  /**
   * Extracts risk assessment from WHOIS report (now handled by backend)
   */
  const getRiskAssessment = useCallback((report: WhoisReport): RiskAssessment => {
    // Use the backend's risk assessment if available
    if (report.riskAssessment) {
      return {
        level: report.riskAssessment.riskLevel,
        score: report.riskAssessment.overallScore,
        factors: report.riskAssessment.keyIssues,
        recommendations: report.riskAssessment.recommendations,
      };
    }

    // Fallback to legacy assessment if backend data is not available
    let score = 0;
    const factors: string[] = [];
    const recommendations: string[] = [];

    // Check creation date
    if (report.registration.createdDate) {
      const created = new Date(report.registration.createdDate);
      const daysSinceCreation = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceCreation < 30) {
        score += 30;
        factors.push('Domain created very recently (less than 30 days)');
        recommendations.push('Exercise extra caution with newly registered domains');
      } else if (daysSinceCreation < 90) {
        score += 15;
        factors.push('Domain created recently (less than 90 days)');
      }
    }

    // Check expiration date
    if (report.registration.expirationDate) {
      const expiration = new Date(report.registration.expirationDate);
      const daysUntilExpiration = (expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiration < 30) {
        score += 20;
        factors.push('Domain expires soon');
        recommendations.push('Verify the company is renewing their domain registration');
      }
    }

    // Check for privacy protection
    if (report.registrant.name?.toLowerCase().includes('privacy') ||
        report.registrant.organization?.toLowerCase().includes('privacy')) {
      score += 10;
      factors.push('Domain uses privacy protection service');
      recommendations.push('Privacy protection is common but limits transparency');
    }

    // Check for missing contact information
    if (!report.registrant.email && !report.admin.email) {
      score += 15;
      factors.push('No public contact information available');
      recommendations.push('Look for alternative contact methods on the website');
    }

    // Determine risk level
    let level: RiskLevel;
    if (score >= 70) {
      level = RiskLevel.CRITICAL;
      recommendations.push('Consider additional verification steps before proceeding');
    } else if (score >= 50) {
      level = RiskLevel.HIGH;
      recommendations.push('Perform thorough due diligence');
    } else if (score >= 25) {
      level = RiskLevel.MEDIUM;
      recommendations.push('Standard verification procedures recommended');
    } else {
      level = RiskLevel.LOW;
      recommendations.push('Domain appears to have low risk factors');
    }

    return {
      level,
      score: Math.min(score, 100),
      factors,
      recommendations,
    };
  }, []);

  /**
   * Updates the processing progress
   */
  const updateProgress = useCallback((progress: number, step: string) => {
    setState(prev => ({
      ...prev,
      progress,
      currentStep: step,
    }));
  }, []);

  /**
   * Performs WHOIS lookup for the given URL
   */
  const lookupDomain = useCallback(async (url: string): Promise<void> => {
    // Check if online
    if (!isOnline()) {
      setState(prev => ({
        ...prev,
        error: 'No internet connection. Please check your network and try again.',
        status: ProcessingStatus.FAILED,
      }));
      return;
    }

    // Validate URL first
    const validationErrors = validateUrl(url);
    if (validationErrors.length > 0) {
      setState(prev => ({
        ...prev,
        validationErrors,
        error: validationErrors[0].message,
        status: ProcessingStatus.FAILED,
      }));
      return;
    }

    // Reset state and start lookup
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      data: null,
      status: ProcessingStatus.VALIDATING,
      progress: 0,
      currentStep: 'Validating URL...',
      validationErrors: [],
      riskAssessment: undefined,
    }));

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      // Simulate progress updates
      updateProgress(10, 'Validating URL...');
      await new Promise(resolve => setTimeout(resolve, 500));

      updateProgress(25, 'Connecting to WHOIS service...');
      setState(prev => ({ ...prev, status: ProcessingStatus.FETCHING }));
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(50, 'Performing WHOIS lookup...');
      setState(prev => ({ ...prev, status: ProcessingStatus.PROCESSING }));

      // Make the API request
      const request: DomainAnalysisRequest = { url: url.trim() };
      const response = await apiClient.post<any>('/combined', request);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to retrieve WHOIS data');
      }

      updateProgress(75, 'Processing results...');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Transform the backend response to match frontend expectations
      const transformedData: WhoisReport = {
        domain: response.data.data.whois.domain,
        registryDomainId: response.data.data.whois.parsedData['Registry Domain ID'],
        registrant: {
          name: response.data.data.whois.parsedData['Registrant Name'],
          organization: response.data.data.whois.parsedData['Registrant Organization'],
          email: response.data.data.whois.parsedData['Registrant Email'],
          phone: response.data.data.whois.parsedData['Registrant Phone'],
          street: response.data.data.whois.parsedData['Registrant Street'],
          city: response.data.data.whois.parsedData['Registrant City'],
          state: response.data.data.whois.parsedData['Registrant State/Province'],
          postalCode: response.data.data.whois.parsedData['Registrant Postal Code'],
          country: response.data.data.whois.parsedData['Registrant Country'],
        },
        admin: {
          name: response.data.data.whois.parsedData['Admin Name'],
          organization: response.data.data.whois.parsedData['Admin Organization'],
          email: response.data.data.whois.parsedData['Admin Email'],
          phone: response.data.data.whois.parsedData['Admin Phone'],
          street: response.data.data.whois.parsedData['Admin Street'],
          city: response.data.data.whois.parsedData['Admin City'],
          state: response.data.data.whois.parsedData['Admin State/Province'],
          postalCode: response.data.data.whois.parsedData['Admin Postal Code'],
          country: response.data.data.whois.parsedData['Admin Country'],
        },
        tech: {
          name: response.data.data.whois.parsedData['Tech Name'],
          organization: response.data.data.whois.parsedData['Tech Organization'],
          email: response.data.data.whois.parsedData['Tech Email'],
          phone: response.data.data.whois.parsedData['Tech Phone'],
          street: response.data.data.whois.parsedData['Tech Street'],
          city: response.data.data.whois.parsedData['Tech City'],
          state: response.data.data.whois.parsedData['Tech State/Province'],
          postalCode: response.data.data.whois.parsedData['Tech Postal Code'],
          country: response.data.data.whois.parsedData['Tech Country'],
        },
        registration: {
          createdDate: response.data.data.whois.parsedData['Creation Date'],
          expirationDate: response.data.data.whois.parsedData['Registrar Registration Expiration Date'],
          updatedDate: response.data.data.whois.parsedData['Updated Date'],
          registrar: response.data.data.whois.parsedData['Registrar'],
          registrarWhoisServer: response.data.data.whois.parsedData['Registrar WHOIS Server'],
          registrarUrl: response.data.data.whois.parsedData['Registrar URL'],
          registrarIanaId: response.data.data.whois.parsedData['Registrar IANA ID'],
          registrarAbuseContactEmail: response.data.data.whois.parsedData['Registrar Abuse Contact Email'],
          registrarAbuseContactPhone: response.data.data.whois.parsedData['Registrar Abuse Contact Phone'],
        },
        technical: {
          nameServers: response.data.data.whois.parsedData['Name Server'] ? [response.data.data.whois.parsedData['Name Server']] : [],
          status: response.data.data.whois.parsedData['Domain Status'],
          dnssec: response.data.data.whois.parsedData['DNSSEC'],
        },
        website: response.data.data.website,
        riskAssessment: response.data.riskAssessment, // This is the key fix!
        rawWhoisData: response.data.data.whois.rawData,
        metadata: {
          lookupTime: response.data.data.whois.metadata.lookupTime,
          source: response.data.data.whois.metadata.source,
          timestamp: response.data.data.whois.metadata.timestamp,
        },
      };

      // Calculate risk assessment for backward compatibility
      const riskAssessment = getRiskAssessment(transformedData);

      updateProgress(100, 'Complete');
      setState(prev => ({
        ...prev,
        loading: false,
        error: null,
        data: transformedData,
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        currentStep: 'Lookup completed successfully',
        riskAssessment,
      }));

    } catch (error) {
      console.error('WHOIS lookup failed:', error);
      
      const appError = error as AppError;
      const errorMessage = formatApiError(appError);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        data: null,
        status: ProcessingStatus.FAILED,
        currentStep: 'Lookup failed',
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [validateUrl, getRiskAssessment, updateProgress]);

  /**
   * Executes the WHOIS lookup (alias for compatibility)
   */
  const execute = useCallback(async (params?: { url: string }): Promise<void> => {
    if (!params?.url) {
      throw new Error('URL parameter is required');
    }
    await lookupDomain(params.url);
  }, [lookupDomain]);

  /**
   * Resets the lookup state
   */
  const reset = useCallback(() => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear any timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(initialState);
  }, []);

  /**
   * Aborts the current lookup
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: false,
      error: 'Lookup was cancelled',
      status: ProcessingStatus.FAILED,
      currentStep: 'Cancelled',
    }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // Standard API hook interface
    loading: state.loading,
    error: state.error,
    data: state.data,
    execute,
    reset,
    abort,

    // Extended interface for WHOIS lookup
    state,
    lookupDomain,
    validateUrl,
    getRiskAssessment,
    progress: state.progress || 0,
    status: state.status,
  };
}