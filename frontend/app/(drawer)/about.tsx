import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../components/Theme';
import Card from '../../components/Card';
import Svg, { Rect, Path } from 'react-native-svg';

const LogoIcon = ({ color }: { color: string }) => (
  <Svg width="50" height="50" viewBox="0 0 24 24" fill="none">
    <Path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill={color} />
  </Svg>
);

export default function AboutScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        <LogoIcon color={colors.primary} />
        <Text style={[styles.appName, { color: colors.text }]}>CricStats Pro</Text>
        <Text style={[styles.version, { color: colors.textMuted }]}>Version 2.0.0 (Clean Architecture)</Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>About CricStats Pro</Text>
        <Text style={[styles.bodyText, { color: colors.textMuted }]}>
          CricStats Pro is a state-of-the-art sports data calculator and team metrics platform. We specialize in automated match scorecard parsing using client-side image processing and remote optical character engines.
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          © 2026 CricStats Pro Team. All rights reserved. Built with Expo, React Native, and TypeScript.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
  version: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
