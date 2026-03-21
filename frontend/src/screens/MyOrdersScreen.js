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
import { colorEstadoPedido, labelEstadoPedido } from '../utils/orderEstado';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
};

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.fetchMyOrders();
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
    const title = line?.nombre || 'Pedido';
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleString('es')
      : '';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          navigation.navigate('PagoPedido', { orderId: item._id })
        }
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <View
            style={[
              styles.badge,
              { borderColor: colorEstadoPedido(item.estado) },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: colorEstadoPedido(item.estado) },
              ]}
            >
              {labelEstadoPedido(item.estado)}
            </Text>
          </View>
        </View>
        <Text style={styles.cardMeta}>{date}</Text>
        <Text style={styles.cardTotal}>${Number(item.total).toFixed(2)}</Text>
        <Text style={styles.cardTap}>Toca para pago, comprobante y estado ▸</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
              <Text style={styles.emptySub}>
                Explora el mercado y crea tu primer pedido.
              </Text>
              <Pressable
                style={styles.cta}
                onPress={() => navigation.navigate('Mercado')}
              >
                <Text style={styles.ctaText}>Ir al mercado 🌽</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardPressed: { opacity: 0.92 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '52%',
    borderWidth: 2,
    backgroundColor: COLORS.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardMeta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  cardTotal: { fontSize: 20, fontWeight: '800', color: '#212121' },
  cardTap: {
    fontSize: 13,
    color: COLORS.greenDark,
    marginTop: 10,
    fontWeight: '600',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  cta: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  ctaText: { fontWeight: '800', color: COLORS.greenDark, fontSize: 16 },
});
