import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as orderApi from '../services/orderService';
import {
  PRODUCT_PHOTO_BG,
  productImageResizeMode,
} from '../utils/productImageDisplay';
import { labelUnidad } from '../utils/unidadLabels';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
};

export default function BuyerProductDetailScreen({ route, navigation }) {
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cantidad, setCantidad] = useState(1);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await orderApi.fetchMarketProduct(productId);
      setProduct(data.product);
      setCantidad(1);
    } catch (e) {
      setProduct(null);
      Alert.alert(
        'Error',
        typeof e?.message === 'string'
          ? e.message
          : 'No se pudo cargar el producto.'
      );
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const max = product?.cantidadDisponible ?? 0;
  const precio = product ? Number(product.precio) : 0;
  const total = Math.round(precio * cantidad * 100) / 100;

  function bump(delta) {
    setCantidad((c) => {
      const next = c + delta;
      if (next < 1) return 1;
      if (next > max) return max;
      return next;
    });
  }

  async function crearPedido() {
    if (!product || submitting) return;
    if (cantidad < 1 || cantidad > max) {
      Alert.alert('Cantidad', 'Revisa la cantidad disponible.');
      return;
    }
    setSubmitting(true);
    try {
      const { order } = await orderApi.createOrder({
        productId: product._id,
        cantidad,
        metodoPago: 'transferencia',
      });
      navigation.replace('PagoPedido', { orderId: order._id });
    } catch (e) {
      Alert.alert(
        'Pedido',
        typeof e?.message === 'string' ? e.message : 'No se pudo crear el pedido.'
      );
    } finally {
      setSubmitting(false);
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

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Producto no disponible.</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Volver al mercado</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const farmer = product.farmer;
  const vendedor = farmer
    ? `${farmer.nombre || ''} ${farmer.apellido || ''}`.trim()
    : 'Vendedor';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {product.imagenUrl ? (
          <View style={styles.heroImgWrap}>
            <Image
              source={{ uri: product.imagenUrl }}
              style={styles.heroImgInner}
              resizeMode={productImageResizeMode}
            />
          </View>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>🌽</Text>
          </View>
        )}

        <Text style={styles.name}>{product.nombre}</Text>
        {product.descripcion ? (
          <Text style={styles.desc}>{product.descripcion}</Text>
        ) : null}

        <Text style={styles.price}>
          ${precio.toFixed(2)} / {labelUnidad(product.unidad)}
        </Text>
        <Text style={styles.vendor}>
          Vendedor: {vendedor}
          {farmer?.telefono ? ` · ${farmer.telefono}` : ''}
        </Text>

        <Text style={styles.label}>Cantidad</Text>
        <View style={styles.qtyRow}>
          <Pressable
            style={styles.qtyBtn}
            onPress={() => bump(-1)}
            accessibilityLabel="Menos cantidad"
          >
            <Text style={styles.qtyBtnText}>−</Text>
          </Pressable>
          <TextInput
            style={styles.qtyInput}
            value={String(cantidad)}
            onChangeText={(t) => {
              const n = parseInt(String(t).replace(/\D/g, ''), 10);
              if (Number.isNaN(n)) setCantidad(1);
              else setCantidad(Math.min(max, Math.max(1, n)));
            }}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Pressable
            style={styles.qtyBtn}
            onPress={() => bump(1)}
            accessibilityLabel="Más cantidad"
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </Pressable>
        </View>
        <Text style={styles.stockHint}>Máximo según stock: {max}</Text>

        <View style={styles.transferOnlyBox}>
          <Text style={styles.transferOnlyTitle}>Forma de pago</Text>
          <Text style={styles.transferOnlyText}>
            Solo transferencia bancaria. Por seguridad no aceptamos efectivo ni otros métodos en la
            app; en el siguiente paso subirás el comprobante o el QR del banco.
          </Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Total estimado</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>

        <Text style={styles.legal}>
          Al confirmar se reserva el stock y podrás subir la captura o el QR del comprobante de
          transferencia en el siguiente paso.
        </Text>

        <Pressable
          style={[styles.cta, submitting && styles.ctaDisabled]}
          onPress={crearPedido}
          disabled={submitting || max < 1}
        >
          <Text style={styles.ctaText}>
            {submitting ? 'Creando pedido…' : 'Crear pedido y pagar 💳'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  scroll: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 16, color: COLORS.textMuted, marginBottom: 16 },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.greenDark,
    borderRadius: 12,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
  heroImgWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: PRODUCT_PHOTO_BG,
    overflow: 'hidden',
  },
  heroImgInner: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 64 },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  desc: {
    fontSize: 16,
    color: COLORS.textMuted,
    lineHeight: 24,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  vendor: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.greenDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { fontSize: 24, fontWeight: '700', color: COLORS.greenDark },
  qtyInput: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#212121',
  },
  stockHint: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
    paddingHorizontal: 20,
  },
  transferOnlyBox: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  transferOnlyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  transferOnlyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 21,
  },
  totalBox: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFDE7',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.yellow,
  },
  totalLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '800', color: COLORS.greenDark },
  legal: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginTop: 16,
    paddingHorizontal: 20,
  },
  cta: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: COLORS.yellow,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
});
