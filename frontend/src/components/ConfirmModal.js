import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
  error: '#C62828',
};

export default function ConfirmModal({
  visible,
  title,
  message,
  cancelText = 'Cancelar',
  confirmText = 'Aceptar',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelText}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                destructive ? styles.destructiveBtn : styles.confirmBtn,
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text
                style={[
                  styles.confirmText,
                  destructive && styles.destructiveText,
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 24,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.grayLight,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  confirmBtn: {
    backgroundColor: COLORS.yellow,
  },
  destructiveBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  destructiveText: {
    color: COLORS.error,
  },
});
