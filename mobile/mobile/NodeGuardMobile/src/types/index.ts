// Common types for NodeGuard Mobile App

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'analyst' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  threatType?: string;
  riskScore?: number;
}

export interface ThreatMetrics {
  totalIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
  averageResponseTime: number;
  riskScore: number;
  systemHealthScore: number;
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  timestamp: string;
  read: boolean;
  incidentId?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  activeThreats: number;
  resolvedThreats: number;
  systemUptime: number;
  lastScanTime: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}