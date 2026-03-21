import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
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
  greenMid: '#388E3C',
  greenSoft: '#E8F5E9',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  bgPage: '#F2F7F3',
  text: '#1B1B1B',
  textMuted: '#5C5C5C',
  border: '#D7E8DA',
};

function roleLabel(role) {
  if (role === 'agricultor') return 'Agricultor';
  if (role === 'comprador') return 'Comprador';
  return role || 'Usuario';
}

function iniciales(nombre, apellido) {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  if (n && a) return `${n[0]}${a[0]}`.toUpperCase();
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  if (n.length === 1) return n.toUpperCase();
  return '?';
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [perfilAbierto, setPerfilAbierto] = useState(false);

  const esAgricultor = user?.role === 'agricultor';
  const esComprador = user?.role === 'comprador';
  const nombre = (user?.nombre || '').trim() || 'Usuario';
  const apellido = (user?.apellido || '').trim();
  const telefono = user?.telefono || '—';
  const nombreCompleto = useMemo(
    () => `${nombre}${apellido ? ` ${apellido}` : ''}`,
    [nombre, apellido]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.avatar} accessibilityLabel="Avatar de perfil">
            <Text style={styles.avatarText}>
              {iniciales(nombre, apellido)}
            </Text>
          </View>
          <Text style={styles.heroName} numberOfLines={2}>
            {nombreCompleto}
          </Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel(user?.role)}</Text>
          </View>
        </View>

        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>Accesos rápidos</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
          ]}
          onPress={() => setPerfilAbierto((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: perfilAbierto }}
          accessibilityLabel="Mi perfil"
          accessibilityHint="Muestra u oculta tus datos de cuenta"
        >
          <View style={styles.cardRow}>
            <View style={styles.cardRowMain}>
              <Text style={styles.cardTitle}>Mi perfil</Text>
              <Text style={styles.cardSub}>
                {perfilAbierto
                  ? 'Toca para ocultar'
                  : 'Toca para ver lo que ingresaste'}
              </Text>
            </View>
            <Text style={styles.chevron} aria-hidden>
              {perfilAbierto ? '▾' : '▸'}
            </Text>
          </View>

          {perfilAbierto ? (
            <View style={styles.detalle}>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Tipo de cuenta</Text>
                <Text style={styles.detalleValue}>
                  {roleLabel(user?.role)}
                </Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Celular</Text>
                <Text style={styles.detalleValue}>{telefono}</Text>
              </View>
              <View style={styles.detalleRow}>
                <Text style={styles.detalleLabel}>Correo</Text>
                <Text style={styles.detalleValue} numberOfLines={3}>
                  {user?.email || '—'}
                </Text>
              </View>
            </View>
          ) : null}
        </Pressable>

        {esAgricultor ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardLink,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('Productos')}
              accessibilityRole="button"
              accessibilityLabel="Mis productos"
            >
              <View style={styles.cardRow}>
                <Text style={styles.linkIcon} aria-hidden>
                  🌽
                </Text>
                <View style={styles.cardRowMain}>
                  <Text style={styles.cardTitle}>Mis productos</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Publicar, editar o quitar lo que ofreces
                  </Text>
                </View>
                <Text style={styles.chevronMuted} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('PedidosRecibidos')}
              accessibilityRole="button"
              accessibilityLabel="Pedidos recibidos"
            >
              <View style={styles.cardRow}>
                <Text style={styles.linkIcon} aria-hidden>
                  🛒
                </Text>
                <View style={styles.cardRowMain}>
                  <Text style={styles.cardTitle}>Pedidos recibidos</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Ver comprobantes, validación del sistema y confirmar pagos
                  </Text>
                </View>
                <Text style={styles.chevronMuted} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}

        {esComprador ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardLink,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('Mercado')}
              accessibilityRole="button"
              accessibilityLabel="Mercado"
            >
              <View style={styles.cardRow}>
                <Text style={styles.linkIcon} aria-hidden>
                  🌽
                </Text>
                <View style={styles.cardRowMain}>
                  <Text style={styles.cardTitle}>Ver productos</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Explora el mercado, elige cantidad y arma tu pedido
                  </Text>
                </View>
                <Text style={styles.chevronMuted} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('MisPedidos')}
              accessibilityRole="button"
              accessibilityLabel="Mis pedidos"
            >
              <View style={styles.cardRow}>
                <Text style={styles.linkIcon} aria-hidden>
                  📦
                </Text>
                <View style={styles.cardRowMain}>
                  <Text style={styles.cardTitle}>Mis pedidos</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Pagar, subir comprobante o QR y revisar estado
                  </Text>
                </View>
                <Text style={styles.chevronMuted} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}

        <Text style={styles.hint}>
          {esAgricultor
            ? 'Los compradores ven tu oferta en el mercado. Revisa pedidos cuando envíen comprobante.'
            : esComprador
              ? 'Al crear el pedido se reserva stock. El sistema pre-valida tu comprobante; si falla, el stock vuelve al mercado.'
              : `Pronto tendrás aquí más opciones para ${roleLabel(
                  user?.role
                ).toLowerCase()}.`}
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.signOut,
            pressed && styles.signOutPressed,
          ]}
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: COLORS.yellow,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  rolePill: {
    backgroundColor: COLORS.greenSoft,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rolePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLink: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  cardRowMain: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.greenMid,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  chevronMuted: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  linkIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  detalle: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detalleRow: {
    marginBottom: 14,
  },
  detalleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detalleValue: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  hint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  signOut: {
    alignSelf: 'center',
    minWidth: 200,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.greenDark,
    backgroundColor: COLORS.white,
  },
  signOutPressed: {
    backgroundColor: COLORS.greenSoft,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.greenDark,
    textAlign: 'center',
  },
});
