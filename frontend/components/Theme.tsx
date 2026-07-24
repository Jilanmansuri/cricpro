import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

export const COLORS = {
  dark: {
    background: '#0F0F11',
    surface: '#1A1A1E',
    surfaceLighter: '#25252B',
    primary: '#00FF66', // Neon Sporty Green
    secondary: '#00E5FF', // Cyan Accent
    text: '#FFFFFF',
    textMuted: '#9CA3AF',
    border: '#2E2E35',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    cardBg: 'rgba(26, 26, 30, 0.8)',
  },
  light: {
    background: '#F9FAFB',
    surface: '#FFFFFF',
    surfaceLighter: '#F3F4F6',
    primary: '#00C853', // Deep Sporty Green
    secondary: '#00B8D4', // Cyan Accent
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    cardBg: 'rgba(255, 255, 255, 0.9)',
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
