import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as orderApi from '../services/orderService';

const COLORS = {
  greenDark: '#2E7D32',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
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

export default function MarketScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await orderApi.fetchMarketProducts();
      setProducts(data.products || []);
    } catch (e) {
      setError(
        typeof e?.message === 'string'
          ? e.message
          : 'No se pudo cargar el mercado.'
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  function renderItem({ item }) {
    const farmer = item.farmer;
    const vendedor = farmer
      ? `${farmer.nombre || ''} ${farmer.apellido || ''}`.trim() || 'Vendedor'
      : 'Vendedor';

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() =>
          navigation.navigate('DetalleCompra', { productId: item._id })
        }
        accessibilityRole="button"
        accessibilityLabel={`Producto ${item.nombre}`}
      >
        {item.imagenUrl ? (
          <Image source={{ uri: item.imagenUrl }} style={styles.img} />
        ) : (
          <View style={styles.imgPlaceholder}>
            <Text style={styles.imgPlaceholderText}>🌽</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={2}>
            {item.nombre}
          </Text>
          {item.descripcion ? (
            <Text style={styles.desc} numberOfLines={2}>
              {item.descripcion}
            </Text>
          ) : null}
          <Text style={styles.price}>
            ${Number(item.precio).toFixed(2)} / {labelUnidad(item.unidad)}
          </Text>
          <Text style={styles.stock}>
            Disponible: {item.cantidadDisponible ?? 0} · {vendedor}
          </Text>
        </View>
        <Text style={styles.chevron} aria-hidden>
          ▸
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.top}>
        <Text style={styles.hint}>
          Toca un producto para ver detalle, elegir cantidad y armar tu pedido.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => load()}>
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.greenDark} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌽</Text>
              <Text style={styles.emptyTitle}>Mercado vacío</Text>
              <Text style={styles.emptySub}>
                Cuando los agricultores publiquen con stock, verás aquí sus
                productos.
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
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
    paddingRight: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardPressed: { opacity: 0.94 },
  img: { width: 100, height: 100, backgroundColor: COLORS.grayLight },
  imgPlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgPlaceholderText: { fontSize: 36 },
  cardBody: { flex: 1, paddingVertical: 12, paddingHorizontal: 12 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 4,
  },
  desc: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  price: { fontSize: 16, fontWeight: '700', color: '#212121' },
  stock: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  chevron: { fontSize: 20, color: COLORS.textMuted, paddingHorizontal: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  errorText: { color: '#C62828', marginBottom: 8 },
  retry: { color: COLORS.greenDark, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
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
    lineHeight: 22,
  },
});
