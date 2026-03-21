import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

/**
 * Abre la galería y devuelve una data URL (data:image/...;base64,...) o null.
 */
export async function pickImageDataUrl() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permiso',
      'Necesitamos acceso a la galería para elegir una imagen.'
    );
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.55,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const mime = a.mimeType || 'image/jpeg';
  if (typeof a.uri === 'string' && a.uri.startsWith('data:')) {
    return a.uri;
  }
  if (a.base64) {
    return `data:${mime};base64,${a.base64}`;
  }
  if (a.uri) {
    try {
      const b64 = await FileSystem.readAsStringAsync(a.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mime};base64,${b64}`;
    } catch {
      Alert.alert('Imagen', 'No se pudo leer la foto. Prueba con otra.');
      return null;
    }
  }
  return null;
}

/**
 * Abre la cámara para una foto (comprobante o QR como imagen).
 */
export async function takePhotoDataUrl() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      'Permiso',
      'Necesitamos la cámara para tomar la foto del comprobante o del QR.'
    );
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: false,
    quality: 0.55,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const mime = a.mimeType || 'image/jpeg';
  if (typeof a.uri === 'string' && a.uri.startsWith('data:')) {
    return a.uri;
  }
  if (a.base64) {
    return `data:${mime};base64,${a.base64}`;
  }
  if (a.uri) {
    try {
      const b64 = await FileSystem.readAsStringAsync(a.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mime};base64,${b64}`;
    } catch {
      Alert.alert('Imagen', 'No se pudo guardar la foto. Prueba de nuevo.');
      return null;
    }
  }
  return null;
}
