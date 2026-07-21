// API Configuration for NodeGuard Frontend
// Supports both build-time and runtime configuration

interface ApiConfig {
  pythonApiUrl: string;
  nodejsApiUrl: string;
  frontendUrl: string;
}

let API_CONFIG: ApiConfig | null = null;

// Initialize configuration from runtime API
export const initializeConfig = async (): Promise<ApiConfig> => {
  if (API_CONFIG) return API_CONFIG;
  
  try {
    // Fetch runtime config from Node.js API
    const response = await fetch('/api/v1/config');
    if (response.ok) {
      API_CONFIG = await response.json();
      console.log('🔧 Runtime API Configuration loaded:', API_CONFIG);
      return API_CONFIG;
    }
    throw new Error('Failed to fetch runtime config');
  } catch (error) {
    console.warn('Failed to load runtime config, using build-time defaults:', error);
    // Fallback to build-time environment variables
    API_CONFIG = {
      pythonApiUrl: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000'
    };
    console.log('🔧 Build-time API Configuration used:', API_CONFIG);
    return API_CONFIG;
  }
};

// Get current configuration (must be initialized first)
export const getApiConfig = (): ApiConfig => {
  if (!API_CONFIG) {
    // Fallback to build-time config if not initialized
    console.warn('API Config not initialized, using build-time fallback');
    return {
      pythonApiUrl: import.meta.env.VITE_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      frontendUrl: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000'
    };
  }
  return API_CONFIG;
};

// Legacy export for backward compatibility
export const API_CONFIG_SYNC = {
  get pythonApiUrl() { return getApiConfig().pythonApiUrl; },
  get nodejsApiUrl() { return getApiConfig().nodejsApiUrl; },
  get frontendUrl() { return getApiConfig().frontendUrl; }
};

// Helper functions for common API endpoints
export const getApiEndpoint = (endpoint: string, service: 'python' | 'nodejs' = 'python') => {
  const config = getApiConfig();
  const baseUrl = service === 'python' ? config.pythonApiUrl : config.nodejsApiUrl;
  return `${baseUrl}${endpoint}`;
};

