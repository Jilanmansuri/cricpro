import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  isDarkMode: boolean;
  isOnboardingCompleted: boolean;
  isSettingsLoaded: boolean;
  notificationsEnabled: boolean;
  toggleTheme: () => void;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  toggleNotifications: () => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  isDarkMode: true,
  isOnboardingCompleted: false,
  isSettingsLoaded: false,
  notificationsEnabled: true,

  toggleTheme: async () => {
    set((state) => {
      const nextTheme = !state.isDarkMode;
      AsyncStorage.setItem('isDarkMode', String(nextTheme)).catch(() => {});
      return { isDarkMode: nextTheme };
    });
  },

  setOnboardingCompleted: async (completed) => {
    await AsyncStorage.setItem('isOnboardingCompleted', String(completed)).catch(() => {});
    set({ isOnboardingCompleted: completed, isSettingsLoaded: true });
  },

  toggleNotifications: async () => {
    set((state) => {
      const nextNotif = !state.notificationsEnabled;
      AsyncStorage.setItem('notificationsEnabled', String(nextNotif)).catch(() => {});
      return { notificationsEnabled: nextNotif };
    });
  },

  loadSettings: async () => {
    try {
      const mode = await AsyncStorage.getItem('isDarkMode');
      const onboard = await AsyncStorage.getItem('isOnboardingCompleted');
      const notif = await AsyncStorage.getItem('notificationsEnabled');

      set({
        isDarkMode: mode === null ? true : mode === 'true',
        isOnboardingCompleted: onboard === 'true',
        isSettingsLoaded: true,
        notificationsEnabled: notif === null ? true : notif === 'true',
      });
    } catch (error) {
      console.error('Failed to load settings from storage:', error);
      set({ isSettingsLoaded: true });
    }
  },
}));
export default useSettingsStore;
