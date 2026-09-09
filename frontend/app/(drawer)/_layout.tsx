import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { useDrawerStore } from '../../store/drawerStore';
import { useAuthStore } from '../../store/authStore';
import Avatar from '../../components/Avatar';

// DRAWER_WIDTH will be calculated dynamically
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function DrawerLayout() {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { isOpen, closeDrawer } = useDrawerStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const DRAWER_WIDTH = SCREEN_WIDTH * 0.75 > 300 ? 300 : SCREEN_WIDTH * 0.75;

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    closeDrawer();
    router.push(path as any);
  };

  const handleLogout = async () => {
    closeDrawer();
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Active screen content slot */}
      <View style={styles.slot}>
        <Slot />
      </View>

      {/* Backdrop */}
      <AnimatedPressable
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents={isOpen ? 'auto' : 'none'}
        onPress={closeDrawer}
      />

      {/* Drawer Panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          {
            width: DRAWER_WIDTH,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Profile header */}
        <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
          <Avatar name={user?.username || 'Player'} size={50} style={styles.avatar} />
          <Text style={[styles.profileName, { color: colors.text }]}>{user?.username}</Text>
          <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
          <View style={[styles.roleTag, { backgroundColor: colors.accent }]}>
            <Text style={[styles.roleText, { color: colors.primary }]}>{user?.role?.toUpperCase() || 'PLAYER'}</Text>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          <TouchableOpacity
            style={[styles.menuItem, (pathname === '/' || pathname === '/(drawer)/(tabs)') && { backgroundColor: colors.surfaceLighter }]}
            onPress={() => handleNavigate('/')}
          >
            <Text style={[styles.menuText, { color: (pathname === '/' || pathname === '/(drawer)/(tabs)') ? colors.primary : colors.text }]}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, pathname.includes('notifications') && { backgroundColor: colors.surfaceLighter }]}
            onPress={() => handleNavigate('/(drawer)/notifications')}
          >
            <Text style={[styles.menuText, { color: pathname.includes('notifications') ? colors.primary : colors.text }]}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, pathname.includes('settings') && { backgroundColor: colors.surfaceLighter }]}
            onPress={() => handleNavigate('/(drawer)/settings')}
          >
            <Text style={[styles.menuText, { color: pathname.includes('settings') ? colors.primary : colors.text }]}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, pathname.includes('privacy') && { backgroundColor: colors.surfaceLighter }]}
            onPress={() => handleNavigate('/(drawer)/privacy')}
          >
            <Text style={[styles.menuText, { color: pathname.includes('privacy') ? colors.primary : colors.text }]}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, pathname.includes('about') && { backgroundColor: colors.surfaceLighter }]}
            onPress={() => handleNavigate('/(drawer)/about')}
          >
            <Text style={[styles.menuText, { color: pathname.includes('about') ? colors.primary : colors.text }]}>About App</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.themeToggleBtn, { backgroundColor: colors.surfaceLighter, borderColor: colors.border }]}
            onPress={toggleTheme}
          >
            <Text style={{ fontSize: 16 }}>{isDarkMode ? '🌙' : '☀️'}</Text>
            <Text style={[styles.themeToggleText, { color: colors.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
            <View style={[styles.themeTogglePill, { backgroundColor: colors.accent }]}>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '800' }}>SWITCH</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 99,
  },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 100,
    borderRightWidth: 1,
    paddingTop: 60,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatar: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: 10,
  },
  roleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuList: {
    padding: 12,
    gap: 4,
    flex: 1,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 36,
    gap: 8,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    gap: 8,
  },
  themeToggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  themeTogglePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
