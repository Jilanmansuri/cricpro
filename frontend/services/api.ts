import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

/**
 * Dynamic Backend URL Resolution:
 * 1. EXPO_PUBLIC_API_URL: If defined in frontend/.env, use it directly.
 * 2. In Native Mobile (Expo Go / physical phone):
 *    Extract development machine IP dynamically from Constants.expoConfig?.hostUri
 *    (e.g., "192.168.1.78:8081" -> "http://192.168.1.78:5000/api")
 * 3. Fallback to current local development IP: "http://192.168.1.78:5000/api"
 * 4. Web browser fallback: "http://localhost:5000/api"
 */
const resolveApiBaseUrl = (): string => {
  // 1. Check for environment variable in .env
  if (process.env.EXPO_PUBLIC_API_URL && process.env.EXPO_PUBLIC_API_URL.trim() !== '') {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }

  // 2. Web browser
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // 3. Dynamic mobile IP detection from Expo host
  const hostUri = Constants.expoConfig?.hostUri || 
    (Constants as any).manifest?.debuggerHost || 
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;
  
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:5000/api`;
    }
  }

  // 4. Default fallback to current development PC IP
  return 'http://192.168.1.78:5000/api';
};

export const API_BASE_URL = resolveApiBaseUrl();
console.log(`[CricPro API] Connecting to backend at: ${API_BASE_URL}`);
export const getToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('accessToken');
    }
    return await SecureStore.getItemAsync('accessToken');
  } catch (err) {
    console.error('Failed to get access token:', err);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('accessToken', token);
    } else {
      await SecureStore.setItemAsync('accessToken', token);
    }
  } catch (err) {
    console.error('Failed to save access token:', err);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('accessToken');
    } else {
      await SecureStore.deleteItemAsync('accessToken');
    }
  } catch (err) {
    console.error('Failed to clear access token:', err);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('refreshToken');
    }
    return await SecureStore.getItemAsync('refreshToken');
  } catch (err) {
    console.error('Failed to get refresh token:', err);
    return null;
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('refreshToken', token);
    } else {
      await SecureStore.setItemAsync('refreshToken', token);
    }
  } catch (err) {
    console.error('Failed to save refresh token:', err);
  }
};

export const removeRefreshToken = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('refreshToken');
    } else {
      await SecureStore.deleteItemAsync('refreshToken');
    }
  } catch (err) {
    console.error('Failed to clear refresh token:', err);
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh automatically
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRoute = originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register');

    // Check if error status is 401, request hasn't been retried, and it's not login/register
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshTkn = await getRefreshToken();
        if (!refreshTkn) {
          throw new Error('No refresh token available');
        }

        // Call the refresh token endpoint directly (not using the interceptor instance to avoid loops)
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          token: refreshTkn,
        });

        if (refreshResponse.data.success) {
          const { accessToken: newAccess, refreshToken: newRefresh } = refreshResponse.data.data;
          
          await setToken(newAccess);
          await setRefreshToken(newRefresh);

          processQueue(null, newAccess);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } else {
          throw new Error('Refresh token invalid');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // Clear tokens and force logout
        await removeToken();
        await removeRefreshToken();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
