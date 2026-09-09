import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../components/Theme';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import Card from '../../components/Card';
import Avatar from '../../components/Avatar';

export default function SettingsScreen() {
  const { colors, isDarkMode, setTheme, toggleTheme } = useTheme();
  const { notificationsEnabled, toggleNotifications } = useSettingsStore();
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
          <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.role, { color: colors.primary }]}>{user?.role?.toUpperCase() || 'PLAYER'}</Text>
          </View>
        </View>
      </Card>

      {/* Appearance / Theme Selector */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Theme & Appearance</Text>
      <View style={styles.themeSelectorRow}>
        {/* Light Mode Card */}
        <TouchableOpacity
          style={[
            styles.themeCard,
            {
              backgroundColor: '#FFFFFF',
              borderColor: !isDarkMode ? colors.primary : colors.border,
              borderWidth: !isDarkMode ? 2.5 : 1,
            },
          ]}
          onPress={() => setTheme(false)}
          activeOpacity={0.8}
        >
          <View style={styles.themeCardHeader}>
            <Text style={{ fontSize: 24 }}>☀️</Text>
            {!isDarkMode && (
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
              </View>
            )}
          </View>
          <Text style={[styles.themeCardTitle, { color: '#0F172A' }]}>Light Mode</Text>
          <Text style={[styles.themeCardSubtitle, { color: '#64748B' }]}>Crisp & bright</Text>
        </TouchableOpacity>

        {/* Dark Mode Card */}
        <TouchableOpacity
          style={[
            styles.themeCard,
            {
              backgroundColor: '#131B2A',
              borderColor: isDarkMode ? colors.primary : colors.border,
              borderWidth: isDarkMode ? 2.5 : 1,
            },
          ]}
          onPress={() => setTheme(true)}
          activeOpacity={0.8}
        >
          <View style={styles.themeCardHeader}>
            <Text style={{ fontSize: 24 }}>🌙</Text>
            {isDarkMode && (
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text>
              </View>
            )}
          </View>
          <Text style={[styles.themeCardTitle, { color: '#F8FAFC' }]}>Dark Mode</Text>
          <Text style={[styles.themeCardSubtitle, { color: '#94A3B8' }]}>Deep obsidian</Text>
        </TouchableOpacity>
      </View>

      {/* Preferences Section */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>General Preferences</Text>
      <Card style={styles.settingsGroup}>
        <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
          <View style={styles.settingLabelGroup}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>
              {isDarkMode ? 'Active theme: Dark' : 'Active theme: Light'}
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#ffffff'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingLabelGroup}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Push Notifications</Text>
            <Text style={[styles.settingSub, { color: colors.textMuted }]}>Match alerts & updates</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#ffffff'}
          />
        </View>
      </Card>

      {/* Account actions */}
      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: colors.error, backgroundColor: colors.surface }]}
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
    marginBottom: 20,
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
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  role: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  themeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  themeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  themeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  themeCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsGroup: {
    padding: 0,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLabelGroup: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
