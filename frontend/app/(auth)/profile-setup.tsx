import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import api from '../../services/api';

export default function ProfileSetupScreen() {
  const { user, restoreSession } = useAuthStore();
  const [profilePic, setProfilePic] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Endpoint to save extra profile information
      const res = await api.put('/auth/profile', {
        profilePic,
        phone,
      });

      if (res.data.success) {
        await restoreSession(); // Refresh profile state globally
        Alert.alert('Success', 'Profile setup complete!', [
          { text: 'Start App', onPress: () => router.replace('/(drawer)/(tabs)') }
        ]);
      } else {
        throw new Error(res.data.message || 'Setup failed');
      }
    } catch (error: any) {
      Alert.alert('Setup Error', error.response?.data?.message || error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Profile Setup</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Welcome, {user?.username || 'Player'}! Let's finish setting up your profile.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Profile Image URL"
            placeholder="https://example.com/avatar.jpg"
            value={profilePic}
            onChangeText={setProfilePic}
            autoCapitalize="none"
          />

          <Input
            label="Phone Number"
            placeholder="+1 555-555-5555"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Button
            title="Complete Setup"
            onPress={handleSave}
            isLoading={isLoading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
});
