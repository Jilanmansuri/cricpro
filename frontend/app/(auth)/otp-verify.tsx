import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../components/Theme';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export default function OtpVerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { colors } = useTheme();
  const router = useRouter();

  const handleVerify = () => {
    if (code.length < 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit code');
      return;
    }

    setIsLoading(true);
    // Standard mock verification of recovery OTP, redirecting to password reset
    setTimeout(() => {
      setIsLoading(false);
      if (code === '1234') { // Sample developer verification code
        router.push({ pathname: '/(auth)/reset-password', params: { email } });
      } else {
        Alert.alert('Invalid Code', 'Please enter "1234" to simulate recovery validation.');
      }
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            We have sent a verification code to your email {email}.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Input
            label="Verification Code"
            placeholder="Enter 4-digit OTP"
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            maxLength={4}
            style={styles.otpInput}
          />

          <Button
            title="Verify Code"
            onPress={handleVerify}
            isLoading={isLoading}
            style={styles.button}
          />
        </View>

        <View style={styles.resendContainer}>
          <Text style={{ color: colors.textMuted }}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Sent', 'A new verification code was sent.')}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Resend</Text>
          </TouchableOpacity>
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
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
  },
  button: {
    width: '100%',
    marginTop: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
});
