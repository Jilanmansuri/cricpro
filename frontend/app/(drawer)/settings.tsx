import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../components/Theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { isDarkMode, toggleTheme, notificationsEnabled, toggleNotifications } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Section */}
      <Card style={styles.profileCard}>
        <Avatar name={user?.username || 'Player'} size={60} style={styles.avatar} />
        <View style={styles.profileDetails}>
          <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'Guest'}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || 'Not logged in'}</Text>
          <Text style={[styles.role, { color: colors.primary }]}>{user?.role?.toUpperCase() || 'PLAYER'}</Text>
        </View>
      </Card>

      {/* Preferences Section */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
      <Card style={styles.settingsGroup}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </Card>

      {/* Account actions */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.error }]}
        onPress={handleLogout}
      >
        <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
  },
  avatar: {
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
  email: {
    fontSize: 13,
    marginTop: 2,
  },
  role: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsGroup: {
    padding: 0,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    borderWidth: 1.5,
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
