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
    const c = colorEstadoPedido(item.estado);

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          navigation.navigate('DetallePedidoAgricultor', { orderId: item._id })
        }
      >
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {line?.nombre || 'Pedido'}
          </Text>
          <View style={[styles.badge, { borderColor: c }]}>
            <Text style={[styles.badgeText, { color: c }]}>
              {labelEstadoPedido(item.estado)}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>{comprador}</Text>
        <Text style={styles.total}>${Number(item.total).toFixed(2)}</Text>
        <Text style={styles.tap}>Abrir detalle ▸</Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.top}>
        <Text style={styles.hint}>
          Revisa comprobantes, datos detectados por el sistema y confirma o rechaza
          cada pago. Luego marca entregado.
        </Text>
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
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Sin pedidos aún</Text>
              <Text style={styles.emptySub}>
                Cuando un comprador pague tus productos, aparecerán aquí.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.grayLight },
  top: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  hint: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  badge: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '52%',
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  meta: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6 },
  total: { fontSize: 20, fontWeight: '800', color: '#212121' },
  tap: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.greenDark,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { paddingVertical: 40, paddingHorizontal: 24, alignItems: 'center' },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  emptySub: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
});
