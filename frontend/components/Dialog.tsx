import React from 'react';
import { Modal, StyleSheet, Text, View, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from './Theme';
import Button from './Button';
import Card from './Card';

interface DialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.backdropTapArea} />
        </TouchableWithoutFeedback>

        <Card style={styles.dialogCard}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
          
          <View style={styles.btnRow}>
            <Button
              title={cancelLabel}
              onPress={onCancel}
              variant="secondary"
              style={styles.btn}
              textStyle={{ fontSize: 14 }}
            />
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant="primary"
              style={styles.btn}
              textStyle={{ fontSize: 14 }}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdropTapArea: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 44,
  },
});
export default Dialog;
