import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
};

/**
 * Escaneo de códigos QR con la cámara (nativo). En web no se usa.
 */
export default function QrScannerModal({ visible, onClose, onScanned }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const doneRef = useRef(false);

  useEffect(() => {
    if (visible) {
      doneRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  if (!visible) return null;

  function handleBarcode({ data }) {
    if (doneRef.current || data == null || String(data).trim() === '') return;
    doneRef.current = true;
    onScanned(String(data).trim());
    onClose();
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {!permission ? (
          <View style={styles.center}>
            <Text style={styles.msg}>Comprobando permisos…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.msg}>
              Activa el permiso de cámara para escanear el código QR del pago.
            </Text>
            <Pressable style={styles.primary} onPress={() => requestPermission()}>
              <Text style={styles.primaryText}>Permitir cámara</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcode}
            />
            <View
              style={[styles.hud, { paddingBottom: Math.max(insets.bottom, 16) }]}
              pointerEvents="box-none"
            >
              <View style={styles.frame} pointerEvents="none" />
              <Text style={styles.hint}>
                Encuadra el QR de pago dentro del recuadro
              </Text>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111',
  },
  msg: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  primary: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { fontWeight: '800', color: COLORS.greenDark, fontSize: 16 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: COLORS.white, fontWeight: '600' },
  hud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  frame: {
    position: 'absolute',
    top: '22%',
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: COLORS.yellow,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  closeBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
