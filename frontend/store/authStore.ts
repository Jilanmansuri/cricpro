import { create } from 'zustand';
import api, {
  setToken,
  setRefreshToken,
  removeToken,
  removeRefreshToken,
  getToken,
  getRefreshToken,
  setStoredUser,
  getStoredUser,
  removeStoredUser,
} from '../services/api';

interface UserProfile {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'player';
  profilePic?: string;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const storedAccess = await getToken();
      const storedRefresh = await getRefreshToken();
      const storedUser = await getStoredUser();

      if (storedAccess && storedRefresh) {
        // Immediately restore active session so the user never has to re-login!
        set({
          user: storedUser || null,
          accessToken: storedAccess,
          refreshToken: storedRefresh,
          isAuthenticated: true,
          isLoading: false,
        });

        // Non-blocking background verification / refresh of profile
        api.get('/auth/profile').then(async (res) => {
          if (res.data.success) {
            set({ user: res.data.data });
            await setStoredUser(res.data.data);
          }
        }).catch(async (err: any) => {
          // CRITICAL: Only log out if server explicitly returns 401 Unauthorized.
          // Never log out on network errors, timeouts, or cold starts!
          if (err.response?.status === 401) {
            await removeToken();
            await removeRefreshToken();
            await removeStoredUser();
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          }
        });
        return;
      }
    } catch (e) {
      console.warn('Restore session warning:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { accessToken, refreshToken, ...profile } = res.data.data;
        await setToken(accessToken);
        await setRefreshToken(refreshToken);
        await setStoredUser(profile);

        set({
          user: profile,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      } else {
        throw new Error(res.data.message || 'Login failed');
      }
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        throw new Error('Cannot connect to server. Please check your internet or wait for cloud server to wake up.');
      }
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        throw new Error('Connection timed out. Cloud server is waking up, please try again in a few seconds.');
      }
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        'Login failed';
      throw new Error(serverMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { username, email, password });
      if (res.data.success) {
        const { accessToken, refreshToken, ...profile } = res.data.data;
        await setToken(accessToken);
        await setRefreshToken(refreshToken);
        await setStoredUser(profile);

        set({
          user: profile,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      } else {
        throw new Error(res.data.message || 'Registration failed');
      }
    } catch (err: any) {
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        throw new Error('Cannot connect to server. Please check your internet or wait for cloud server to wake up.');
      }
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        'Registration failed';
      throw new Error(serverMsg);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshTkn = await getRefreshToken();
      if (refreshTkn) {
        await api.post('/auth/logout', { token: refreshTkn }).catch(() => {});
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      await removeToken();
      await removeRefreshToken();
      await removeStoredUser();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
