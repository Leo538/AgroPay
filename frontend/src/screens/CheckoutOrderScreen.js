import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
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
import { useDataUrlComprobanteUri } from '../hooks/useDataUrlComprobanteUri';
import * as orderApi from '../services/orderService';
import { alertMessage } from '../utils/confirmDialog';
import { colorEstadoPedido, labelEstadoPedido } from '../utils/orderEstado';
import { pickImageDataUrl } from '../utils/pickImageDataUrl';
import { labelUnidad } from '../utils/unidadLabels';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
};

const METODO_LABEL = {
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  otro: 'Otro',
};

export default function CheckoutOrderScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewQr, setPreviewQr] = useState('');
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewImgError, setPreviewImgError] = useState(false);
  const [orderCompImgError, setOrderCompImgError] = useState(false);

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

  const savedRaw = order?.comprobanteUrl;
  const savedIsData = savedRaw?.startsWith('data:image');
  const { resolvedUri: savedFileUri, busy: savedCompBusy } = useDataUrlComprobanteUri(
    savedIsData ? savedRaw : null,
    order?._id ? String(order._id) : 'ord'
  );
  const orderCompDisplay = savedRaw
    ? savedIsData
      ? savedFileUri
      : savedRaw
    : null;

  const prevIsData = previewUrl.startsWith('data:image');
  const { resolvedUri: previewFileUri, busy: previewCompBusy } = useDataUrlComprobanteUri(
    prevIsData ? previewUrl : null,
    'preview_local'
  );
  const previewDisplayUri = previewUrl
    ? prevIsData
      ? previewFileUri
      : previewUrl
    : null;

  useEffect(() => {
    setPreviewImgError(false);
  }, [previewDisplayUri]);

  useEffect(() => {
    setOrderCompImgError(false);
  }, [orderCompDisplay]);

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

  async function enviarComprobante() {
    if (!order) return;
    const urlOk = previewUrl.trim().length > 0;
    const qrOk = previewQr.trim().length > 0;
    if (!urlOk && !qrOk) {
      Alert.alert(
        'Comprobante',
        'Escanea un QR 📷 o sube una imagen 🧾 del comprobante.'
      );
      return;
    }
    setSending(true);
    try {
      const data = await orderApi.uploadOrderComprobante(String(order._id), {
        comprobanteUrl: previewUrl.trim(),
        comprobanteQrPayload: previewQr.trim(),
        montoDeclarado: undefined,
        referenciaDeclarada: undefined,
      });
      setOrder(data.order);
      setPreviewUrl('');
      setPreviewQr('');
      const next = data.order;
      if (next.estado === 'pre_validado') {
        Alert.alert(
          'Pre-validado',
          'El sistema verificó monto, referencia y duplicados. El vendedor confirmará el pago pronto.'
        );
      } else if (next.estado === 'comprobante_enviado') {
        Alert.alert(
          'Comprobante enviado',
          'No se pudo leer el importe en la imagen; el vendedor revisará el comprobante y decidirá.'
        );
      } else if (next.estado === 'rechazado') {
        Alert.alert(
          'No validado',
          next.rechazoMotivo ||
            'Revisa el comprobante, la referencia y vuelve a intentar con un nuevo pedido.'
        );
      }
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
  const pendiente =
    order.estado === 'pendiente' || order.estado === 'pendiente_comprobante';
  const estadoColor = colorEstadoPedido(order.estado);

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

        <View style={[styles.estadoPill, { borderColor: estadoColor }]}>
          <Text style={[styles.estadoPillText, { color: estadoColor }]}>
            Estado: {labelEstadoPedido(order.estado)}
          </Text>
        </View>

        {pendiente ? (
          <>
            <Text style={styles.sectionTitle}>Enviar comprobante</Text>
            <Text style={styles.sectionSub}>
              Pago solo por transferencia. Usa el comprobante: sube una imagen o escanea
              el QR; el sistema lee monto y referencia.
            </Text>

            <Pressable style={styles.actionQr} onPress={abrirEscanerQr}>
              <Text style={styles.actionQrText}>Escanear código QR 📷</Text>
              <Text style={styles.hintOnDark}>
                Lee el QR del comprobante de transferencia
              </Text>
            </Pressable>

            <Pressable style={styles.actionGallery} onPress={elegirDeGaleria}>
              <Text style={styles.actionGalleryText}>Subir imagen 🧾</Text>
              <Text style={styles.hintOnYellow}>
                Captura de pantalla, voucher o foto guardada
              </Text>
            </Pressable>

            {previewQr ? (
              <View style={styles.qrBox}>
                <View style={styles.qrBoxHeader}>
                  <Text style={styles.qrBoxTitle}>Código leído</Text>
                  <Pressable onPress={() => setPreviewQr('')}>
                    <Text style={styles.qrBoxClear}>Quitar</Text>
                  </Pressable>
                </View>
                <Text style={styles.qrBoxMsg}>
                  Listo para enviar. Al confirmar, el sistema tomará monto y referencia del pago.
                </Text>
              </View>
            ) : null}

            {previewUrl ? (
              <View style={styles.imgPreviewWrap}>
                {prevIsData && previewCompBusy && !previewDisplayUri ? (
                  <View style={styles.previewLoading}>
                    <ActivityIndicator size="large" color={COLORS.greenDark} />
                    <Text style={styles.previewLoadingText}>Preparando vista previa…</Text>
                  </View>
                ) : previewDisplayUri && !previewImgError ? (
                  <Image
                    source={{ uri: previewDisplayUri }}
                    style={styles.preview}
                    resizeMode="contain"
                    onError={() => setPreviewImgError(true)}
                  />
                ) : (
                  <Text style={styles.previewFail}>
                    No se pudo mostrar la vista previa. Prueba otra imagen o reduce el tamaño.
                  </Text>
                )}
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
                  Sin imagen aún · usa «Subir imagen»
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
          <View style={styles.seguimientoBox}>
            {order.estado === 'pre_validado' ? (
              <>
                <Text style={styles.doneTitle}>✓ Pre-validado por el sistema</Text>
                <Text style={styles.doneText}>
                  Monto, referencia y duplicados revisados automáticamente. El
                  agricultor confirmará o rechazará el pago.
                </Text>
              </>
            ) : null}
            {order.estado === 'comprobante_enviado' ? (
              <>
                <Text style={styles.doneTitle}>Comprobante enviado</Text>
                <Text style={styles.doneText}>
                  El vendedor revisará la imagen y los datos. Cuando confirme, el
                  estado pasará a pagado.
                </Text>
              </>
            ) : null}
            {order.estado === 'rechazado' ? (
              <>
                <Text style={styles.rejectTitle}>Pedido rechazado</Text>
                <Text style={styles.rejectMeta}>
                  {order.rechazadoPor === 'sistema'
                    ? 'Validación automática'
                    : 'Vendedor'}
                </Text>
                <Text style={styles.rejectText}>
                  {order.rechazoMotivo || '—'}
                </Text>
                <Text style={styles.doneText}>
                  El stock de tu pedido fue devuelto al mercado. Puedes crear un
                  pedido nuevo corrigiendo los datos.
                </Text>
              </>
            ) : null}
            {order.estado === 'pagado' ? (
              <>
                <Text style={styles.doneTitle}>✓ Pagado</Text>
                <Text style={styles.doneText}>
                  El vendedor confirmó tu pago. Pronto podrá marcar la entrega.
                </Text>
              </>
            ) : null}
            {order.estado === 'entregado' ? (
              <>
                <Text style={styles.doneTitle}>✓ Entregado</Text>
                <Text style={styles.doneText}>
                  El vendedor marcó este pedido como entregado. ¡Gracias por usar
                  AgroPay!
                </Text>
              </>
            ) : null}

            {order.datosExtraidos &&
            (order.datosExtraidos.monto != null ||
              order.datosExtraidos.referencia) ? (
              <View style={styles.datosExt}>
                <Text style={styles.datosExtTitle}>Datos detectados / enviados</Text>
                {order.datosExtraidos.monto != null ? (
                  <Text style={styles.datosExtRow}>
                    Monto: ${Number(order.datosExtraidos.monto).toFixed(2)}
                  </Text>
                ) : null}
                {order.datosExtraidos.referencia ? (
                  <Text selectable style={styles.datosExtRow}>
                    Ref.: {order.datosExtraidos.referencia}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {order.validacionSistema?.mensajes?.length ? (
              <View style={styles.valList}>
                <Text style={styles.valListTitle}>Validación automática</Text>
                {order.validacionSistema.mensajes.map((m, i) => (
                  <Text key={i} style={styles.valListItem}>
                    • {m}
                  </Text>
                ))}
              </View>
            ) : null}

            {order.comprobanteUrl ? (
              savedIsData && savedCompBusy && !orderCompDisplay ? (
                <View style={styles.previewDoneLoading}>
                  <ActivityIndicator color={COLORS.greenDark} />
                  <Text style={styles.previewLoadingText}>Cargando comprobante…</Text>
                </View>
              ) : orderCompDisplay && !orderCompImgError ? (
                <Image
                  source={{ uri: orderCompDisplay }}
                  style={styles.previewDone}
                  resizeMode="contain"
                  onError={() => setOrderCompImgError(true)}
                />
              ) : (
                <Text style={styles.previewFail}>
                  No se pudo mostrar el comprobante adjunto.
                </Text>
              )
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
  estadoPill: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },
  estadoPillText: { fontSize: 14, fontWeight: '800' },
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
  actionGallery: {
    backgroundColor: COLORS.yellow,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionGalleryText: {
    color: COLORS.greenDark,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  qrBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  qrBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qrBoxTitle: { fontWeight: '800', color: COLORS.greenDark, fontSize: 15 },
  qrBoxClear: { fontWeight: '700', color: '#C62828', fontSize: 14 },
  qrBoxMsg: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  imgPreviewWrap: { marginBottom: 12 },
  preview: {
    width: '100%',
    minHeight: 200,
    height: 240,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
  },
  previewLoading: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  previewFail: {
    fontSize: 14,
    color: '#C62828',
    paddingVertical: 20,
    paddingHorizontal: 12,
    textAlign: 'center',
    lineHeight: 20,
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
  seguimientoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#C8E6C9',
  },
  rejectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C62828',
    marginBottom: 4,
  },
  rejectMeta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  rejectText: {
    fontSize: 15,
    color: '#212121',
    lineHeight: 22,
    marginBottom: 12,
  },
  datosExt: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
  },
  datosExtTitle: {
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 6,
    fontSize: 14,
  },
  datosExtRow: { fontSize: 14, color: '#212121', marginBottom: 4 },
  valList: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  valListTitle: {
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 8,
    fontSize: 14,
  },
  valListItem: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 4 },
  doneTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  doneText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 22 },
  previewDone: {
    width: '100%',
    minHeight: 200,
    height: 260,
    borderRadius: 12,
    marginTop: 14,
    backgroundColor: COLORS.grayLight,
  },
  previewDoneLoading: {
    width: '100%',
    height: 200,
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
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
