import React, { createContext, useContext, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export const COLORS = {
  dark: {
    background: '#0B0F17',
    surface: '#131B2A',
    surfaceLighter: '#1E293B',
    primary: '#10B981',       // Electric Emerald
    primaryHover: '#059669',
    secondary: '#38BDF8',     // Sky 400
    text: '#F8FAFC',          // Slate 50
    textMuted: '#94A3B8',     // Slate 400
    border: '#1E293B',        // Slate 800
    borderLight: '#334155',   // Slate 700
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    cardBg: '#131B2A',
    accent: 'rgba(16, 185, 129, 0.14)',
    accentSecondary: 'rgba(56, 189, 248, 0.14)',
    gold: '#FBBF24',
    shadow: '#000000',
  },
  light: {
    background: '#F8FAFC',    // Porcelain Slate 50
    surface: '#FFFFFF',       // Pure White
    surfaceLighter: '#F1F5F9',// Soft Slate 100
    primary: '#059669',       // Deep Energetic Emerald 600
    primaryHover: '#047857',
    secondary: '#0284C7',     // Azure Sky 600
    text: '#0F172A',          // Deep Slate 900
    textMuted: '#64748B',     // Crisp Slate 500
    border: '#E2E8F0',        // Clean Slate 200
    borderLight: '#CBD5E1',   // Slate 300
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    cardBg: '#FFFFFF',
    accent: 'rgba(5, 150, 105, 0.10)',
    accentSecondary: 'rgba(2, 132, 199, 0.10)',
    gold: '#D97706',
    shadow: '#64748B',
  }
};

type ThemeType = typeof COLORS.dark;

interface ThemeContextProps {
  colors: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const loadSettings = useSettingsStore((state) => state.loadSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const setTheme = (isDark: boolean) => {
    if (isDark !== isDarkMode) {
      toggleTheme();
    }
  };

  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  return (
    <ThemeContext.Provider value={{ colors, isDarkMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

