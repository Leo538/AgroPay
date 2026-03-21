import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmModal from '../components/ConfirmModal';
import * as productApi from '../services/productService';
import { alertMessage } from '../utils/confirmDialog';

const COLORS = {
  greenDark: '#2E7D32',
  greenLight: '#66BB6A',
  yellow: '#FBC02D',
  white: '#FFFFFF',
  grayLight: '#F5F5F5',
  textMuted: '#424242',
  error: '#C62828',
};

const UNIDADES = [
  { key: 'kg', label: 'Kilogramo (kg)' },
  { key: 'lb', label: 'Libra' },
  { key: 'unidad', label: 'Por unidad' },
  { key: 'docena', label: 'Docena' },
  { key: 'litro', label: 'Litro' },
  { key: 'arroba', label: 'Arroba' },
  { key: 'atado', label: 'Atado / manojo' },
  { key: 'otro', label: 'Otro' },
];

const CATEGORIAS = [
  { key: 'frutas', label: 'Frutas' },
  { key: 'verduras', label: 'Verduras' },
  { key: 'granos', label: 'Granos' },
  { key: 'tuberculos', label: 'Tubérculos' },
  { key: 'lacteos', label: 'Lácteos' },
  { key: 'otros', label: 'Otros' },
];

function formatPrecio(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return x.toFixed(2);
}

function labelUnidad(key) {
  return UNIDADES.find((u) => u.key === key)?.label || key;
}

function labelCategoria(key) {
  return CATEGORIAS.find((c) => c.key === key)?.label || key;
}

