import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../components/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { colors } = useTheme();
  const router = useRouter();

  const handleSendOtp = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your registered email address or username.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/send-otp', { email: trimmed });

      if (res.data.success) {
        const payload = res.data.data;
        router.push({
          pathname: '/(auth)/otp-verify',
          params: {
            email: payload.email || trimmed,
            maskedEmail: payload.maskedEmail || trimmed,
            devOtp: payload.otp || '',
          },
        });
      } else {
        setErrorMessage(res.data.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        err.message ||
        'Unable to connect to server. Please check your network and try again.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Step Indicator */}
        <View style={styles.stepBadge}>
          <Text style={[styles.stepText, { color: colors.primary }]}>STEP 1 OF 3</Text>
        </View>

        <View style={styles.headerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.iconText}>🔐</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            No worries! Enter your registered email address or username and we'll send you a 6-digit verification code.
          </Text>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: '#f87171' }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Registered Email or Username"
            placeholder="e.g. virat@example.com or virat18"
            value={identifier}
            onChangeText={(text) => {
              setIdentifier(text);
              if (errorMessage) setErrorMessage('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button
            title={isLoading ? 'Sending Code...' : 'Send Verification Code'}
            onPress={handleSendOtp}
            isLoading={isLoading}
            style={styles.button}
          />

          <View style={styles.infoBox}>
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              💡 A 6-digit code will be generated to verify your identity before setting a new password.
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backContainer}>
          <Text style={[styles.backText, { color: colors.textMuted }]}>
            Remember your password? <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
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
  stepBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#3b82f615',
    marginBottom: 16,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  infoBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  backContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
  },
});
