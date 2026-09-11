import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { Button } from '../../components/Button';
import api from '../../services/api';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email: string; otp?: string; resetToken?: string }>();
  const email = params.email || '';
  const otp = params.otp || '';
  const resetToken = params.resetToken || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { colors } = useTheme();
  const router = useRouter();

  // Real-time validations
  const isMinLength = password.length >= 6;
  const isMatching = password.length > 0 && password === confirmPassword;
  const isFormValid = isMinLength && isMatching;

  const handleReset = async () => {
    if (!password) {
      setErrorMessage('Please enter a new password.');
      return;
    }
    if (!isMinLength) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-check.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        email,
        newPassword: password,
        otp,
        resetToken,
      });

      if (res.data.success) {
        Alert.alert(
          'Password Reset Successful! 🎉',
          'Your password has been updated securely. You can now sign in with your new credentials.',
          [
            {
              text: 'Sign In Now',
              onPress: () => router.replace('/(auth)/login'),
            },
          ],
          { cancelable: false }
        );
      } else {
        setErrorMessage(res.data.message || 'Failed to update password.');
      }
    } catch (error: any) {
      const serverMsg =
        error.response?.data?.message ||
        (error.response?.data?.errors && error.response.data.errors[0]?.msg) ||
        error.message ||
        'Failed to reset password. Please try again.';
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
          <Text style={[styles.stepText, { color: colors.primary }]}>STEP 3 OF 3</Text>
        </View>

        <View style={styles.headerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.iconText}>🔑</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create New Password</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Set a strong and secure password for
          </Text>
          <Text style={[styles.emailHighlight, { color: colors.primary }]}>
            {email || 'your account'}
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
          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>New Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceLighter,
                  borderColor: errorMessage ? colors.error : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Text style={[styles.eyeText, { color: colors.primary }]}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Confirm New Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceLighter,
                  borderColor: errorMessage ? colors.error : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Re-enter your new password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
              >
                <Text style={[styles.eyeText, { color: colors.primary }]}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Validation Checklist */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {isMinLength ? '✅' : '⚪'}
              </Text>
              <Text
                style={[
                  styles.checkLabel,
                  { color: isMinLength ? '#34d399' : colors.textMuted },
                ]}
              >
                At least 6 characters
              </Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={styles.checkIcon}>
                {isMatching ? '✅' : '⚪'}
              </Text>
              <Text
                style={[
                  styles.checkLabel,
                  { color: isMatching ? '#34d399' : colors.textMuted },
                ]}
              >
                Passwords match
              </Text>
            </View>
          </View>

          <Button
            title={isLoading ? 'Updating Password...' : 'Reset Password'}
            onPress={handleReset}
            isLoading={isLoading}
            disabled={!isFormValid}
            style={styles.button}
          />
        </View>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.backContainer}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>Cancel and Back to Sign In</Text>
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
    marginBottom: 20,
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
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  emailHighlight: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  eyeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  eyeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  checklist: {
    marginBottom: 20,
    marginTop: 4,
    paddingLeft: 4,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  checkIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  button: {
    width: '100%',
  },
  backContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
});
