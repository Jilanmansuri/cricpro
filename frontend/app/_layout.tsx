import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { ThemeProvider, useTheme } from '../components/Theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { prewarmBackend } from '../services/api';

const NavigationLayout = () => {
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const { isOnboardingCompleted, isSettingsLoaded, loadSettings } = useSettingsStore();
  const { colors } = useTheme();
  const segments = useSegments() as string[];
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // Load user settings, sessions on mount and proactively pre-warm Render cloud backend
  useEffect(() => {
    loadSettings();
    restoreSession();
    // Non-blocking Render cloud wake-up ping
    prewarmBackend();

    // Keep backend warm every 4 minutes while app is active
    const keepAliveTimer = setInterval(() => {
      prewarmBackend();
    }, 4 * 60 * 1000);

    return () => clearInterval(keepAliveTimer);
  }, []);

  useEffect(() => {
    // Wait until root navigation state is mounted AND both settings & session are fully loaded
    if (!rootNavigationState?.key || isLoading || !isSettingsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDrawerGroup = segments[0] === '(drawer)';

    if (!isAuthenticated) {
      if (!isOnboardingCompleted && segments[1] !== 'onboarding') {
        router.replace('/(auth)/onboarding');
      } else if (isOnboardingCompleted && !inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Authenticated user: navigate to main drawer/tabs if currently in auth screen
      if (inAuthGroup) {
        router.replace('/(drawer)/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, isSettingsLoaded, isOnboardingCompleted, segments, rootNavigationState?.key]);

  const isAuthGroup = segments[0] === '(auth)';
  const showLoadingOverlay = isLoading || !isSettingsLoaded;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />

        <Stack.Screen name="player-career" options={{ headerShown: true, title: 'Player Profile', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <Stack.Screen name="team-profile" options={{ headerShown: true, title: 'Team Profile', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <Stack.Screen name="tournament-details" options={{ headerShown: true, title: 'Tournament Details', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <Stack.Screen name="match-details" options={{ headerShown: true, title: 'Match Details', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
      </Stack>
      
      {showLoadingOverlay && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationLayout />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
