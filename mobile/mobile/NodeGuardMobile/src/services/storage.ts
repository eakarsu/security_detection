import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  SETTINGS: 'appSettings',
  LAST_SYNC: 'lastSync',
  NOTIFICATIONS_ENABLED: 'notificationsEnabled',
} as const;

// Secure storage for sensitive data
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
    }
  },
};

// Regular storage for non-sensitive data
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

// Auth-specific storage functions
export const authStorage = {
  async saveToken(token: string): Promise<void> {
    await secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async removeToken(): Promise<void> {
    await secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async saveUser(user: User): Promise<void> {
    await storage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  },

  async getUser(): Promise<User | null> {
    try {
      const userData = await storage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  },

  async clearAuthData(): Promise<void> {
    await Promise.all([
      authStorage.removeToken(),
      authStorage.removeUser(),
    ]);
  },
};

// Settings storage
export interface AppSettings {
  notificationsEnabled: boolean;
  biometricsEnabled: boolean;
  darkMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationsEnabled: true,
  biometricsEnabled: false,
  darkMode: true,
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
};

export const settingsStorage = {
  async saveSettings(settings: AppSettings): Promise<void> {
    await storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  async getSettings(): Promise<AppSettings> {
    try {
      const settingsData = await storage.getItem(STORAGE_KEYS.SETTINGS);
      return settingsData ? { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error parsing settings:', error);
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    const currentSettings = await settingsStorage.getSettings();
    const newSettings = { ...currentSettings, ...updates };
    await settingsStorage.saveSettings(newSettings);
  },
};

// Sync tracking
export const syncStorage = {
  async saveLastSync(timestamp: number): Promise<void> {
    await storage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
  },

  async getLastSync(): Promise<number | null> {
    try {
      const timestamp = await storage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error parsing last sync timestamp:', error);
      return null;
    }
  },
};