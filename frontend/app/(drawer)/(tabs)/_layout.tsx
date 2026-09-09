import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../components/Theme';
import { useDrawerStore } from '../../../store/drawerStore';
import { TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const HomeIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" fill={color} />
  </Svg>
);

const PlayersIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={color} />
  </Svg>
);

const UploadIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" fill={color} />
  </Svg>
);

const TeamsIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 8 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill={color} />
  </Svg>
);

const TournamentIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.81V18h-3v2h16v-2h-3v-3.19c2.28-.33 4-2.37 4-4.81V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3z" fill={color} />
  </Svg>
);

const StatsIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M16 11V3H8v6H2v12h20V11h-6zm-6-6h4v14h-4V5zm-6 6h4v8H4v-8zm16 8h-4v-6h4v6z" fill={color} />
  </Svg>
);

const HamburgerIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <Path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill={color} />
  </Svg>
);

export default function TabsLayout() {
  const { colors, isDarkMode } = useTheme();
  const openDrawer = useDrawerStore((state) => state.openDrawer);
  const insets = useSafeAreaInsets();

  const renderHeaderLeft = () => (
    <TouchableOpacity onPress={openDrawer} style={{ marginLeft: 18 }}>
      <HamburgerIcon color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerLeft: renderHeaderLeft,
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 17,
          fontWeight: '700',
        },
        headerTitleAlign: 'center',
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 16),
          left: 16,
          right: 16,
          height: 64,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 32,
          elevation: isDarkMode ? 10 : 4,
          shadowColor: isDarkMode ? '#000000' : '#64748B',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDarkMode ? 0.35 : 0.10,
          shadowRadius: 10,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: Platform.OS === 'ios' ? 12 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="players"
        options={{
          title: 'Players Search',
          tabBarLabel: 'Players',
          tabBarIcon: ({ color }) => <PlayersIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: 'Scan Scorecard',
          tabBarLabel: 'Upload',
          tabBarIcon: ({ color }) => <UploadIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Teams Standings',
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color }) => <TeamsIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: 'Tournaments',
          tabBarLabel: 'Tourneys',
          tabBarIcon: ({ color }) => <TournamentIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color }) => <StatsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
