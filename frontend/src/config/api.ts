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
    const response = await fetch('/api/config');
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
      pythonApiUrl: process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      frontendUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'
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
      pythonApiUrl: process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000',
      nodejsApiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
      frontendUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'
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
  
  // Node.js API endpoints
  auth: () => getApiEndpoint('/auth', 'nodejs'),
  security: () => getApiEndpoint('/security', 'nodejs'),
  workflows: () => getApiEndpoint('/api/v1/workflows', 'nodejs'),
  workflowExecute: (id: string) => getApiEndpoint(`/api/v1/workflows/${id}/execute`, 'nodejs'),
  health: () => getApiEndpoint('/health', 'nodejs'),
  status: () => getApiEndpoint('/api/v1/status', 'nodejs'),
};

// Debug logging will be handled by initializeConfig function
