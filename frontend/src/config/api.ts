// API Configuration for NodeGuard Frontend
// Automatically detects local development vs Docker container mode

interface ApiConfig {
  pythonApiUrl: string;
  nodejsApiUrl: string;
  frontendUrl: string;
}

const getApiConfig = (): ApiConfig => {
  // All URLs must come from environment variables - no hardcoded ports!
  // React environment variables are injected at build time
  const pythonApiUrl = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000';
  const nodejsApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

  return {
    pythonApiUrl,
    nodejsApiUrl,
    frontendUrl
  };
};

export const API_CONFIG = getApiConfig();

// Helper functions for common API endpoints
export const getApiEndpoint = (endpoint: string, service: 'python' | 'nodejs' = 'python') => {
  const baseUrl = service === 'python' ? API_CONFIG.pythonApiUrl : API_CONFIG.nodejsApiUrl;
  return `${baseUrl}${endpoint}`;
};

// Common endpoints
export const ENDPOINTS = {
  // Python API endpoints
  incidents: () => getApiEndpoint('/api/incidents', 'python'),
  threatIntel: () => getApiEndpoint('/api/threat-intel', 'python'),
  compliance: () => getApiEndpoint('/api/compliance', 'python'),
  detection: () => getApiEndpoint('/api/detection', 'python'),
  ml: () => getApiEndpoint('/api/ml', 'python'),
  dashboard: () => getApiEndpoint('/api/dashboard', 'python'),
  
  // Node.js API endpoints
  auth: () => getApiEndpoint('/auth', 'nodejs'),
  security: () => getApiEndpoint('/security', 'nodejs'),
  workflow: () => getApiEndpoint('/workflow', 'nodejs'),
  health: () => getApiEndpoint('/health', 'nodejs'),
  status: () => getApiEndpoint('/api/v1/status', 'nodejs'),
};

// Debug logging in development
if (window.location.hostname === 'localhost') {
  console.log('🔧 API Configuration:', {
    mode: (window as any).REACT_APP_LOCAL_DEV_MODE === 'true' ? 'Local Development' : 'Docker Containers',
    pythonApi: API_CONFIG.pythonApiUrl,
    nodejsApi: API_CONFIG.nodejsApiUrl,
    frontend: API_CONFIG.frontendUrl
  });
}
