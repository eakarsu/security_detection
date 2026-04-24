// Configuration constants for NodeGuard Mobile App

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ ? 'http://localhost:3001' : 'https://your-api-domain.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Colors
export const COLORS = {
  primary: '#2196F3',
  primaryLight: '#64B5F6',
  primaryDark: '#1976D2',
  secondary: '#F50057',
  secondaryLight: '#FF5983',
  secondaryDark: '#C51162',
  background: '#0A0E27',
  surface: '#1A1D3A',
  text: '#FFFFFF',
  textSecondary: '#B0BEC5',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
  
  // Severity colors
  critical: '#F44336',
  high: '#FF9800',
  medium: '#2196F3',
  low: '#4CAF50',
};

// Typography
export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Screen dimensions
export const SCREEN_PADDING = 16;

// Animation durations
export const ANIMATION = {
  short: 200,
  medium: 300,
  long: 500,
};

// Security thresholds
export const SECURITY_THRESHOLDS = {
  CRITICAL_RISK_SCORE: 8,
  HIGH_RISK_SCORE: 6,
  MEDIUM_RISK_SCORE: 4,
  MAX_RESPONSE_TIME: 300, // 5 minutes in seconds
};

// Notification settings
export const NOTIFICATION_CONFIG = {
  CRITICAL_ALERT_SOUND: true,
  VIBRATION_PATTERN: [0, 250, 250, 250],
  BADGE_UPDATE_INTERVAL: 30000, // 30 seconds
};