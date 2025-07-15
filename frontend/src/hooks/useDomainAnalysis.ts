import { useState, useCallback, useEffect, useRef } from 'react';
import type { 
  WhoisReport, 
  DomainAnalysisRequest, 
  DomainAnalysisState, 
  RiskAssessment,
  AppError,
  ValidationError,
  UseApiHookReturn 
} from '../types/whois';
import { ProcessingStatus, RiskLevel } from '../types/whois';
import { apiClient, formatApiError, isOnline } from '../utils/api';

/**
 * Initial state for domain analysis
 */
const initialState: DomainAnalysisState = {
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
 * Custom hook for comprehensive domain analysis with state management
 * Performs WHOIS lookup, website validation, social media verification, and risk assessment
 */
export function useDomainAnalysis(): UseApiHookReturn<WhoisReport> & {
  state: DomainAnalysisState;
  lookupDomain: (url: string) => Promise<void>;
  validateUrl: (url: string) => ValidationError[];
  getRiskAssessment: (report: WhoisReport) => RiskAssessment;
  progress: number;
  status: ProcessingStatus;
} {
  const [state, setState] = useState<DomainAnalysisState>(initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

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
      // Local/private network patterns
      { pattern: /localhost/i, message: 'Localhost URLs are not allowed' },
      { pattern: /127\.0\.0\.1/, message: 'Local IP addresses are not allowed' },
      { pattern: /192\.168\./, message: 'Private IP addresses are not allowed' },
      { pattern: /10\./, message: 'Private IP addresses are not allowed' },
      
      // Suspicious domain patterns
      { pattern: /login[\.-]/i, message: 'Domain contains suspicious login-related patterns' },
      { pattern: /secure[\.-]/i, message: 'Domain contains suspicious security-related patterns' },
      { pattern: /verify[\.-]/i, message: 'Domain contains suspicious verification patterns' },
      { pattern: /account[\.-]/i, message: 'Domain contains suspicious account-related patterns' },
      { pattern: /update[\.-]/i, message: 'Domain contains suspicious update patterns' },
      { pattern: /signin/i, message: 'Domain contains suspicious signin patterns' },
      { pattern: /auth[\.-]/i, message: 'Domain contains suspicious authentication patterns' },
      { pattern: /webscr/i, message: 'Domain contains suspicious payment script patterns' },
      
      // Brand impersonation & homoglyph attacks
      { pattern: /g00gle/i, message: 'Domain appears to impersonate Google' },
      { pattern: /faceb00k/i, message: 'Domain appears to impersonate Facebook' },
      { pattern: /paypa1/i, message: 'Domain appears to impersonate PayPal' },
      { pattern: /tw1tter/i, message: 'Domain appears to impersonate Twitter' },
      { pattern: /microsof+t/i, message: 'Domain appears to impersonate Microsoft' },
      { pattern: /amaz0n/i, message: 'Domain appears to impersonate Amazon' },
      { pattern: /lnked[inl]/i, message: 'Domain appears to impersonate LinkedIn' },
      { pattern: /icloud[-\.]/i, message: 'Domain appears to impersonate iCloud' },
      { pattern: /secure.*apple/i, message: 'Domain appears to impersonate Apple security' },
      
      // High-risk or abuse-heavy TLDs
      { pattern: /\.zip$/i, message: 'Domain uses high-risk .zip TLD' },
      { pattern: /\.tk$/i, message: 'Domain uses high-risk .tk TLD' },
      { pattern: /\.ml$/i, message: 'Domain uses high-risk .ml TLD' },
      { pattern: /\.ga$/i, message: 'Domain uses high-risk .ga TLD' },
      { pattern: /\.cf$/i, message: 'Domain uses high-risk .cf TLD' },
      { pattern: /\.gq$/i, message: 'Domain uses high-risk .gq TLD' },
      { pattern: /\.top$/i, message: 'Domain uses high-risk .top TLD' },
      { pattern: /\.xyz$/i, message: 'Domain uses high-risk .xyz TLD' },
      
      // Encoded or suspiciously long subdomains
      { pattern: /^https?:\/\/[a-z0-9]{20,}\.[a-z0-9-]+\..+/i, message: 'Domain has suspiciously long subdomain' },
      
      // Excessive subdomain chaining
      { pattern: /^https?:\/\/([a-z0-9-]+\.){3,}.*$/i, message: 'Domain has excessive subdomain chaining' },
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
      progress: Math.round(progress),
      currentStep: step,
    }));
  }, []);

  /**
   * Performs comprehensive domain analysis for the given URL
   * Includes WHOIS lookup, website validation, social media verification, and risk assessment
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
    startTimeRef.current = Date.now();
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
      // Phase 1: Validation
      updateProgress(10, 'Validating URL format...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Phase 2: Starting analysis
      updateProgress(20, 'Initializing domain analysis...');
      setState(prev => ({ ...prev, status: ProcessingStatus.FETCHING }));
      await new Promise(resolve => setTimeout(resolve, 300));

      // Phase 3: Make API request with progressive updates
      updateProgress(30, 'Querying WHOIS servers...');
      setState(prev => ({ ...prev, status: ProcessingStatus.PROCESSING }));

      // Start the API request and simulate backend progress
      const request: DomainAnalysisRequest = { url: url.trim() };
      
      // Create progress simulation during API call
      let progressStepCounter = 0;
      progressIntervalRef.current = setInterval(() => {
        setState(prev => {
          progressStepCounter++;
          
          if (prev.progress && prev.progress < 75) {
            const increment = Math.random() * 2 + 0.5; // Very slow increment between 0.5-2.5%
            const newProgress = Math.min(Math.round(prev.progress + increment), 75);
            
            // Update step based on progress - simplified to 4 main phases
            let step = prev.currentStep;
            if (newProgress >= 30 && newProgress < 50) {
              step = 'Querying WHOIS registry servers...';
            } else if (newProgress >= 50 && newProgress < 65) {
              step = 'Analyzing website and SSL certificates...';
            } else if (newProgress >= 65 && newProgress < 85) {
              step = 'Checking social media presence...';
            } else if (newProgress >= 85) {
              step = 'Calculating comprehensive risk assessment...';
            }
            
            return {
              ...prev,
              progress: newProgress,
              currentStep: step
            };
          }
          return prev;
        });
      }, 1200); // Even slower updates every 1.2 seconds

      // Make the actual API request with extended timeout for comprehensive analysis
      const response = await apiClient.post<any>('/combined', request, {
        timeout: 180000, // 3 minutes for comprehensive analysis (WHOIS servers can be very slow)
      });
      
      // Clear the progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to retrieve domain analysis data');
      }

      // Phase 4: Final processing
      updateProgress(90, 'Processing and formatting results...');
      await new Promise(resolve => setTimeout(resolve, 400));

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
        socialMedia: response.data.data.socialMedia,
        riskAssessment: response.data.riskAssessment, // This is the key fix!
        rawWhoisData: response.data.data.whois.rawData,
        metadata: {
          lookupTime: response.data.data.whois.metadata.lookupTime,
          source: response.data.data.whois.metadata.source,
          timestamp: response.data.data.whois.metadata.timestamp,
          serversQueried: response.data.data.whois.metadata.serversQueried || [],
          errors: response.data.data.whois.metadata.errors || [],
          warnings: response.data.data.whois.metadata.warnings || [],
          totalFields: response.data.data.whois.metadata.totalFields || 0,
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
        currentStep: 'Analysis completed successfully',
        riskAssessment,
      }));

    } catch (error) {
      console.error('Domain analysis failed:', error);
      
      // Clear the progress interval if it's still running
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      const appError = error as AppError;
      let errorMessage = formatApiError(appError);
      
      // Add helpful context for timeout errors
      if (appError.type === 'TIMEOUT_ERROR') {
        errorMessage += ' You can try again with a simpler domain or check back later.';
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        data: null,
        status: ProcessingStatus.FAILED,
        currentStep: 'Analysis failed',
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [validateUrl, getRiskAssessment, updateProgress]);

  /**
   * Executes the domain analysis (alias for compatibility)
   */
  const execute = useCallback(async (params?: { url: string }): Promise<void> => {
    if (!params?.url) {
      throw new Error('URL parameter is required');
    }
    await lookupDomain(params.url);
  }, [lookupDomain]);

  /**
   * Resets the analysis state
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

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Reset start time
    startTimeRef.current = null;

    setState(initialState);
  }, []);

  /**
   * Aborts the current analysis
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      loading: false,
      error: 'Analysis was cancelled',
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
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
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

    // Extended interface for domain analysis
    state,
    lookupDomain,
    validateUrl,
    getRiskAssessment,
    progress: state.progress || 0,
    status: state.status,
  };
}