export default function ProductScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioStr, setPrecioStr] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [categoria, setCategoria] = useState('verduras');
  const [cantidadStr, setCantidadStr] = useState('0');
  const [imagenUrl, setImagenUrl] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const loadProducts = useCallback(async () => {
    setError('');
    try {
      const data = await productApi.fetchMyProducts();
      setProducts(data.products || []);
    } catch (e) {
      setError(
        typeof e?.message === 'string'
          ? e.message
          : 'No se pudieron cargar los productos.'
      );
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadProducts();
    }, [loadProducts])
  );

  function resetForm() {
    setNombre('');
    setDescripcion('');
    setPrecioStr('');
    setUnidad('kg');
    setCategoria('verduras');
    setCantidadStr('0');
    setImagenUrl('');
    setEditingId(null);
  }

  function openCreate() {
    resetForm();
    setModalVisible(true);
  }

  function openEdit(item) {
    setEditingId(item._id);
    setNombre(item.nombre || '');
    setDescripcion(item.descripcion || '');
    setPrecioStr(String(item.precio ?? ''));
    setUnidad(item.unidad || 'kg');
    setCategoria(item.categoria || 'otros');
    setCantidadStr(String(item.cantidadDisponible ?? 0));
    setImagenUrl(item.imagenUrl || '');
    setModalVisible(true);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permiso',
        'Necesitamos acceso a la galería para elegir una foto del producto.'
      );
      return;
    }
    // allowsEditing en Android suele devolver el asset sin base64 → sin vista previa ni guardado.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.55,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    const mime = a.mimeType || 'image/jpeg';

    let dataUrl = null;
    if (typeof a.uri === 'string' && a.uri.startsWith('data:')) {
      dataUrl = a.uri;
    } else if (a.base64) {
      dataUrl = `data:${mime};base64,${a.base64}`;
    } else if (a.uri) {
      try {
        const b64 = await FileSystem.readAsStringAsync(a.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        dataUrl = `data:${mime};base64,${b64}`;
      } catch (e) {
        Alert.alert(
          'Imagen',
          'No se pudo leer la foto del dispositivo. Prueba con otra imagen o otro álbum.'
        );
        return;
      }
    }

    if (!dataUrl) {
      Alert.alert('Imagen', 'No se pudo leer la imagen. Prueba con otra foto.');
      return;
    }
    setImagenUrl(dataUrl);
  }

  function closeModal() {
    if (saving) return;
    setModalVisible(false);
    resetForm();
  }

  async function handleSave() {
    const precio = parseFloat(String(precioStr).replace(',', '.'));
    const cantidad = parseInt(String(cantidadStr).replace(/\D/g, ''), 10);
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Escribe cómo se llama tu producto.');
      return;
    }
    if (Number.isNaN(precio) || precio < 0) {
      Alert.alert('Precio', 'Indica un precio válido.');
      return;
    }
    const cantidadOk = Number.isNaN(cantidad) ? 0 : Math.max(0, cantidad);

    const body = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      precio,
      unidad,
      categoria,
      cantidadDisponible: cantidadOk,
      imagenUrl: imagenUrl.trim(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await productApi.updateProduct(editingId, body);
      } else {
        await productApi.createProduct(body);
      }
      setModalVisible(false);
      resetForm();
      await loadProducts();
    } catch (e) {
      Alert.alert(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo guardar.'
      );
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(item) {
    if (!item?._id && !item?.id) {
      alertMessage('Error', 'No se pudo identificar el producto.');
      return;
    }
    setDeleteConfirmItem(item);
  }

  async function handleConfirmDelete() {
    const item = deleteConfirmItem;
    setDeleteConfirmItem(null);
    const id = item?._id ?? item?.id;
    if (!id) return;
    try {
      await productApi.deleteProduct(String(id));
      await loadProducts();
    } catch (e) {
      alertMessage(
        'Error',
        typeof e?.message === 'string' ? e.message : 'No se pudo eliminar.'
      );
    }
  }

  function renderProduct({ item }) {
    return (
      <View style={styles.card}>
        {item.imagenUrl ? (
          <Image
            source={{ uri: item.imagenUrl }}
            style={styles.cardImage}
            accessibilityLabel={`Foto de ${item.nombre}`}
          />
        ) : null}
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.nombre}
          </Text>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{labelCategoria(item.categoria)}</Text>
          </View>
        </View>
        {item.descripcion ? (
          <Text style={styles.cardDesc} numberOfLines={3}>
            {item.descripcion}
          </Text>
        ) : null}
        <Text style={styles.cardPrice}>
          ${formatPrecio(item.precio)} / {labelUnidad(item.unidad)}
        </Text>
        <Text style={styles.cardStock}>
          Disponible: {item.cantidadDisponible ?? 0} ({labelUnidad(item.unidad)})
        </Text>
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.smallBtn, styles.editBtn]}
            onPress={() => openEdit(item)}
            accessibilityLabel="Editar producto"
          >
            <Text style={styles.editBtnText}>Editar</Text>
          </Pressable>
          <Pressable
            style={[styles.smallBtn, styles.delBtn]}
            onPress={() => openDeleteConfirm(item)}
            accessibilityLabel="Eliminar producto"
          >
            <Text style={styles.delBtnText}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.topBar}>
        <Text style={styles.screenHint}>
          Publica lo que vendes. Los compradores lo verán más adelante en el mercado.
        </Text>
        <Pressable
          style={styles.publishBtn}
          onPress={openCreate}
          accessibilityRole="button"
          accessibilityLabel="Publicar producto"
        >
          <Text style={styles.publishBtnText}>＋ Publicar producto</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => loadProducts()}>
            <Text style={styles.retry}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.greenDark} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadProducts();
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🌽</Text>
              <Text style={styles.emptyTitle}>Aún no tienes productos</Text>
              <Text style={styles.emptySub}>
                Pulsa “Publicar producto” para agregar el primero.
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Editar producto' : 'Publicar producto'}
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Nombre del producto</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Maíz amarillo"
                placeholderTextColor="#9E9E9E"
              />

              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Cómo lo cultivas, calidad, zona…"
                placeholderTextColor="#9E9E9E"
                multiline
              />

              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                value={precioStr}
                onChangeText={setPrecioStr}
                placeholder="0.00"
                placeholderTextColor="#9E9E9E"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Unidad de venta</Text>
              <View style={styles.chips}>
                {UNIDADES.map((u) => (
                  <Pressable
                    key={u.key}
                    style={[styles.chip, unidad === u.key && styles.chipOn]}
                    onPress={() => setUnidad(u.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        unidad === u.key && styles.chipTextOn,
                      ]}
                      numberOfLines={1}
                    >
                      {u.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.chips}>
                {CATEGORIAS.map((c) => (
                  <Pressable
                    key={c.key}
                    style={[styles.chip, categoria === c.key && styles.chipOn]}
                    onPress={() => setCategoria(c.key)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoria === c.key && styles.chipTextOn,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Foto del producto (opcional)</Text>
              <View style={styles.imageBlock}>
                {imagenUrl ? (
                  <Image
                    source={{ uri: imagenUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.previewPlaceholder}>
                    <Text style={styles.previewPlaceholderText}>
                      Toca «Elegir de la galería» para añadir foto. Si no subes imagen, el
                      producto se listará solo con texto.
                    </Text>
                  </View>
                )}
                <View style={styles.imageActions}>
                  <Pressable
                    style={styles.imagePickBtn}
                    onPress={pickImage}
                    accessibilityRole="button"
                    accessibilityLabel="Elegir foto del producto"
                  >
                    <Text style={styles.imagePickBtnText}>
                      {imagenUrl ? 'Cambiar foto' : 'Elegir de la galería'}
                    </Text>
                  </Pressable>
                  {imagenUrl ? (
                    <Pressable
                      style={styles.imageRemoveBtn}
                      onPress={() => setImagenUrl('')}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto"
                    >
                      <Text style={styles.imageRemoveBtnText}>Quitar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Text style={styles.label}>Cantidad disponible</Text>
              <TextInput
                style={styles.input}
                value={cantidadStr}
                onChangeText={(t) =>
                  setCantidadStr(t.replace(/\D/g, '').slice(0, 8))
                }
                placeholder="0"
                placeholderTextColor="#9E9E9E"
                keyboardType="number-pad"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelModal]}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelModalText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveModal]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={COLORS.greenDark} />
                ) : (
                  <Text style={styles.saveModalText}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!deleteConfirmItem}
        title="Eliminar producto"
        message={
          deleteConfirmItem
            ? `¿Seguro que quieres quitar "${deleteConfirmItem.nombre}"?`
            : ''
        }
        cancelText="Cancelar"
        confirmText="Eliminar"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmItem(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayLight,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  screenHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
    lineHeight: 20,
  },
  publishBtn: {
    backgroundColor: COLORS.yellow,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  publishBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  errorBox: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
  },
  errorText: { color: COLORS.error, marginBottom: 8 },
  retry: { color: COLORS.greenDark, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.grayLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  catBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.greenDark,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
    lineHeight: 20,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  cardStock: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: COLORS.greenDark,
  },
  editBtnText: {
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  delBtn: {
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  delBtnText: {
    fontWeight: '700',
    color: COLORS.error,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.greenDark,
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.greenDark,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212121',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  chipOn: {
    borderColor: COLORS.greenDark,
    backgroundColor: '#E8F5E9',
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTextOn: {
    color: COLORS.greenDark,
  },
  imageBlock: {
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
  },
  previewPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewPlaceholderText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  imagePickBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: COLORS.greenDark,
    alignItems: 'center',
  },
  imagePickBtnText: {
    fontWeight: '700',
    color: COLORS.greenDark,
    fontSize: 15,
  },
  imageRemoveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
  },
  imageRemoveBtnText: {
    fontWeight: '700',
    color: COLORS.textMuted,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelModal: {
    backgroundColor: COLORS.grayLight,
  },
  cancelModalText: {
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  saveModal: {
    backgroundColor: COLORS.yellow,
  },
  saveModalText: {
    fontWeight: '700',
    color: COLORS.greenDark,
  },
});
