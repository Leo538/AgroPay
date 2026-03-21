import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  greenDark: '#2E7D32',
  greenLight: '#66BB6A',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
};

function roleLabel(role) {
  if (role === 'agricultor') return 'Agricultor';
  if (role === 'comprador') return 'Comprador';
  return role || 'Usuario';
}

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const nombre = (user?.nombre || '').trim() || 'Usuario';
  const apellido = (user?.apellido || '').trim();
  const telefono = user?.telefono || '—';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.emoji} accessibilityLabel="Bienvenida">
          🌾
        </Text>
        <Text style={styles.greeting}>Hola,</Text>
        <Text style={styles.name}>
          {nombre}
          {apellido ? ` ${apellido}` : ''}
        </Text>
        <Text style={styles.sub}>Qué gusto verte en AgroPay</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tu perfil</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Tipo de cuenta</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{roleLabel(user?.role)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Celular</Text>
            <Text style={styles.rowValue}>{telefono}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Correo</Text>
            <Text style={styles.rowValue} numberOfLines={2}>
              {user?.email || '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Pronto aquí verás las opciones de {roleLabel(user?.role).toLowerCase()}{' '}
          (productos, pedidos, etc.).
        </Text>

        <Pressable
          style={styles.outlineBtn}
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.outlineBtnText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.greenDark,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  emoji: {
    fontSize: 52,
    textAlign: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 22,
    color: COLORS.grayLight,
    textAlign: 'center',
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    color: COLORS.grayLight,
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 16,
  },
  row: {
    marginBottom: 14,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 16,
    color: '#212121',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.greenDark,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  hint: {
    fontSize: 15,
    color: COLORS.grayLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
});
