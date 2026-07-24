import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

export const API_BASE_URL = 'https://cricpro-t7la.onrender.com/api';
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
