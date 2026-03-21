import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QrScannerModal from '../components/QrScannerModal';
import * as orderApi from '../services/orderService';
import { alertMessage } from '../utils/confirmDialog';
import { pickImageDataUrl, takePhotoDataUrl } from '../utils/pickImageDataUrl';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
};

const METODO_LABEL = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  otro: 'Otro',
};

function labelUnidad(key) {
  const m = {
    kg: 'Kilogramo (kg)',
    lb: 'Libra',
    unidad: 'Por unidad',
    docena: 'Docena',
    litro: 'Litro',
    arroba: 'Arroba',
    atado: 'Atado / manojo',
    otro: 'Otro',
  };
  return m[key] || key;
}

export default function CheckoutOrderScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewQr, setPreviewQr] = useState('');
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await orderApi.fetchOrder(String(orderId));
      setOrder(data.order);
    } catch (e) {
      setOrder(null);
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo cargar el pedido.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function abrirEscanerQr() {
    if (Platform.OS === 'web') {
      alertMessage(
        'Navegador',
        'El escáner de QR funciona mejor en el celular con Expo Go. Aquí puedes usar «Subir imagen 🧾» con una captura del QR o del comprobante.'
      );
      return;
    }
    setQrScannerVisible(true);
  }

  async function elegirDeGaleria() {
    const dataUrl = await pickImageDataUrl();
    if (dataUrl) setPreviewUrl(dataUrl);
  }

  async function tomarFotoCamara() {
    const dataUrl = await takePhotoDataUrl();
    if (dataUrl) setPreviewUrl(dataUrl);
  }

  async function enviarComprobante() {
    if (!order) return;
    const urlOk = previewUrl.trim().length > 0;
    const qrOk = previewQr.trim().length > 0;
    if (!urlOk && !qrOk) {
      Alert.alert(
        'Comprobante',
        'Escanea un QR 📷, sube una imagen 🧾 o toma una foto del comprobante.'
      );
      return;
    }
    setSending(true);
    try {
      const data = await orderApi.uploadOrderComprobante(String(order._id), {
        comprobanteUrl: previewUrl.trim(),
        comprobanteQrPayload: previewQr.trim(),
      });
      setOrder(data.order);
      setPreviewUrl('');
      setPreviewQr('');
      Alert.alert(
        'Listo',
        'Comprobante enviado. El vendedor podrá verificar tu pago.'
      );
    } catch (e) {
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo subir.'
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.greenDark} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Pedido no encontrado.</Text>
          <Pressable
            style={styles.linkBtn}
            onPress={() => navigation.navigate('Mercado')}
          >
            <Text style={styles.linkBtnText}>Ir al mercado</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const item = order.items?.[0];
  const farmer = order.farmer;
  const vendedor = farmer
    ? `${farmer.nombre || ''} ${farmer.apellido || ''}`.trim()
    : 'Vendedor';
  const pendiente = order.estado === 'pendiente_comprobante';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.screenTitle}>Pago del pedido 💳</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Producto</Text>
          <Text style={styles.cardStrong}>{item?.nombre || '—'}</Text>
          <Text style={styles.cardMeta}>
            {item?.cantidad ?? 0} × {labelUnidad(item?.unidad)} · $
            {Number(item?.precioUnitario ?? 0).toFixed(2)} c/u
          </Text>
          <View style={styles.divider} />
          <Text style={styles.cardLabel}>Total a pagar</Text>
          <Text style={styles.total}>${Number(order.total).toFixed(2)}</Text>
          <Text style={styles.cardLabel}>Vendedor</Text>
          <Text style={styles.cardStrong}>{vendedor}</Text>
          {farmer?.telefono ? (
            <Text style={styles.cardMeta}>Celular: {farmer.telefono}</Text>
          ) : null}
          {order.metodoPago ? (
            <Text style={styles.cardMeta}>
              Método indicado:{' '}
              {METODO_LABEL[order.metodoPago] || order.metodoPago}
            </Text>
          ) : null}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Tu compra en pasos</Text>
          <Text style={styles.infoText}>
            1 · Ingresa a la app{'\n'}
            2 · Ve la lista de productos 🌽{'\n'}
            3 · Selecciona un producto{'\n'}
            4 · Crea el pedido{'\n'}
            5 · Realiza el pago 💳{'\n'}
            6 · Abajo envía comprobante: escanea QR 📷, sube imagen 🧾 o toma foto
          </Text>
        </View>

        {pendiente ? (
          <>
            <Text style={styles.sectionTitle}>6 · Enviar comprobante</Text>
            <Text style={styles.sectionSub}>
              Necesitas al menos una opción: QR leído, imagen desde galería o foto
              con la cámara.
            </Text>

            <Pressable style={styles.actionQr} onPress={abrirEscanerQr}>
              <Text style={styles.actionQrText}>Escanear código QR 📷</Text>
              <Text style={styles.hintOnDark}>
                Lee el QR de pago (Yape, transferencia, etc.)
              </Text>
            </Pressable>

            <Pressable style={styles.actionGallery} onPress={elegirDeGaleria}>
              <Text style={styles.actionGalleryText}>Subir imagen 🧾</Text>
              <Text style={styles.hintOnYellow}>
                Captura de pantalla, voucher o foto guardada
              </Text>
            </Pressable>

            <Pressable style={styles.actionCamera} onPress={tomarFotoCamara}>
              <Text style={styles.actionCameraText}>Tomar foto con la cámara</Text>
              <Text style={styles.hintOnWhite}>
                Fotografía el comprobante o el QR en otra pantalla
              </Text>
            </Pressable>

            {previewQr ? (
              <View style={styles.qrBox}>
                <View style={styles.qrBoxHeader}>
                  <Text style={styles.qrBoxTitle}>QR escaneado</Text>
                  <Pressable onPress={() => setPreviewQr('')}>
                    <Text style={styles.qrBoxClear}>Quitar</Text>
                  </Pressable>
                </View>
                <ScrollView style={styles.qrScroll} nestedScrollEnabled>
                  <Text selectable style={styles.qrText}>
                    {previewQr}
                  </Text>
                </ScrollView>
              </View>
            ) : null}

            {previewUrl ? (
              <View style={styles.imgPreviewWrap}>
                <Image source={{ uri: previewUrl }} style={styles.preview} />
                <Pressable
                  style={styles.quitarImg}
                  onPress={() => setPreviewUrl('')}
                >
                  <Text style={styles.quitarImgText}>Quitar imagen</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>
                  Sin imagen aún · usa galería o cámara
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={enviarComprobante}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color={COLORS.greenDark} />
              ) : (
                <Text style={styles.sendBtnText}>Enviar comprobante</Text>
              )}
            </Pressable>

            <QrScannerModal
              visible={qrScannerVisible}
              onClose={() => setQrScannerVisible(false)}
              onScanned={(data) => setPreviewQr(data)}
            />
          </>
        ) : (
          <View style={styles.doneBox}>
            <Text style={styles.doneTitle}>✓ Comprobante enviado</Text>
            <Text style={styles.doneText}>
              Tu pago quedó registrado para revisión. Puedes seguir comprando en
              el mercado.
            </Text>
            {order.comprobanteUrl ? (
              <Image
                source={{ uri: order.comprobanteUrl }}
                style={styles.previewDone}
              />
            ) : null}
            {order.comprobanteQrPayload ? (
              <View style={styles.qrDoneBox}>
                <Text style={styles.qrDoneLabel}>Datos del QR registrados</Text>
                <Text selectable style={styles.qrDoneText} numberOfLines={6}>
                  {order.comprobanteQrPayload}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <Pressable
          style={styles.secondary}
          onPress={() => navigation.navigate('MisPedidos')}
        >
          <Text style={styles.secondaryText}>Ver mis pedidos</Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => navigation.navigate('Mercado')}
        >
          <Text style={styles.secondaryText}>Seguir comprando 🌽</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  scroll: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 16, color: COLORS.textMuted, marginBottom: 16 },
  linkBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.greenDark,
    borderRadius: 12,
  },
  linkBtnText: { color: COLORS.white, fontWeight: '700' },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardStrong: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  cardMeta: { fontSize: 14, color: COLORS.textMuted, marginBottom: 8 },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12,
  },
  total: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  infoText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionQr: {
    backgroundColor: COLORS.greenDark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionQrText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  hintOnDark: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  hintOnYellow: {
    color: 'rgba(46, 125, 50, 0.9)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '600',
  },
  hintOnWhite: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionGallery: {
    backgroundColor: COLORS.yellow,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  actionGalleryText: {
    color: COLORS.greenDark,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionCamera: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.greenDark,
  },
  actionCameraText: {
    color: COLORS.greenDark,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    maxHeight: 160,
  },
  qrBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrBoxTitle: { fontWeight: '800', color: COLORS.greenDark, fontSize: 15 },
  qrBoxClear: { fontWeight: '700', color: '#C62828', fontSize: 14 },
  qrScroll: { maxHeight: 100 },
  qrText: {
    fontSize: 12,
    color: '#212121',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  imgPreviewWrap: { marginBottom: 12 },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
  },
  quitarImg: {
    alignSelf: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  quitarImgText: { color: '#C62828', fontWeight: '700', fontSize: 15 },
  previewEmpty: {
    width: '100%',
    height: 100,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewEmptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', paddingHorizontal: 12 },
  sendBtn: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendBtnDisabled: { opacity: 0.75 },
  sendBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  doneBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.greenDark,
  },
  doneTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  doneText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22 },
  previewDone: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: COLORS.grayLight,
  },
  qrDoneBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  qrDoneLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  qrDoneText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  secondary: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
    textDecorationLine: 'underline',
  },
});
