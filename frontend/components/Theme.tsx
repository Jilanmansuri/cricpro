import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const COLORS = {
  dark: {
    background: '#0B0F14',
    surface: '#111827',
    surfaceLighter: '#1F2937',
    primary: '#22C55E',
    secondary: '#38BDF8',
    text: '#F9FAFB',
    textMuted: '#94A3B8',
    border: '#273449',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    cardBg: 'rgba(17, 24, 39, 0.92)',
    accent: 'rgba(34, 197, 94, 0.16)',
  },
  light: {
    background: '#F4F7FB',
    surface: '#FFFFFF',
    surfaceLighter: '#EEF2FF',
    primary: '#16A34A',
    secondary: '#0EA5E9',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    cardBg: 'rgba(255, 255, 255, 0.95)',
    accent: 'rgba(22, 163, 74, 0.12)',
  }
};

type ThemeType = typeof COLORS.dark;

interface ThemeContextProps {
  colors: ThemeType;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(systemScheme === 'dark');

  useEffect(() => {
    setIsDarkMode(systemScheme === 'dark');
  }, [systemScheme]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const colors = isDarkMode ? COLORS.dark : COLORS.light;

  return (
    <ThemeContext.Provider value={{ colors, isDarkMode, toggleTheme }}>
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
