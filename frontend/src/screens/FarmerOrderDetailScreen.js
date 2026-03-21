import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as orderApi from '../services/orderService';
import { useDataUrlComprobanteUri } from '../hooks/useDataUrlComprobanteUri';
import { comparacionMontoComprobante } from '../utils/montoComprobante';
import {
  agricultorPuedeDecidirPago,
  agricultorPuedeMarcarEntregado,
  colorEstadoPedido,
  labelEstadoPedido,
} from '../utils/orderEstado';
import { labelUnidad } from '../utils/unidadLabels';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
  error: '#C62828',
};

export default function FarmerOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [comprobanteImgError, setComprobanteImgError] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await orderApi.fetchFarmerOrder(String(orderId));
      setOrder(data.order);
    } catch (e) {
      setOrder(null);
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo cargar.'
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

  async function onConfirmar() {
    if (!order) return;
    setBusy(true);
    try {
      const data = await orderApi.farmerConfirmarPago(String(order._id));
      setOrder(data.order);
      Alert.alert('Listo', 'Pago confirmado.');
    } catch (e) {
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo confirmar.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function onRechazarSubmit() {
    if (!order || !rejectMotivo.trim()) {
      Alert.alert('Motivo', 'Escribe por qué rechazas el pedido.');
      return;
    }
    setBusy(true);
    try {
      const data = await orderApi.farmerRechazarPedido(
        String(order._id),
        rejectMotivo.trim()
      );
      setOrder(data.order);
      setRejectOpen(false);
      setRejectMotivo('');
      Alert.alert('Pedido rechazado', 'El stock volvió al producto.');
    } catch (e) {
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo rechazar.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function onEntregado() {
    if (!order) return;
    setBusy(true);
    try {
      const data = await orderApi.farmerMarcarEntregado(String(order._id));
      setOrder(data.order);
      Alert.alert('Listo', 'Marcado como entregado.');
    } catch (e) {
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo actualizar.'
      );
    } finally {
      setBusy(false);
    }
  }

  const rawComp = order?.comprobanteUrl;
  const isDataComp = rawComp?.startsWith('data:image');
  const { resolvedUri: compFileUri, busy: compImgBusy } = useDataUrlComprobanteUri(
    isDataComp ? rawComp : null,
    order?._id ?? orderId
  );
  const comprobanteImgUri = rawComp
    ? isDataComp
      ? compFileUri
      : rawComp
    : null;

  useEffect(() => {
    setComprobanteImgError(false);
  }, [comprobanteImgUri]);

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
          <Pressable style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const item = order.items?.[0];
  const buyer = order.buyer;
  const comprador = buyer
    ? `${buyer.nombre || ''} ${buyer.apellido || ''}`.trim()
    : 'Comprador';
  const ec = colorEstadoPedido(order.estado);
  const mostrarDecision = agricultorPuedeDecidirPago(order.estado);
  const mostrarEntregado = agricultorPuedeMarcarEntregado(order.estado);
  const cmpMonto = comparacionMontoComprobante(order.total, order.datosExtraidos?.monto);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.estadoBar, { borderColor: ec }]}>
          <Text style={[styles.estadoBarText, { color: ec }]}>
            {labelEstadoPedido(order.estado)}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Comprador</Text>
          <Text style={styles.strong}>{comprador}</Text>
          {buyer?.telefono ? (
            <Text style={styles.meta}>Tel: {buyer.telefono}</Text>
          ) : null}
          {buyer?.email ? (
            <Text style={styles.meta}>{buyer.email}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Producto</Text>
          <Text style={styles.strong}>{item?.nombre}</Text>
          <Text style={styles.meta}>
            {item?.cantidad} {labelUnidad(item?.unidad)} × $
            {Number(item?.precioUnitario).toFixed(2)}
          </Text>
          <Text style={styles.total}>Total esperado: ${Number(order.total).toFixed(2)}</Text>
        </View>

        <View
          style={[
            styles.cmpCard,
            cmpMonto.tipo === 'ok' && styles.cmpCardOk,
            cmpMonto.tipo === 'diff' && styles.cmpCardDiff,
            cmpMonto.tipo === 'sin_monto' && styles.cmpCardNeutral,
          ]}
        >
          <Text style={styles.cmpTitle}>Comprobación de monto</Text>
          <Text style={styles.cmpRow}>
            Total del pedido (esperado):{' '}
            <Text style={styles.cmpStrong}>${cmpMonto.esperado.toFixed(2)}</Text>
          </Text>
          <Text style={styles.cmpRow}>
            Monto en comprobante (QR / datos enviados):{' '}
            <Text style={styles.cmpStrong}>
              {cmpMonto.detectado != null
                ? `$${cmpMonto.detectado.toFixed(2)}`
                : '— (no detectado)'}
            </Text>
          </Text>
          {order.validacionSistema && typeof order.validacionSistema.montoCoincide === 'boolean' ? (
            <Text style={styles.cmpHint}>
              Validación automática (al enviar):{' '}
              {order.validacionSistema.montoCoincide ? 'monto OK' : 'monto no OK o sin datos'}
            </Text>
          ) : null}
          {cmpMonto.tipo === 'ok' ? (
            <Text style={styles.cmpBadgeOk}>✓ Coincide con el total del pedido</Text>
          ) : null}
          {cmpMonto.tipo === 'diff' ? (
            <Text style={styles.cmpBadgeBad}>
              ✗ No coincide: comprobante ${cmpMonto.detectado.toFixed(2)} vs pedido $
              {cmpMonto.esperado.toFixed(2)} (Δ{' '}
              {cmpMonto.diff > 0 ? '+' : ''}
              ${Math.abs(cmpMonto.diff).toFixed(2)})
            </Text>
          ) : null}
          {cmpMonto.tipo === 'sin_monto' ? (
            <Text style={styles.cmpBadgeNeutral}>
              No hay monto numérico para comparar automáticamente. Revisa la imagen y el texto del
              banco antes de confirmar.
            </Text>
          ) : null}
        </View>

        {order.datosExtraidos &&
        (order.datosExtraidos.monto != null || order.datosExtraidos.referencia) ? (
          <View style={styles.card}>
            <Text style={styles.label}>Datos detectados / del comprador</Text>
            {order.datosExtraidos.monto != null ? (
              <Text style={styles.rowText}>
                Monto: ${Number(order.datosExtraidos.monto).toFixed(2)}
              </Text>
            ) : null}
            {order.datosExtraidos.referencia ? (
              <Text selectable style={styles.rowText}>
                Referencia: {order.datosExtraidos.referencia}
              </Text>
            ) : null}
            <Text style={styles.tiny}>
              QR: {order.datosExtraidos.fuenteQr ? 'sí' : 'no'} · Cliente:{' '}
              {order.datosExtraidos.fuenteCliente ? 'sí' : 'no'}
              {order.datosExtraidos.fuenteOcr ? ' · OCR (imagen): sí' : ''}
              {order.datosExtraidos.fuenteOcrMonto || order.datosExtraidos.fuenteQrMonto
                ? ' · Monto desde comprobante/QR: sí'
                : ' · Monto desde comprobante/QR: no'}
            </Text>
          </View>
        ) : null}

        {order.validacionSistema?.mensajes?.length ? (
          <View style={styles.cardBlue}>
            <Text style={styles.cardBlueTitle}>Validación automática (sistema)</Text>
            {order.validacionSistema.mensajes.map((m, i) => (
              <Text key={i} style={styles.cardBlueLine}>
                • {m}
              </Text>
            ))}
          </View>
        ) : null}

        {order.rechazoMotivo ? (
          <View style={styles.rejectBox}>
            <Text style={styles.rejectLabel}>Rechazo</Text>
            <Text style={styles.rejectBody}>{order.rechazoMotivo}</Text>
            <Text style={styles.tiny}>Por: {order.rechazadoPor || '—'}</Text>
          </View>
        ) : null}

        <View style={styles.compVisualCard}>
          <Text style={styles.label}>Comprobante (imagen)</Text>
          {rawComp ? (
            isDataComp && compImgBusy && !comprobanteImgUri ? (
              <View style={styles.imgLoadingBox}>
                <ActivityIndicator size="large" color={COLORS.greenDark} />
                <Text style={styles.imgLoadingText}>Preparando imagen…</Text>
              </View>
            ) : comprobanteImgUri && !comprobanteImgError ? (
              <Image
                source={{ uri: comprobanteImgUri }}
                style={styles.img}
                resizeMode="contain"
                onError={() => setComprobanteImgError(true)}
              />
            ) : comprobanteImgError ? (
              <Text style={styles.imgError}>
                No se pudo mostrar la imagen (muy pesada o formato no soportado). Pide al comprador
                una captura más pequeña o revisa los datos detectados arriba.
              </Text>
            ) : (
              <Text style={styles.imgError}>No se pudo cargar la imagen.</Text>
            )
          ) : (
            <Text style={styles.meta}>No hay imagen adjunta (solo QR o referencia).</Text>
          )}
        </View>

        {order.comprobanteQrPayload ? (
          <View style={styles.qrBox}>
            <Text style={styles.label}>Payload QR</Text>
            <Text selectable style={styles.qrText} numberOfLines={10}>
              {order.comprobanteQrPayload}
            </Text>
          </View>
        ) : null}

        {mostrarDecision ? (
          <>
            {order.estado === 'comprobante_enviado' ? (
              <View style={styles.legacyHint}>
                <Text style={styles.legacyHintText}>
                  Este pedido usa el estado anterior «comprobante enviado». Revisa
                  monto esperado vs comprobante y confirma o rechaza.
                </Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                style={[styles.btnOk, busy && styles.btnDis]}
                onPress={onConfirmar}
                disabled={busy}
              >
                <Text style={styles.btnOkText}>Confirmar pago ✓</Text>
              </Pressable>
              <Pressable
                style={[styles.btnNo, busy && styles.btnDis]}
                onPress={() => setRejectOpen(true)}
                disabled={busy}
              >
                <Text style={styles.btnNoText}>Rechazar</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {mostrarEntregado ? (
          <Pressable
            style={[styles.btnDeliver, busy && styles.btnDis]}
            onPress={onEntregado}
            disabled={busy}
          >
            <Text style={styles.btnDeliverText}>Marcar como entregado 📦</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <Modal visible={rejectOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Motivo del rechazo</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectMotivo}
              onChangeText={setRejectMotivo}
              placeholder="Ej. monto no coincide con lo que recibí"
              placeholderTextColor="#9E9E9E"
              multiline
            />
            <View style={styles.modalRow}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setRejectOpen(false);
                  setRejectMotivo('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSend} onPress={onRechazarSubmit}>
                <Text style={styles.modalSendText}>Rechazar pedido</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  scroll: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 16, color: COLORS.textMuted, marginBottom: 12 },
  back: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.greenDark,
    borderRadius: 12,
  },
  backText: { color: COLORS.white, fontWeight: '700' },
  estadoBar: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: COLORS.white,
    marginBottom: 14,
  },
  estadoBarText: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  strong: { fontSize: 18, fontWeight: '700', color: '#212121' },
  meta: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },
  total: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginTop: 10,
  },
  rowText: { fontSize: 15, color: '#212121', marginBottom: 4 },
  tiny: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  cardBlue: {
    backgroundColor: '#E3F2FD',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardBlueTitle: {
    fontWeight: '800',
    color: '#1565C0',
    marginBottom: 8,
    fontSize: 14,
  },
  cardBlueLine: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, marginBottom: 4 },
  cmpCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cmpCardOk: { borderColor: '#81C784', backgroundColor: '#E8F5E9' },
  cmpCardDiff: { borderColor: '#E57373', backgroundColor: '#FFEBEE' },
  cmpCardNeutral: { borderColor: '#FFD54F', backgroundColor: '#FFFDE7' },
  cmpTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.greenDark,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  cmpRow: { fontSize: 15, color: '#212121', marginBottom: 8, lineHeight: 22 },
  cmpStrong: { fontWeight: '800', color: '#212121' },
  cmpHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, fontStyle: 'italic' },
  cmpBadgeOk: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B5E20',
    marginTop: 4,
  },
  cmpBadgeBad: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B71C1C',
    marginTop: 4,
    lineHeight: 22,
  },
  cmpBadgeNeutral: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginTop: 4,
    lineHeight: 20,
  },
  compVisualCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  imgLoadingBox: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },
  imgLoadingText: { marginTop: 10, fontSize: 14, color: COLORS.textMuted },
  imgError: {
    fontSize: 14,
    color: COLORS.error,
    lineHeight: 20,
    paddingVertical: 16,
  },
  rejectBox: {
    backgroundColor: '#FFEBEE',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  rejectLabel: { fontWeight: '800', color: COLORS.error, marginBottom: 6 },
  rejectBody: { fontSize: 14, color: '#212121', lineHeight: 20 },
  img: {
    width: '100%',
    minHeight: 260,
    height: 320,
    maxHeight: 420,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
    marginBottom: 4,
  },
  qrBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrText: { fontSize: 11, color: COLORS.textMuted },
  actions: { gap: 10, marginTop: 8 },
  btnOk: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnOkText: { fontSize: 17, fontWeight: '800', color: COLORS.greenDark },
  btnNo: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  btnNoText: { fontSize: 16, fontWeight: '700', color: COLORS.error },
  btnDeliver: {
    backgroundColor: COLORS.greenDark,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDeliverText: { fontSize: 17, fontWeight: '800', color: COLORS.white },
  btnDis: { opacity: 0.6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    minHeight: 88,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 16,
  },
  modalRow: { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
  },
  modalCancelText: { fontWeight: '700', color: COLORS.textMuted },
  modalSend: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  modalSendText: { fontWeight: '800', color: COLORS.error },
  legacyHint: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  legacyHintText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
