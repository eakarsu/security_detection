import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';
import { ApiResponse, User, SecurityIncident, ThreatMetrics, DashboardStats } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Clear stored auth data on unauthorized
          await AsyncStorage.multiRemove(['authToken', 'user']);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication endpoints
  async login(username: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ user: User; token: string }>> = 
        await this.api.post('/auth/login', { username, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response: AxiosResponse<ApiResponse<null>> = 
        await this.api.post('/auth/logout');
      await AsyncStorage.multiRemove(['authToken', 'user']);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Logout failed');
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    try {
      const response: AxiosResponse<ApiResponse<{ token: string }>> = 
        await this.api.post('/auth/refresh');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Token refresh failed');
    }
  }

  // Security incidents endpoints
  async getIncidents(): Promise<ApiResponse<SecurityIncident[]>> {
    try {
      const response: AxiosResponse<ApiResponse<SecurityIncident[]>> = 
        await this.api.get('/security/incidents');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch incidents');
    }
  }

  async getIncident(id: string): Promise<ApiResponse<SecurityIncident>> {
    try {
      const response: AxiosResponse<ApiResponse<SecurityIncident>> = 
        await this.api.get(`/security/incidents/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch incident');
    }
  }

  async updateIncidentStatus(id: string, status: string): Promise<ApiResponse<SecurityIncident>> {
    try {
      const response: AxiosResponse<ApiResponse<SecurityIncident>> = 
        await this.api.put(`/security/incidents/${id}`, { status });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update incident');
    }
  }

  // Dashboard and metrics endpoints
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const response: AxiosResponse<ApiResponse<DashboardStats>> = 
        await this.api.get('/dashboard/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard stats');
    }
  }

  async getThreatMetrics(): Promise<ApiResponse<ThreatMetrics>> {
    try {
      const response: AxiosResponse<ApiResponse<ThreatMetrics>> = 
        await this.api.get('/security/metrics');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch threat metrics');
    }
  }

  // User profile endpoints
  async getUserProfile(): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = 
        await this.api.get('/auth/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
    }
  }

  async updateUserProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response: AxiosResponse<ApiResponse<User>> = 
        await this.api.put('/auth/profile', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }
}

export const apiService = new ApiService();
export default apiService;