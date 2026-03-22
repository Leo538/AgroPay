import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import * as homeAlerts from '../services/homeAlertsService';
import { labelEstadoPedido } from '../utils/orderEstado';
import { labelUnidad } from '../utils/unidadLabels';

/** Ancho máximo del contenido en tablet / web (legible y centrado). */
const CONTENT_MAX_W = 560;

const VENTANA_ALERTAS_HORAS = 48;
const MAX_VISTA_ALERTAS = 3;

function medidasPopoverAlertas() {
  const { width: w } = Dimensions.get('window');
  return {
    ancho: Math.min(w - 24, 340),
    topDesdeSafe: 52,
  };
}

function fechaReloj(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('es-EC', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

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
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [alertasRecientes, setAlertasRecientes] = useState(0);
  const [panelAlertasVisible, setPanelAlertasVisible] = useState(false);
  const [alertasLista, setAlertasLista] = useState([]);
  const [alertasListaCargando, setAlertasListaCargando] = useState(false);
  const [alertasListaError, setAlertasListaError] = useState('');

  const esAgricultor = user?.role === 'agricultor';
  const esComprador = user?.role === 'comprador';
  const nombre = (user?.nombre || '').trim() || 'Usuario';
  const apellido = (user?.apellido || '').trim();
  const telefono = user?.telefono || '—';
  const nombreCompleto = useMemo(
    () => `${nombre}${apellido ? ` ${apellido}` : ''}`,
    [nombre, apellido]
  );

  const footerPadBottom = Math.max(insets.bottom, 14);

  const cargarAlertas = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'agricultor') {
        const n = await homeAlerts.fetchPedidosRecientesCount();
        setAlertasRecientes(n);
      } else if (user.role === 'comprador') {
        const n = await homeAlerts.fetchProductosNuevosCount();
        setAlertasRecientes(n);
      } else {
        setAlertasRecientes(0);
      }
    } catch {
      setAlertasRecientes(0);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      cargarAlertas();
    }, [cargarAlertas])
  );

  const cargarListaPanelAlertas = useCallback(async () => {
    if (!user) return;
    setAlertasListaCargando(true);
    setAlertasListaError('');
    try {
      if (user.role === 'agricultor') {
        const data = await homeAlerts.fetchPedidosRecientesLista();
        setAlertasLista(data.items || []);
      } else if (user.role === 'comprador') {
        const data = await homeAlerts.fetchProductosRecientesLista();
        setAlertasLista(data.items || []);
      } else {
        setAlertasLista([]);
      }
    } catch {
      setAlertasListaError('No se pudo cargar el listado.');
      setAlertasLista([]);
    } finally {
      setAlertasListaCargando(false);
    }
  }, [user]);

  const cerrarPanelAlertas = useCallback(() => {
    setPanelAlertasVisible(false);
    setAlertasListaError('');
  }, []);

  const abrirListaPrincipalAlertas = useCallback(() => {
    cerrarPanelAlertas();
    if (esAgricultor) navigation.navigate('PedidosRecibidos');
    else if (esComprador) navigation.navigate('Mercado');
  }, [cerrarPanelAlertas, esAgricultor, esComprador, navigation]);

  const abrirItemAlerta = useCallback(
    (id) => {
      cerrarPanelAlertas();
      if (esAgricultor) {
        navigation.navigate('DetallePedidoAgricultor', { orderId: id });
      } else if (esComprador) {
        navigation.navigate('DetalleCompra', { productId: id });
      }
    },
    [cerrarPanelAlertas, esAgricultor, esComprador, navigation]
  );

  const togglePanelAlertas = useCallback(() => {
    setPanelAlertasVisible((prev) => {
      if (prev) {
        setAlertasListaError('');
        return false;
      }
      cargarListaPanelAlertas();
      return true;
    });
  }, [cargarListaPanelAlertas]);

  const etiquetaCampana = esAgricultor
    ? `Novedades: ${alertasRecientes} pedido${
        alertasRecientes === 1 ? '' : 's'
      } en las últimas ${VENTANA_ALERTAS_HORAS} horas. ${
        panelAlertasVisible ? 'Cerrar' : 'Abrir'
      } ventana flotante.`
    : esComprador
      ? `Novedades: ${alertasRecientes} producto${
          alertasRecientes === 1 ? '' : 's'
        } nuevos en las últimas ${VENTANA_ALERTAS_HORAS} horas. ${
          panelAlertasVisible ? 'Cerrar' : 'Abrir'
        } ventana flotante.`
      : 'Alertas';

  const popMedidas = medidasPopoverAlertas();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.mainColumn}>
        {esAgricultor || esComprador ? (
          <View style={styles.alertsBar}>
            <View style={styles.alertsBarSpacer} />
            <Pressable
              style={({ pressed }) => [
                styles.alertsBtn,
                panelAlertasVisible && styles.alertsBtnActive,
                pressed && styles.alertsBtnPressed,
              ]}
              onPress={togglePanelAlertas}
              accessibilityRole="button"
              accessibilityState={{ expanded: panelAlertasVisible }}
              accessibilityLabel={etiquetaCampana}
            >
              <Text style={styles.alertsIcon} aria-hidden>
                🔔
              </Text>
              {alertasRecientes > 0 ? (
                <View style={styles.alertsBadge} accessibilityElementsHidden>
                  <Text style={styles.alertsBadgeText}>
                    {alertasRecientes > 9 ? '9+' : String(alertasRecientes)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContent}
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
            styles.perfilCard,
            pressed && styles.cardPressed,
          ]}
          onPress={() => setPerfilAbierto((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: perfilAbierto }}
          accessibilityLabel="Mi perfil"
          accessibilityHint="Muestra u oculta tus datos de cuenta"
        >
          <View style={styles.perfilHeaderRow}>
            <View style={styles.perfilAvatarMini}>
              <Text style={styles.perfilAvatarMiniText} aria-hidden>
                {iniciales(nombre, apellido)}
              </Text>
            </View>
            <View style={styles.perfilHeaderMain}>
              <Text style={styles.cardTitle}>Mi perfil</Text>
              <Text style={styles.cardSub}>
                {perfilAbierto
                  ? 'Toca para ocultar'
                  : 'Toca para ver lo que ingresaste'}
              </Text>
            </View>
            <Text style={styles.perfilHeaderChevron} aria-hidden>
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
                <Text style={styles.chevron} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardLink,
                pressed && styles.cardPressed,
              ]}
              onPress={() => navigation.navigate('PreciosReferencia')}
              accessibilityRole="button"
              accessibilityLabel="Precios de referencia de mercado"
            >
              <View style={styles.cardRow}>
                <Text style={styles.linkIcon} aria-hidden>
                  📊
                </Text>
                <View style={styles.cardRowMain}>
                  <Text style={styles.cardTitle}>Precios de referencia</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    Lista de precios oficial del mercado mayorista (PDF)
                  </Text>
                </View>
                <Text style={styles.chevron} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardLink,
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
                <Text style={styles.chevron} aria-hidden>
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
                <Text style={styles.chevron} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                styles.cardLink,
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
                <Text style={styles.chevron} aria-hidden>
                  ▸
                </Text>
              </View>
            </Pressable>
          </>
        ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: footerPadBottom }]}>
          <View style={styles.footerInner}>
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
          </View>
        </View>
      </View>

      {esAgricultor || esComprador ? (
        <Modal
          visible={panelAlertasVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={cerrarPanelAlertas}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={cerrarPanelAlertas}
              accessibilityLabel="Cerrar novedades"
              accessibilityRole="button"
            />
            <View
              style={[
                styles.alertasPopover,
                {
                  top: insets.top + popMedidas.topDesdeSafe,
                  width: popMedidas.ancho,
                },
              ]}
            >
              <View style={styles.alertasPanelHeaderRow}>
                <View style={styles.alertasPanelHeaderText}>
                  <Text style={styles.alertasPanelTitle}>
                    {esAgricultor
                      ? 'Pedidos recientes'
                      : 'Novedades en el mercado'}
                  </Text>
                  <Text style={styles.alertasPanelSub}>
                    Últimas {VENTANA_ALERTAS_HORAS} h
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.alertasCloseBtn,
                    pressed && styles.alertasCloseBtnPressed,
                  ]}
                  onPress={cerrarPanelAlertas}
                  hitSlop={14}
                  accessibilityLabel="Cerrar"
                  accessibilityRole="button"
                >
                  <Text style={styles.alertasCloseText}>✕</Text>
                </Pressable>
              </View>

              {alertasListaCargando ? (
                <View style={styles.alertasPanelLoading}>
                  <ActivityIndicator color={COLORS.greenDark} />
                </View>
              ) : alertasListaError ? (
                <Text style={styles.alertasPanelError}>{alertasListaError}</Text>
              ) : alertasLista.length === 0 ? (
                <View style={styles.alertasSinLista}>
                  <Text style={styles.alertasPanelEmpty}>
                    No hay novedades en esta ventana.
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.alertasCtaPrincipal,
                      pressed && styles.alertasCtaPrincipalPressed,
                    ]}
                    onPress={abrirListaPrincipalAlertas}
                    accessibilityRole="button"
                    accessibilityLabel={
                      esComprador
                        ? 'Abrir mercado'
                        : 'Abrir pedidos recibidos'
                    }
                  >
                    <Text style={styles.alertasCtaPrincipalText}>
                      {esComprador ? 'Ir al mercado' : 'Ver pedidos recibidos'}
                    </Text>
                    <Text style={styles.alertasCtaPrincipalArrow}>→</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  {alertasLista.slice(0, MAX_VISTA_ALERTAS).map((row, i, arr) => (
                    <Pressable
                      key={row._id}
                      style={({ pressed }) => [
                        styles.alertasRow,
                        i === arr.length - 1 && styles.alertasRowLastPreview,
                        pressed && styles.alertasRowPressed,
                      ]}
                      onPress={() => abrirItemAlerta(row._id)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        esAgricultor
                          ? `Pedido ${row.producto}`
                          : `Producto ${row.nombre}`
                      }
                    >
                      {esAgricultor ? (
                        <>
                          <Text
                            style={styles.alertasRowTitle}
                            numberOfLines={2}
                          >
                            {row.producto}
                          </Text>
                          <Text
                            style={styles.alertasRowMeta}
                            numberOfLines={1}
                          >
                            {row.comprador}
                          </Text>
                          <View style={styles.alertasRowFoot}>
                            <Text style={styles.alertasRowEstado}>
                              {labelEstadoPedido(row.estado)}
                            </Text>
                            <Text style={styles.alertasRowTotal}>
                              ${Number(row.total).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.alertasRowTime}>
                            {fechaReloj(row.createdAt)}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={styles.alertasRowTitle}
                            numberOfLines={2}
                          >
                            {row.nombre}
                          </Text>
                          <Text
                            style={styles.alertasRowMeta}
                            numberOfLines={1}
                          >
                            {row.vendedor}
                          </Text>
                          <View style={styles.alertasRowFoot}>
                            <Text style={styles.alertasRowPrecio}>
                              ${Number(row.precio).toFixed(2)} ·{' '}
                              {labelUnidad(row.unidad)}
                            </Text>
                          </View>
                          <Text style={styles.alertasRowTime}>
                            {fechaReloj(row.createdAt)}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                  {alertasLista.length > MAX_VISTA_ALERTAS ? (
                    <Text style={styles.alertasMas}>
                      +{alertasLista.length - MAX_VISTA_ALERTAS} más en las
                      últimas {VENTANA_ALERTAS_HORAS} h
                    </Text>
                  ) : null}
                  <Pressable
                    style={({ pressed }) => [
                      styles.alertasCtaPrincipal,
                      pressed && styles.alertasCtaPrincipalPressed,
                    ]}
                    onPress={abrirListaPrincipalAlertas}
                    accessibilityRole="button"
                    accessibilityLabel={
                      esComprador
                        ? 'Abrir mercado completo'
                        : 'Abrir lista de pedidos'
                    }
                  >
                    <Text style={styles.alertasCtaPrincipalText}>
                      {esComprador
                        ? 'Abrir mercado'
                        : 'Ver todos los pedidos'}
                    </Text>
                    <Text style={styles.alertasCtaPrincipalArrow}>→</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bgPage,
  },
  mainColumn: {
    flex: 1,
  },
  alertsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
    width: '100%',
    maxWidth: CONTENT_MAX_W,
    alignSelf: 'center',
    minHeight: 44,
  },
  alertsBarSpacer: { flex: 1 },
  alertsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  alertsBtnPressed: {
    backgroundColor: COLORS.greenSoft,
    opacity: 0.95,
  },
  alertsBtnActive: {
    borderColor: COLORS.greenDark,
    backgroundColor: COLORS.greenSoft,
  },
  alertsIcon: { fontSize: 22 },
  alertsBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  alertsBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  alertasPopover: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 14,
  },
  alertasPanelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    gap: 8,
  },
  alertasPanelHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  alertasPanelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 2,
  },
  alertasPanelSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  alertasCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    marginTop: -4,
  },
  alertasCloseBtnPressed: {
    backgroundColor: COLORS.greenSoft,
  },
  alertasCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  alertasPanelLoading: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  alertasPanelError: {
    fontSize: 14,
    color: '#C62828',
    paddingVertical: 12,
    textAlign: 'center',
  },
  alertasPanelEmpty: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingVertical: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertasSinLista: {
    alignItems: 'stretch',
  },
  alertasMas: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  alertasCtaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.yellow,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  alertasCtaPrincipalPressed: {
    opacity: 0.92,
  },
  alertasCtaPrincipalText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  alertasCtaPrincipalArrow: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  alertasRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  alertasRowLastPreview: {
    borderBottomWidth: 0,
  },
  alertasRowPressed: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 10,
  },
  alertasRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  alertasRowMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  alertasRowFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  alertasRowEstado: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenMid,
    flex: 1,
    minWidth: 120,
  },
  alertasRowTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },
  alertasRowPrecio: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  alertasRowTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: CONTENT_MAX_W,
    alignSelf: 'center',
  },
  footer: {
    backgroundColor: 'transparent',
    paddingTop: 12,
  },
  footerInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_W,
    alignSelf: 'center',
    paddingHorizontal: 20,
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
  /** Acento lateral en accesos (sin amarillo; alineado al verde de la pantalla). */
  cardLink: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.greenMid,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  perfilCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.greenDark,
    paddingVertical: 14,
  },
  perfilHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
  },
  perfilAvatarMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.yellow,
  },
  perfilAvatarMiniText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  perfilHeaderMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  perfilHeaderChevron: {
    fontSize: 18,
    color: COLORS.greenMid,
    fontWeight: '700',
    paddingHorizontal: 2,
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
