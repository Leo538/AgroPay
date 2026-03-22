import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as orderApi from '../services/orderService';
import {
  colorEstadoPedido,
  fondoSuaveEstadoPedido,
  labelEstadoPedido,
} from '../utils/orderEstado';

const CONTENT_MAX_W = 560;

const COLORS = {
  greenDark: '#2E7D32',
  greenMid: '#388E3C',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  page: '#F0F4F1',
  greenSoft: '#E8F5E9',
  textMuted: '#5C5C5C',
  text: '#1B1B1B',
  border: '#C8E6C9',
};

function fechaPedido(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-EC', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function FarmerOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.fetchFarmerOrders();
      setOrders(data.orders || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function renderItem({ item }) {
    const line = item.items?.[0];
    const buyer = item.buyer;
    const comprador = buyer
      ? `${buyer.nombre || ''} ${buyer.apellido || ''}`.trim()
      : 'Comprador';
    const estadoColor = colorEstadoPedido(item.estado);
    const estadoBg = fondoSuaveEstadoPedido(item.estado);
    const cuando = fechaPedido(item.updatedAt || item.createdAt);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          navigation.navigate('DetallePedidoAgricultor', { orderId: item._id })
        }
        accessibilityRole="button"
        accessibilityLabel={`Pedido ${line?.nombre || 'producto'}, ${labelEstadoPedido(item.estado)}`}
      >
        <View style={[styles.accent, { backgroundColor: estadoColor }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardTop}>
            <View style={styles.cardTopMain}>
              <Text style={styles.producto} numberOfLines={2}>
                {line?.nombre || 'Pedido'}
              </Text>
              <View style={styles.buyerRow}>
                <Text style={styles.buyerLabel}>Comprador</Text>
                <Text style={styles.buyerName} numberOfLines={1}>
                  {comprador}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: estadoBg, borderColor: estadoColor },
              ]}
            >
              <Text style={[styles.badgeText, { color: estadoColor }]}>
                {labelEstadoPedido(item.estado)}
              </Text>
            </View>
          </View>

          {cuando ? <Text style={styles.fechaMeta}>{cuando}</Text> : null}

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.total}>
                ${Number(item.total).toFixed(2)}
              </Text>
            </View>
            <View style={styles.ctaPill}>
              <Text style={styles.ctaText}>Ver pedido</Text>
              <Text style={styles.ctaChevron} aria-hidden>
                →
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.introWrap}>
        <View style={styles.introCard}>
          <Text style={styles.introIcon} aria-hidden>
            📋
          </Text>
          <View style={styles.introTextBlock}>
            <Text style={styles.introTitle}>Qué hacer aquí</Text>
            <Text style={styles.introBody}>
              Revisa comprobante y datos que detectó el sistema. Confirma o rechaza
              el pago y, cuando corresponda, marca entregado.
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.greenDark} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon} aria-hidden>
                  🛒
                </Text>
              </View>
              <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
              <Text style={styles.emptySub}>
                Cuando un comprador reserve y envíe comprobante, verás cada pedido
                aquí.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.page },
  introWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    maxWidth: CONTENT_MAX_W,
    width: '100%',
    alignSelf: 'center',
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.greenSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  introIcon: { fontSize: 28, marginTop: 2 },
  introTextBlock: { flex: 1 },
  introTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 6,
  },
  introBody: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 32,
    maxWidth: CONTENT_MAX_W,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E8E2',
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: { opacity: 0.96 },
  accent: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardInner: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  cardTopMain: { flex: 1, minWidth: 0 },
  producto: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.greenDark,
    lineHeight: 24,
    marginBottom: 8,
  },
  buyerRow: { gap: 2 },
  buyerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenMid,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  badge: {
    maxWidth: '46%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  fechaMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenSoft,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  ctaChevron: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
});
