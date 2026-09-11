import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../services/api';
import { useTheme } from '../../components/Theme';
import { Button } from '../../components/Button';

export default function OtpVerifyScreen() {
  const params = useLocalSearchParams<{ email: string; maskedEmail?: string; devOtp?: string }>();
  const email = params.email || '';
  const maskedEmail = params.maskedEmail || email;
  const [devOtp, setDevOtp] = useState(params.devOtp || '');

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const { colors } = useTheme();
  const router = useRouter();

  // Resend Countdown Timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleVerify = async () => {
    const trimmed = otp.trim();
    if (trimmed.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMessage('');
    setSuccessNotice('');
    setIsLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp: trimmed,
      });

      if (res.data.success) {
        const resetToken = res.data.data?.resetToken || '';
        router.push({
          pathname: '/(auth)/reset-password',
          params: {
            email,
            otp: trimmed,
            resetToken,
          },
        });
      } else {
        setErrorMessage(res.data.message || 'Verification failed. Please check your code.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
        err.message ||
        'Verification failed. Please try again.';
      setErrorMessage(serverMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage('');
    setSuccessNotice('');

    try {
      const res = await api.post('/auth/send-otp', { email });
      if (res.data.success) {
        setSuccessNotice('A new 6-digit code has been sent.');
        setResendTimer(60);
        if (res.data.data?.otp) {
          setDevOtp(res.data.data.otp);
        }
      } else {
        setErrorMessage(res.data.message || 'Failed to resend code.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to resend verification code.';
      setErrorMessage(serverMsg);
    } finally {
      setIsResending(false);
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
          <Text style={[styles.stepText, { color: colors.primary }]}>STEP 2 OF 3</Text>
        </View>

        <View style={styles.headerContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Text style={styles.iconText}>📩</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Enter Verification Code</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={[styles.emailHighlight, { color: colors.primary }]}>
            {maskedEmail || email || 'your email'}
          </Text>
        </View>

        {/* Development Helper Badge if devOtp is present */}
        {devOtp ? (
          <TouchableOpacity
            onPress={() => {
              setOtp(devOtp);
              if (errorMessage) setErrorMessage('');
            }}
            style={[styles.devBadge, { backgroundColor: '#10b98115', borderColor: '#10b98150' }]}
          >
            <Text style={{ fontSize: 13, color: '#34d399', fontWeight: '700' }}>
              ⚡ Tap to auto-fill code: <Text style={{ fontSize: 15, letterSpacing: 2 }}>{devOtp}</Text>
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Success Notice */}
        {successNotice ? (
          <View style={[styles.noticeBanner, { backgroundColor: '#10b98120', borderColor: '#10b981' }]}>
            <Text style={styles.bannerIcon}>✅</Text>
            <Text style={[styles.bannerText, { color: '#34d399' }]}>{successNotice}</Text>
          </View>
        ) : null}

        {/* Error Banner */}
        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}>
            <Text style={styles.bannerIcon}>⚠️</Text>
            <Text style={[styles.bannerText, { color: '#f87171' }]}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>6-Digit Security Code</Text>
          
          <TextInput
            style={[
              styles.otpInput,
              {
                backgroundColor: colors.surfaceLighter,
                color: colors.text,
                borderColor: errorMessage ? colors.error : colors.border,
              },
            ]}
            placeholder="• • • • • •"
            placeholderTextColor={colors.textMuted}
            value={otp}
            onChangeText={(text) => {
              // Only allow numeric characters, max 6
              const sanitized = text.replace(/[^0-9]/g, '').slice(0, 6);
              setOtp(sanitized);
              if (errorMessage) setErrorMessage('');
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <Button
            title={isLoading ? 'Verifying...' : 'Verify & Continue'}
            onPress={handleVerify}
            isLoading={isLoading}
            disabled={otp.length !== 6}
            style={styles.button}
          />

          {/* Resend Section with Live Countdown Timer */}
          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text style={[styles.timerText, { color: colors.textMuted }]}>
                Resend code in <Text style={{ fontWeight: '700', color: colors.text }}>00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={isResending}
                style={styles.resendButton}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.resendText, { color: colors.primary }]}>
                    Didn't get code? <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>Resend Code</Text>
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Change Email */}
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/forgot-password')}
          style={styles.backContainer}
        >
          <Text style={[styles.backText, { color: colors.textMuted }]}>
            Wrong email address? <Text style={{ color: colors.primary, fontWeight: '700' }}>Change Email</Text>
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
  devBadge: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bannerIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bannerText: {
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  otpInput: {
    height: 60,
    borderWidth: 1.5,
    borderRadius: 14,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 13,
  },
  resendButton: {
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 13,
  },
  backContainer: {
    marginTop: 28,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
  },
});
