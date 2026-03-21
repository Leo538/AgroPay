import { Alert, Platform } from 'react-native';

/**
 * En react-native-web, Alert.alert es un no-op. Usamos window.confirm / window.alert.
 */

export function confirmDialog({
  title,
  message,
  cancelText = 'Cancelar',
  confirmText = 'Aceptar',
  destructive = false,
}) {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      const text = message ? `${title}\n\n${message}` : title;
      resolve(
        typeof window !== 'undefined' && window.confirm(text)
      );
      return;
    }
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export function alertMessage(title, message) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
