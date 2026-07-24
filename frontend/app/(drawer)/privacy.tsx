import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../components/Theme';
import Card from '../../components/Card';

export default function PrivacyScreen() {
  const { colors } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
      <Text style={[styles.updated, { color: colors.textMuted }]}>Last Updated: July 2026</Text>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.bodyText, { color: colors.textMuted }]}>
          CricStats Pro collects account information (username, email, password hashes) to authenticate profiles. We also process scorecard images uploaded via Tesseract OCR to calculate match data.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. How We Protect Your Data</Text>
        <Text style={[styles.bodyText, { color: colors.textMuted }]}>
          Your images are securely stored in Cloudinary and credentials are fully encrypted. We enforce JSON Web Token validations for all database access requests.
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Data Deletion</Text>
        <Text style={[styles.bodyText, { color: colors.textMuted }]}>
          You can delete any player profiles, teams, or scorecards at any time. To request complete account erasure, contact us at support@cricstats.pro.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    marginBottom: 20,
  },
  card: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
