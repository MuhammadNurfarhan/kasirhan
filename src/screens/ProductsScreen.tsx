import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Switch,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Header } from '../components/Header';
import { Product, ProductVariant, Category, ProductUnit } from '../types';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} from '../repositories/productRepository';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '../repositories/categoryRepository';
import { formatRupiah, formatQuantity } from '../utils/format';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

export const ProductsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Editing Product State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [unit, setUnit] = useState<ProductUnit>('pcs');
  const [isWeighted, setIsWeighted] = useState(false);
  const [trackStock, setTrackStock] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [sellPrice, setSellPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [initialStock, setInitialStock] = useState('');
  const [barcode, setBarcode] = useState('');

  // Multi-variants (v1.1 F-12)
  const [hasVariants, setHasVariants] = useState(false);
  const [variantsList, setVariantsList] = useState<
    Array<{ name: string; sell_price: string; cost_price: string; stock: string; barcode: string }>
  >([]);

  // Restock target
  const [targetVariant, setTargetVariant] = useState<ProductVariant | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockNote, setRestockNote] = useState('');

  // New category name
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCatId, search]);

  const loadData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
      const prods = await getProducts({
        categoryId: selectedCatId || undefined,
        search: search || undefined,
      });
      setProducts(prods);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi membutuhkan izin akses galeri foto untuk memilih gambar produk.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        const ext = pickedAsset.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const targetUri = `${FileSystem.documentDirectory}product_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({
          from: pickedAsset.uri,
          to: targetUri,
        });
        setImageUri(targetUri);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e?.message || 'Terjadi kesalahan saat membuka galeri foto.');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setName('');
    setImageUri(null);
    setCategoryId(categories[0]?.id || null);
    setUnit('pcs');
    setIsWeighted(false);
    setTrackStock(true);
    setLowStockThreshold('5');
    setSellPrice('');
    setCostPrice('');
    setInitialStock('0');
    setBarcode('');
    setHasVariants(false);
    setVariantsList([]);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setImageUri(prod.image_uri || null);
    setCategoryId(prod.category_id);
    setUnit(prod.unit);
    setIsWeighted(prod.is_weighted);
    setTrackStock(prod.track_stock);
    setLowStockThreshold(prod.low_stock_threshold.toString());

    const defVar = prod.default_variant || prod.variants?.[0];
    setSellPrice(defVar?.sell_price.toString() || '0');
    setCostPrice(defVar?.cost_price.toString() || '0');
    setInitialStock(defVar?.stock.toString() || '0');
    setBarcode(defVar?.barcode || '');

    if (prod.variants && prod.variants.length > 1) {
      setHasVariants(true);
      setVariantsList(
        prod.variants.map((v) => ({
          name: v.name,
          sell_price: v.sell_price.toString(),
          cost_price: v.cost_price.toString(),
          stock: v.stock.toString(),
          barcode: v.barcode || '',
        }))
      );
    } else {
      setHasVariants(false);
      setVariantsList([]);
    }

    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      Alert.alert('Peringatan', 'Nama produk wajib diisi.');
      return;
    }

    try {
      const variantsData = hasVariants && variantsList.length > 0
        ? variantsList.map((v, i) => ({
            name: v.name.trim() || `Varian ${i + 1}`,
            sell_price: parseFloat(v.sell_price) || 0,
            cost_price: parseFloat(v.cost_price) || 0,
            stock: parseFloat(v.stock) || 0,
            barcode: v.barcode.trim() || null,
            is_default: i === 0,
          }))
        : [
            {
              name: 'Default',
              sell_price: parseFloat(sellPrice) || 0,
              cost_price: parseFloat(costPrice) || 0,
              stock: isWeighted
                ? Math.round((parseFloat(initialStock) || 0) * 1000)
                : Math.round(parseFloat(initialStock) || 0),
              barcode: barcode.trim() || null,
              is_default: true,
            },
          ];

      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name,
          category_id: categoryId,
          unit,
          is_weighted: isWeighted,
          track_stock: trackStock,
          low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
          image_uri: imageUri,
          variants: variantsData,
        });
        Alert.alert('Sukses', 'Produk berhasil diperbarui.');
      } else {
        await createProduct({
          name,
          category_id: categoryId,
          unit,
          is_weighted: isWeighted,
          track_stock: trackStock,
          low_stock_threshold: parseInt(lowStockThreshold, 10) || 5,
          image_uri: imageUri,
          variants: variantsData,
        });
        Alert.alert('Sukses', 'Produk berhasil ditambahkan.');
      }

      setShowProductModal(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Terjadi kesalahan saat menyimpan produk.');
    }
  };

  const handleDeleteProduct = (prod: Product) => {
    Alert.alert('Konfirmasi Hapus', `Hapus produk "${prod.name}" dari katalog?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(prod.id);
          loadData();
        },
      },
    ]);
  };

  const handleOpenRestock = (variant: ProductVariant) => {
    setTargetVariant(variant);
    setRestockQty('');
    setRestockCost(variant.cost_price.toString());
    setRestockNote('Restok masuk');
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async () => {
    if (!targetVariant) return;
    const qty = parseFloat(restockQty) || 0;
    const cost = parseFloat(restockCost) || 0;
    if (qty <= 0) {
      Alert.alert('Peringatan', 'Jumlah restok harus lebih dari 0.');
      return;
    }

    try {
      await adjustStock(targetVariant.id, 'in', qty, cost, restockNote);
      Alert.alert('Sukses', 'Stok dan HPP (Moving Average) berhasil diperbarui.');
      setShowRestockModal(false);
      loadData();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    await createCategory(newCatName.trim());
    setNewCatName('');
    const cats = await getCategories();
    setCategories(cats);
  };

  const handleDeleteCategory = async (catId: string) => {
    await deleteCategory(catId);
    const cats = await getCategories();
    setCategories(cats);
    if (selectedCatId === catId) setSelectedCatId(null);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Manajemen Produk"
        subtitle={`${products.length} Produk`}
        onBarcodePress={() => setShowBarcodeScanner(true)}
      />

      {/* Top Action & Search Bar */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama, SKU atau barcode..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreateProduct}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Produk</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.categoryManageBtn}
          onPress={() => setShowCategoryModal(true)}
        >
          <Ionicons name="pricetags" size={18} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      {/* Category Pills Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catScrollContent}
      >
        <TouchableOpacity
          style={[styles.catPill, selectedCatId === null && styles.catPillActive]}
          onPress={() => setSelectedCatId(null)}
        >
          <Text style={[styles.catPillText, selectedCatId === null && styles.catPillTextActive]}>
            Semua ({products.length})
          </Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catPill, selectedCatId === c.id && styles.catPillActive]}
            onPress={() => setSelectedCatId(c.id)}
          >
            <Text style={[styles.catPillText, selectedCatId === c.id && styles.catPillTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product List with FlashList */}
      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Belum ada produk ditemukan</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            data={products}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item: prod }) => {
              const defVar = prod.default_variant || prod.variants?.[0];
              const stock = defVar?.stock ?? 0;
              const isLow = prod.track_stock && stock <= prod.low_stock_threshold;

              return (
                <View style={styles.prodCard}>
                  <View style={styles.prodMain}>
                    {prod.image_uri ? (
                      <Image source={{ uri: prod.image_uri }} style={styles.prodThumbImage} />
                    ) : (
                      <View style={styles.prodThumbPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      </View>
                    )}

                    <View style={styles.prodInfo}>
                      <Text style={styles.prodName}>{prod.name}</Text>
                      <View style={styles.prodMetaRow}>
                        <Text style={styles.prodCategoryBadge}>
                          {prod.category_name || 'Tanpa Kategori'}
                        </Text>
                        <Text style={styles.prodUnitBadge}>{prod.unit.toUpperCase()}</Text>
                        {prod.is_weighted && (
                          <Text style={styles.weightedBadge}>Jual per Kg/Liter</Text>
                        )}
                      </View>
                      <View style={styles.priceRow}>
                        <Text style={styles.sellPriceText}>
                          Jual: {formatRupiah(defVar?.sell_price)}
                        </Text>
                        <Text style={styles.costPriceText}>
                          HPP: {formatRupiah(defVar?.cost_price)}
                        </Text>
                      </View>
                    </View>

                    {/* Stock & Action buttons */}
                    <View style={styles.stockCol}>
                      {prod.track_stock ? (
                        <View style={[styles.stockBadge, isLow && styles.stockBadgeLow]}>
                          <Text style={[styles.stockText, isLow && styles.stockTextLow]}>
                            {formatQuantity(stock, prod.is_weighted, prod.unit)}
                          </Text>
                          <Text style={styles.stockLabel}>Stok</Text>
                        </View>
                      ) : (
                        <View style={styles.stockBadgeNoTrack}>
                          <Text style={styles.stockTextNoTrack}>Jasa / No-stok</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Bottom Card Actions */}
                  <View style={styles.cardActions}>
                    {prod.track_stock && defVar && (
                      <TouchableOpacity
                        style={styles.restockBtn}
                        onPress={() => handleOpenRestock(defVar)}
                      >
                        <Ionicons name="add-circle-outline" size={16} color="#059669" />
                        <Text style={styles.restockBtnText}>+ Restok / HPP</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => handleOpenEditProduct(prod)}
                    >
                      <Ionicons name="create-outline" size={16} color="#1E3A8A" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteProduct(prod)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      <Modal visible={showProductModal} animationType="slide" onRequestClose={() => setShowProductModal(false)}>
        <View style={styles.modalSafe}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(14, insets.top + 8) }]}>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Ionicons name="close" size={26} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={[styles.modalBodyContent, { paddingBottom: Math.max(40, insets.bottom + 20) }]}>
            {/* Foto Produk (Opsional) */}
            <Text style={styles.inputLabel}>Foto Produk (Opsional)</Text>
            <View style={styles.imagePickerSection}>
              {imageUri ? (
                <View style={styles.previewImageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <View style={styles.imageActionButtons}>
                    <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage} activeOpacity={0.8}>
                      <Ionicons name="camera-reverse" size={16} color="#FFFFFF" />
                      <Text style={styles.changeImageBtnText}>Ganti</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage} activeOpacity={0.8}>
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                      <Text style={styles.removeImageBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadPlaceholder} onPress={handlePickImage} activeOpacity={0.7}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons name="camera-outline" size={26} color="#1E3A8A" />
                  </View>
                  <Text style={styles.uploadPlaceholderText}>+ Pilih Foto dari Galeri</Text>
                  <Text style={styles.uploadPlaceholderSub}>Format JPG/PNG, ukuran fleksibel</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.inputLabel}>Nama Produk *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Kopi Susu Gula Aren / Beras Rojo Lele"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catSelectPill, categoryId === c.id && styles.catSelectPillActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.catSelectText, categoryId === c.id && styles.catSelectTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Satuan Jual</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectRow}>
              {(['pcs', 'porsi', 'cup', 'box', 'lembar', 'kg', 'liter', 'gram'] as ProductUnit[]).map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.catSelectPill, unit === u && styles.catSelectPillActive]}
                  onPress={() => {
                    setUnit(u);
                    if (u === 'kg' || u === 'liter') setIsWeighted(true);
                  }}
                >
                  <Text style={[styles.catSelectText, unit === u && styles.catSelectTextActive]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Weight Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Jual per Berat / Volume Curah</Text>
                <Text style={styles.switchSubtitle}>
                  Aktifkan jika produk ditimbang (input desimal di kasir, misal 0.5 kg).
                </Text>
              </View>
              <Switch value={isWeighted} onValueChange={setIsWeighted} />
            </View>

            {/* Track Stock Switch */}
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Kelola Inventori / Stok</Text>
                <Text style={styles.switchSubtitle}>
                  Nonaktifkan untuk produk layanan jasa atau makanan siap saji tanpa stok.
                </Text>
              </View>
              <Switch value={trackStock} onValueChange={setTrackStock} />
            </View>

            {/* Single Variant Input */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Harga Jual (Rp) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={sellPrice}
                onChangeText={setSellPrice}
              />

              <Text style={styles.inputLabel}>Harga Modal / HPP (Rp)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={costPrice}
                onChangeText={setCostPrice}
              />

              {trackStock && (
                <>
                  <Text style={styles.inputLabel}>
                    Stok Awal ({isWeighted ? 'Kg / Liter' : unit})
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={initialStock}
                    onChangeText={setInitialStock}
                  />

                  <Text style={styles.inputLabel}>Batas Peringatan Stok Menipis</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={lowStockThreshold}
                    onChangeText={setLowStockThreshold}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Barcode / SKU (Opsional)</Text>
              <View style={styles.barcodeInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Scan atau ketik barcode..."
                  placeholderTextColor="#94A3B8"
                  value={barcode}
                  onChangeText={setBarcode}
                />
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setShowBarcodeScanner(true)}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleSaveProduct}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveSubmitText}>Simpan Produk</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* RESTOCK / MOVING AVERAGE HPP MODAL */}
      <Modal visible={showRestockModal} transparent animationType="fade">
        <View style={styles.restockOverlay}>
          <View style={styles.restockCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Restok & Hitung Ulang HPP</Text>
              <TouchableOpacity onPress={() => setShowRestockModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.restockSub}>
              Sistem akan menghitung HPP baru menggunakan metode Rata-Rata Bergerak (Moving Average).
            </Text>

            <Text style={styles.inputLabel}>Jumlah Masuk:</Text>
            <TextInput
              style={styles.input}
              placeholder="Jumlah..."
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={restockQty}
              onChangeText={setRestockQty}
              autoFocus
            />

            <Text style={styles.inputLabel}>Harga Beli / Modal Masuk (Rp per unit):</Text>
            <TextInput
              style={styles.input}
              placeholder="Harga beli..."
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={restockCost}
              onChangeText={setRestockCost}
            />

            <Text style={styles.inputLabel}>Catatan (Opsional):</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Belanja Grosir Pasar"
              placeholderTextColor="#94A3B8"
              value={restockNote}
              onChangeText={setRestockNote}
            />

            <TouchableOpacity style={styles.saveSubmitBtn} onPress={handleConfirmRestock}>
              <Text style={styles.saveSubmitText}>Simpan & Perbarui Stok</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CATEGORY MANAGEMENT MODAL */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.restockOverlay}>
          <View style={styles.restockCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kelola Kategori</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.addCatRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nama kategori baru..."
                placeholderTextColor="#94A3B8"
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <TouchableOpacity style={styles.addCatSubmit} onPress={handleCreateCategory}>
                <Text style={styles.addCatSubmitText}>Tambah</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.catManageList}>
              {categories.map((c) => (
                <View key={c.id} style={styles.catManageRow}>
                  <Text style={styles.catManageName}>{c.name}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCategory(c.id)}>
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onScan={(code) => {
          setBarcode(code);
          setShowBarcodeScanner(false);
        }}
        onClose={() => setShowBarcodeScanner(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  categoryManageBtn: {
    backgroundColor: '#DBEAFE',
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catScroll: {
    maxHeight: 44,
    backgroundColor: '#FFFFFF',
  },
  catScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  catPillActive: {
    backgroundColor: '#1E3A8A',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 10,
  },
  prodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  prodMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prodInfo: {
    flex: 1,
  },
  prodName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  prodMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  prodCategoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prodUnitBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  weightedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sellPriceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  costPriceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stockCol: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  stockBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  stockBadgeLow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  stockText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  stockTextLow: {
    color: '#DC2626',
  },
  stockLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  stockBadgeNoTrack: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stockTextNoTrack: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  restockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  restockBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 8,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  catSelectRow: {
    gap: 8,
    marginBottom: 8,
  },
  catSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  catSelectPillActive: {
    backgroundColor: '#1E3A8A',
  },
  catSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catSelectTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 6,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  formSection: {
    marginTop: 6,
  },
  barcodeInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scanBtn: {
    backgroundColor: '#1E3A8A',
    width: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  saveSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  restockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  restockCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  restockSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  addCatRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  addCatSubmit: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addCatSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  catManageList: {
    maxHeight: 240,
  },
  catManageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catManageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  prodThumbImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  prodThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePickerSection: {
    marginBottom: 14,
  },
  uploadPlaceholder: {
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadPlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  uploadPlaceholderSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewImageContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginBottom: 10,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  changeImageBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  removeImageBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
