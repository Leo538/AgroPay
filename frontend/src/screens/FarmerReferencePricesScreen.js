import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as refApi from '../services/farmerReferenceService';

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

function fechaLegible(iso) {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function abrirEnlace(url) {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

export default function FarmerReferencePricesScreen() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await refApi.fetchFarmerReferencePrices();
      setPayload(data);
    } catch (e) {
      setPayload(null);
      setError(
        e?.status === 403
          ? 'Solo los agricultores pueden ver esta lista.'
          : 'No se pudo cargar la referencia. Revisa tu conexión e intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ema = payload?.listaOficialEma;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.greenDark} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={load}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {ema?.ok ? (
            <View style={styles.heroCard}>
              <View style={styles.heroHeader}>
                <View style={styles.iconBadge}>
                  <Text style={styles.iconBadgeText} aria-hidden>
                    📊
                  </Text>
                </View>
                <View style={styles.heroHeaderText}>
                  <Text style={styles.eyebrow}>Mercado Mayorista Ambato</Text>
                  <Text style={styles.heroTitle}>Lista de precios oficial</Text>
                  <Text style={styles.heroSubtitle}>
                    Empresa Pública EP-EMA · Gobierno local
                  </Text>
                </View>
              </View>

              <View style={styles.datePill}>
                <Text style={styles.datePillLabel}>Último PDF publicado</Text>
                <Text style={styles.datePillValue}>
                  {fechaLegible(ema.masReciente.fecha)}
                </Text>
              </View>

              <Text style={styles.bodyNote}>
                Obtenemos automáticamente el archivo más reciente desde la web
                pública de precios. Ábrelo para ver productos y valores al detalle.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryCta,
                  pressed && styles.primaryCtaPressed,
                ]}
                onPress={() => abrirEnlace(ema.masReciente.url)}
              >
                <Text style={styles.primaryCtaText}>Abrir PDF</Text>
                <Text style={styles.primaryCtaHint}>Vista externa · lector del sistema</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.secondaryBtnPressed,
                ]}
                onPress={() => abrirEnlace(ema.paginaUrl)}
              >
                <Text style={styles.secondaryBtnText}>
                  Sitio web listaprecios ↗
                </Text>
              </Pressable>

              {ema.historial?.length > 1 ? (
                <View style={styles.historialSection}>
                  <Text style={styles.historialHeading}>Otras fechas</Text>
                  <Text style={styles.historialSub}>
                    Mismos PDF que en la página oficial
                  </Text>
                  <View style={styles.historialList}>
                    {ema.historial.slice(1, 14).map((row) => (
                      <Pressable
                        key={row.url}
                        style={({ pressed }) => [
                          styles.historialChip,
                          pressed && styles.historialChipPressed,
                        ]}
                        onPress={() => abrirEnlace(row.url)}
                      >
                        <Text style={styles.historialChipDate}>
                          {fechaLegible(row.fecha)}
                        </Text>
                        <Text style={styles.historialChipAction}>PDF</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          ) : ema && !ema.ok ? (
            <View style={styles.warnCard}>
              <Text style={styles.warnEmoji} aria-hidden>
                ⚠️
              </Text>
              <Text style={styles.warnTitle}>No se pudo leer la lista automática</Text>
              <Text style={styles.warnText}>{ema.message}</Text>
              <Pressable
                style={styles.warnCta}
                onPress={() =>
                  abrirEnlace('https://ambato-ema.gob.ec/listaprecios/')
                }
              >
                <Text style={styles.warnCtaText}>Ir a ambato-ema.gob.ec</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.footerLegal}>
            Fuente: página pública de precios EP-EMA. AgroPay no edita el contenido
            del PDF.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.page },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.greenSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconBadgeText: { fontSize: 26 },
  heroHeaderText: { flex: 1, paddingTop: 2 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.greenMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 28,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  datePill: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  datePillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenMid,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  datePillValue: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  bodyNote: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: 22,
  },
  primaryCta: {
    backgroundColor: COLORS.greenDark,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCtaPressed: { opacity: 0.92 },
  primaryCtaText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.white,
  },
  primaryCtaHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  secondaryBtnPressed: { opacity: 0.7 },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  historialSection: {
    marginTop: 22,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  historialHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  historialSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  historialList: { gap: 8 },
  historialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.page,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  historialChipPressed: {
    backgroundColor: COLORS.greenSoft,
    borderColor: COLORS.border,
  },
  historialChipDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  historialChipAction: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.greenDark,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  footerLegal: {
    marginTop: 24,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  warnCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  warnEmoji: { fontSize: 36, marginBottom: 12 },
  warnTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 8,
  },
  warnText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  warnCta: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  warnCtaText: {
    fontWeight: '800',
    color: COLORS.greenDark,
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retry: {
    backgroundColor: COLORS.yellow,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: { fontWeight: '800', color: COLORS.greenDark, fontSize: 16 },
});
