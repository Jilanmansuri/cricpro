import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from './Theme';
import { AppErrorInfo } from '../utils/errorHelper';

interface ErrorAlertModalProps {
  visible: boolean;
  error: AppErrorInfo | null;
  onClose: () => void;
}

export const ErrorAlertModal: React.FC<ErrorAlertModalProps> = ({
  visible,
  error,
  onClose,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const handleCopy = () => {
    const fullText = [
      `Error: ${error.title}`,
      `Message: ${error.message}`,
      error.status ? `Status: ${error.status}` : null,
      error.endpoint ? `Endpoint: ${error.endpoint}` : null,
      error.technicalDetails ? `Details: ${error.technicalDetails}` : null,
      error.suggestedFix ? `Fix: ${error.suggestedFix}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      // In native, we still flag copied feedback for the user
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.error,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={[styles.header, { backgroundColor: colors.error + '22' }]}>
            <Text style={styles.headerIcon}>⚠️</Text>
            <View style={styles.headerTextWrap}>
              <Text style={[styles.headerTitle, { color: colors.error }]}>
                {error.title}
              </Text>
              {error.status ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.statusText}>HTTP {error.status}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Body Content */}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Primary Error Message */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Exact Error Message:
              </Text>
              <View
                style={[
                  styles.messageBox,
                  {
                    backgroundColor: isDarkMode ? '#1E1E2E' : '#FEE2E2',
                    borderColor: colors.error + '44',
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: colors.text }]}>
                  {error.message}
                </Text>
              </View>
            </View>

            {/* Suggested Solution / Guidance */}
            {error.suggestedFix ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  Suggested Fix:
                </Text>
                <View
                  style={[
                    styles.fixBox,
                    {
                      backgroundColor: isDarkMode ? '#1E293B' : '#FEF3C7',
                      borderColor: '#F59E0B66',
                    },
                  ]}
                >
                  <Text style={styles.fixIcon}>💡</Text>
                  <Text style={[styles.fixText, { color: colors.text }]}>
                    {error.suggestedFix}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Technical Details (Endpoint, Method, Status) */}
            {error.technicalDetails ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  Technical Diagnostic:
                </Text>
                <View
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.codeText,
                      { color: isDarkMode ? '#38BDF8' : '#0284C7' },
                    ]}
                  >
                    {error.technicalDetails}
                  </Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Action Buttons */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surfaceLighter,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopy}
              style={[
                styles.copyButton,
                { borderColor: colors.borderLight, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.copyButtonText, { color: colors.text }]}>
                {copied ? '✓ Copied!' : '📋 Copy Details'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onClose}
              style={[styles.dismissButton, { backgroundColor: colors.error }]}
            >
              <Text style={styles.dismissButtonText}>Dismiss / Theek Hai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  headerIcon: {
    fontSize: 26,
  },
  headerTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    flexGrow: 0,
    maxHeight: 380,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  fixBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 10,
  },
  fixIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  fixText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  codeBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  copyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ErrorAlertModal;