// Common endpoints
export const ENDPOINTS = {
  // Python API endpoints
  incidents: () => getApiEndpoint('/api/incidents', 'python'),
  threatIntel: () => getApiEndpoint('/api/threat-intel', 'python'),
  compliance: () => getApiEndpoint('/api/compliance/', 'python'),
  detection: () => getApiEndpoint('/api/detection', 'python'),
  ml: () => getApiEndpoint('/api/ml', 'python'),
  dashboard: () => getApiEndpoint('/api/dashboard', 'python'),

  // Export endpoints
  exportCsvIncidents: () => getApiEndpoint('/api/export/csv/incidents', 'python'),
  exportCsvThreatIntel: () => getApiEndpoint('/api/export/csv/threat-intel', 'python'),
  exportPdfIncidents: () => getApiEndpoint('/api/export/pdf/incidents', 'python'),
  exportPdfThreatIntel: () => getApiEndpoint('/api/export/pdf/threat-intel', 'python'),

  // Bulk operation endpoints
  bulkIncidents: () => getApiEndpoint('/api/bulk/incidents', 'python'),
  bulkThreatIntel: () => getApiEndpoint('/api/bulk/threat-intel', 'python'),

  // Node.js API endpoints
  auth: () => getApiEndpoint('/api/v1/auth', 'nodejs'),
  authLogin: () => getApiEndpoint('/api/v1/auth/login', 'nodejs'),
  authRegister: () => getApiEndpoint('/api/v1/auth/register', 'nodejs'),
  authForgotPassword: () => getApiEndpoint('/api/v1/auth/forgot-password', 'nodejs'),
  authResetPassword: () => getApiEndpoint('/api/v1/auth/reset-password', 'nodejs'),
  authChangePassword: () => getApiEndpoint('/api/v1/auth/change-password', 'nodejs'),
  authLogout: () => getApiEndpoint('/api/v1/auth/logout', 'nodejs'),
  authVerifyEmail: () => getApiEndpoint('/api/v1/auth/verify-email', 'nodejs'),
  authResendVerification: () => getApiEndpoint('/api/v1/auth/resend-verification', 'nodejs'),
  authProfile: () => getApiEndpoint('/api/v1/auth/profile', 'nodejs'),
  security: () => getApiEndpoint('/security', 'nodejs'),
  workflows: () => getApiEndpoint('/api/v1/workflows', 'nodejs'),
  workflowExecute: (id: string) => getApiEndpoint(`/api/v1/workflows/${id}/execute`, 'nodejs'),
  health: () => getApiEndpoint('/health', 'nodejs'),
  status: () => getApiEndpoint('/api/v1/status', 'nodejs'),

  // SIEM endpoints
  siemLogs: () => getApiEndpoint('/api/siem/logs', 'python'),
  siemLogsIngest: () => getApiEndpoint('/api/siem/logs/ingest', 'python'),
  siemLogsStream: () => getApiEndpoint('/api/siem/logs/stream', 'python'),
  siemLogsStats: () => getApiEndpoint('/api/siem/logs/stats', 'python'),
  siemSources: () => getApiEndpoint('/api/siem/sources', 'python'),
  siemRules: () => getApiEndpoint('/api/siem/rules', 'python'),
  siemRetention: () => getApiEndpoint('/api/siem/retention', 'python'),

  // Threat Hunting endpoints
  huntingHypotheses: () => getApiEndpoint('/api/hunting/hypotheses', 'python'),
  huntingIocSweep: () => getApiEndpoint('/api/hunting/ioc-sweep', 'python'),
  huntingUebaBaselines: () => getApiEndpoint('/api/hunting/ueba/baselines', 'python'),
  huntingUebaAnomalies: () => getApiEndpoint('/api/hunting/ueba/anomalies', 'python'),
  huntingMitreMatrix: () => getApiEndpoint('/api/hunting/mitre/matrix', 'python'),
  huntingMitreMappings: () => getApiEndpoint('/api/hunting/mitre/mappings', 'python'),
  huntingKillChain: () => getApiEndpoint('/api/hunting/kill-chain', 'python'),
  huntingKillChainDetect: () => getApiEndpoint('/api/hunting/kill-chain/detect', 'python'),
  huntingSigma: () => getApiEndpoint('/api/hunting/sigma', 'python'),

  // Advanced Detection endpoints
  advancedDetectionRules: () => getApiEndpoint('/api/advanced-detection/rules', 'python'),
  advancedDetectionYara: () => getApiEndpoint('/api/advanced-detection/yara', 'python'),
  advancedDetectionCorrelation: () => getApiEndpoint('/api/advanced-detection/correlation', 'python'),

  // Threat Intel Feed Loader endpoints (audit fix: empty malicious IP set)
  detectionThreatIntelStats: () => getApiEndpoint('/api/detection/threat-intel/stats', 'python'),
  detectionThreatIntelRefresh: () => getApiEndpoint('/api/detection/threat-intel/refresh', 'python'),

  // AI SOC Analyst endpoints
  socAnalystChat: () => getApiEndpoint('/api/soc-analyst/chat', 'python'),
  socAnalystTriage: () => getApiEndpoint('/api/soc-analyst/triage', 'python'),
  socAnalystBulkTriage: () => getApiEndpoint('/api/soc-analyst/bulk-triage', 'python'),
  socAnalystInvestigate: () => getApiEndpoint('/api/soc-analyst/investigate', 'python'),
  socAnalystCorrelate: () => getApiEndpoint('/api/soc-analyst/correlate', 'python'),
  socAnalystSessions: () => getApiEndpoint('/api/soc-analyst/sessions', 'python'),
  socAnalystStats: () => getApiEndpoint('/api/soc-analyst/stats', 'python'),
};

// Debug logging will be handled by initializeConfig function
