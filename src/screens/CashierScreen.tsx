import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { useCartStore } from '../stores/cartStore';
import { useAppStore } from '../stores/appStore';
import { Product, Category, Transaction, Customer } from '../types';
import { getProducts, findVariantByBarcode } from '../repositories/productRepository';
import { getCategories } from '../repositories/categoryRepository';
import { getCustomers } from '../repositories/customerRepository';
import { saveHeldCart, getHeldCarts, deleteHeldCart, HeldCartRecord } from '../repositories/heldCartRepository';
import { formatRupiah, formatQuantity, parseQuantityInput } from '../utils/format';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from '../components/ReceiptModal';

export const CashierScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isLandscape = width >= 700;
  const insets = useSafeAreaInsets();

  const { profile } = useAppStore();
  const {
    items,
    addItem,
    updateQuantity,
    updateItemDiscount,
    removeItem,
    clearCart,
    customer,
    setCustomer,
    tableNumber,
    setTableNumber,
    discountAmount,
    discountPercent,
    setTransactionDiscount,
    getSubtotal,
    getTotalDiscount,
    getTotal,
    getItemCount,
    restoreCartState,
  } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showWeightQtyModal, setShowWeightQtyModal] = useState(false);

  // Completed transaction
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  // Hold Carts
  const [heldCarts, setHeldCarts] = useState<HeldCartRecord[]>([]);
  const [holdName, setHoldName] = useState('');
  const [holdTable, setHoldTable] = useState('');

  // Customers
  const [customerList, setCustomerList] = useState<Customer[]>([]);

  // Weighted Qty Target
  const [weightTargetProduct, setWeightTargetProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState('1');

  useEffect(() => {
    loadData();
  }, [selectedCatId, searchQuery]);

  const loadData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
      const prods = await getProducts({
        categoryId: selectedCatId || undefined,
        search: searchQuery || undefined,
      });
      setProducts(prods);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBarcodeScanned = async (code: string) => {
    try {
      const match = await findVariantByBarcode(code);
      if (match) {
        if (match.product.is_weighted) {
          setWeightTargetProduct(match.product);
          setWeightInput('1');
          setShowWeightQtyModal(true);
        } else {
          addItem(match.product, match.variant);
        }
      } else {
        Alert.alert('Produk Tidak Ditemukan', `Barcode "${code}" belum terdaftar.`);
      }
    } catch (e: any) {
      Alert.alert('Gagal', e?.message);
    }
  };

  const handleProductPress = (product: Product) => {
    if (product.is_weighted) {
      setWeightTargetProduct(product);
      setWeightInput('1');
      setShowWeightQtyModal(true);
    } else {
      addItem(product);
    }
  };

  const handleConfirmWeightedQty = () => {
    if (!weightTargetProduct) return;
    const grams = parseQuantityInput(weightInput, true);
    if (grams <= 0) {
      Alert.alert('Peringatan', 'Jumlah berat/volume harus lebih dari 0.');
      return;
    }
    addItem(weightTargetProduct, undefined, grams);
    setShowWeightQtyModal(false);
    setWeightTargetProduct(null);
  };

  // Hold Cart Actions
  const handleOpenHoldList = async () => {
    const list = await getHeldCarts();
    setHeldCarts(list);
    setShowHoldModal(true);
  };

  const handleSaveCurrentHold = async () => {
    if (items.length === 0) {
      Alert.alert('Peringatan', 'Keranjang masih kosong.');
      return;
    }
    const name = holdName.trim() || `Pesanan Meja ${holdTable || 'Umum'}`;
    const payload = JSON.stringify({
      items,
      customer,
      tableNumber: holdTable || tableNumber,
      discountPercent,
      discountAmount,
    });
    await saveHeldCart(name, holdTable || tableNumber, payload);
    clearCart();
    setHoldName('');
    setHoldTable('');
    setShowHoldModal(false);
    Alert.alert('Tersimpan', `Pesanan "${name}" berhasil di-hold (simpan sementara).`);
  };

  const handleResumeHold = (held: HeldCartRecord) => {
    try {
      const data = JSON.parse(held.cart_json);
      restoreCartState(data);
      deleteHeldCart(held.id);
      setShowHoldModal(false);
    } catch {
      Alert.alert('Gagal', 'Format data keranjang tidak valid.');
    }
  };

  const handleOpenCustomerSelect = async () => {
    const custs = await getCustomers();
    setCustomerList(custs);
    setShowCustomerModal(true);
  };

  const subtotal = getSubtotal();
  const txDiscount = getTotalDiscount();
  const total = getTotal(profile.tax_percentage, profile.tax_enabled);
  const itemCount = getItemCount();

  /* ---------------------- Render Cart Items ---------------------- */
  const renderCartList = (isDrawer = false) => (
    <View style={styles.cartContainer}>
      <View style={styles.cartHeader}>
        <View>
          <Text style={styles.cartTitle}>Keranjang ({itemCount})</Text>
          {customer ? (
            <Text style={styles.cartCustomerBadge}>Pelanggan: {customer.name}</Text>
          ) : null}
          {tableNumber ? (
            <Text style={styles.cartTableBadge}>Meja: {tableNumber}</Text>
          ) : null}
        </View>

        {items.length > 0 && (
          <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
            <Text style={styles.clearCartText}>Kosongkan</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.cartItemsScroll} contentContainerStyle={styles.cartItemsContent}>
        {items.length === 0 ? (
          <View style={styles.emptyCartBox}>
            <Ionicons name="cart-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyCartText}>Keranjang belanja kosong</Text>
            <Text style={styles.emptyCartSubtext}>Sentuh produk untuk menambahkan</Text>
          </View>
        ) : (
          items.map((item) => {
            const qtyStr = formatQuantity(item.quantity, item.isWeighted, item.unit);
            return (
              <View key={item.variantId} style={styles.cartItemRow}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>
                    {item.productName}
                    {item.variantName && item.variantName !== 'Default' ? ` (${item.variantName})` : ''}
                  </Text>
                  <Text style={styles.cartItemPrice}>
                    {qtyStr} @ {formatRupiah(item.sellPrice)}
                  </Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.qtyControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.isWeighted) {
                        updateQuantity(item.variantId, Math.max(0, item.quantity - 250)); // -250g
                      } else {
                        updateQuantity(item.variantId, item.quantity - 1);
                      }
                    }}
                  >
                    <Ionicons name="remove" size={16} color="#334155" />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>
                    {item.isWeighted
                      ? (item.quantity / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 })
                      : item.quantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.isWeighted) {
                        updateQuantity(item.variantId, item.quantity + 250); // +250g
                      } else {
                        updateQuantity(item.variantId, item.quantity + 1);
                      }
                    }}
                  >
                    <Ionicons name="add" size={16} color="#334155" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cartItemSubtotalBox}>
                  <Text style={styles.cartItemSubtotal}>{formatRupiah(item.subtotal)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Cart Summary & Pay Button */}
      <View style={[styles.cartFooter, isDrawer && { paddingBottom: Math.max(14, insets.bottom + 12) }]}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryVal}>{formatRupiah(subtotal)}</Text>
        </View>

        {txDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.discountVal]}>Diskon</Text>
            <Text style={[styles.summaryVal, styles.discountVal]}>-{formatRupiah(txDiscount)}</Text>
          </View>
        )}

        <View style={[styles.summaryRow, styles.totalSummaryRow]}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalVal}>{formatRupiah(total)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, items.length === 0 && styles.btnDisabled]}
          onPress={() => {
            if (items.length > 0) {
              setShowCartDrawer(false);
              setShowCheckout(true);
            }
          }}
          disabled={items.length === 0}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
          <Text style={styles.checkoutBtnText}>BAYAR ({formatRupiah(total)})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header
        title="Layar Kasir"
        subtitle={profile.business_type.toUpperCase()}
        onBarcodePress={() => setShowBarcodeScanner(true)}
        onHoldPress={handleOpenHoldList}
      />

      <View style={[styles.body, isLandscape ? styles.bodyLandscape : styles.bodyPortrait]}>
        {/* LEFT / MAIN CATALOG PANEL */}
        <View style={[styles.catalogPanel, isLandscape && styles.catalogPanelLandscape]}>
          {/* Search Bar */}
          <View style={styles.searchBarRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari produk atau barcode..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {profile.table_enabled && (
              <TouchableOpacity
                style={styles.tableBtn}
                onPress={() => {
                  Alert.prompt(
                    'Nomor Meja',
                    'Masukkan nomor meja pemesan:',
                    (text) => setTableNumber(text || null),
                    'plain-text',
                    tableNumber || ''
                  );
                }}
              >
                <Ionicons name="restaurant" size={16} color="#1E3A8A" />
                <Text style={styles.tableBtnText}>{tableNumber ? `Meja ${tableNumber}` : '+ Meja'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            <TouchableOpacity
              style={[styles.categoryPill, selectedCatId === null && styles.categoryPillActive]}
              onPress={() => setSelectedCatId(null)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCatId === null && styles.categoryPillTextActive,
                ]}
              >
                Semua ({products.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isActive = selectedCatId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                  onPress={() => setSelectedCatId(cat.id)}
                >
                  <Text
                    style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Product Grid */}
          <ScrollView style={styles.productsScroll} contentContainerStyle={styles.productsGrid}>
            {products.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyProductsTitle}>Belum ada produk</Text>
                <Text style={styles.emptyProductsSub}>
                  Tambah produk melalui menu Produk di bawah.
                </Text>
              </View>
            ) : (
              products.map((prod) => {
                const variant = prod.default_variant || prod.variants?.[0];
                const price = variant?.sell_price || 0;
                const stock = variant?.stock ?? 0;
                const isOutOfStock = prod.track_stock && stock <= 0;

                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[styles.productCard, isOutOfStock && styles.productCardOut]}
                    onPress={() => handleProductPress(prod)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productBadgeRow}>
                      <Text style={styles.productUnitBadge}>{prod.unit.toUpperCase()}</Text>
                      {prod.track_stock && (
                        <Text
                          style={[
                            styles.productStockBadge,
                            stock <= prod.low_stock_threshold && styles.productLowStock,
                          ]}
                        >
                          {prod.is_weighted ? `${stock / 1000} kg` : `Stok: ${stock}`}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.productCardName} numberOfLines={2}>
                      {prod.name}
                    </Text>

                    <Text style={styles.productCardPrice}>{formatRupiah(price)}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        {/* RIGHT CART PANEL (Visible in Landscape) */}
        {isLandscape && (
          <View style={styles.cartPanelLandscape}>
            {renderCartList()}
          </View>
        )}
      </View>

      {/* PORTRAIT BOTTOM FLOATING CART BAR */}
      {!isLandscape && (
        <View style={styles.bottomCartBar}>
          <TouchableOpacity
            style={styles.cartBarInfo}
            onPress={() => setShowCartDrawer(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cartBarBadge}>
              <Ionicons name="cart" size={18} color="#FFFFFF" />
              <Text style={styles.cartBarCount}>{itemCount}</Text>
            </View>
            <View>
              <Text style={styles.cartBarTotal}>{formatRupiah(total)}</Text>
              <Text style={styles.cartBarTap}>Ketuk untuk lihat keranjang</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cartBarPayBtn, items.length === 0 && styles.btnDisabled]}
            onPress={() => {
              if (items.length > 0) setShowCheckout(true);
            }}
            disabled={items.length === 0}
            activeOpacity={0.8}
          >
            <Text style={styles.cartBarPayText}>Bayar</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* PORTRAIT CART DRAWER MODAL */}
      <Modal
        visible={showCartDrawer && !isLandscape}
        animationType="slide"
        onRequestClose={() => setShowCartDrawer(false)}
      >
        <View style={styles.drawerContainer}>
          <View style={[styles.drawerHeader, { paddingTop: Math.max(14, insets.top + 8) }]}>
            <Text style={styles.drawerTitle}>Rincian Keranjang</Text>
            <TouchableOpacity onPress={() => setShowCartDrawer(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={26} color="#0F172A" />
            </TouchableOpacity>
          </View>
          {renderCartList(true)}
        </View>
      </Modal>

      {/* WEIGHTED QUANTITY MODAL (Untuk Toko Buah, Sayur, Curah) */}
      <Modal visible={showWeightQtyModal} transparent animationType="fade">
        <View style={styles.weightModalOverlay}>
          <View style={styles.weightModalCard}>
            <Text style={styles.weightModalTitle}>
              Jumlah Berat / Volume ({weightTargetProduct?.name})
            </Text>
            <Text style={styles.weightModalDesc}>
              Masukkan berat dalam kilogram (contoh: 0.5 untuk setengah kg):
            </Text>

            <TextInput
              style={styles.weightInput}
              keyboardType="decimal-pad"
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder="0.0"
              autoFocus
            />

            <View style={styles.weightQuickButtons}>
              {['0.25', '0.5', '1', '1.5', '2'].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={styles.weightQuickBtn}
                  onPress={() => setWeightInput(val)}
                >
                  <Text style={styles.weightQuickBtnText}>{val} kg</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.weightModalActions}>
              <TouchableOpacity
                style={styles.weightCancelBtn}
                onPress={() => setShowWeightQtyModal(false)}
              >
                <Text style={styles.weightCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.weightConfirmBtn}
                onPress={handleConfirmWeightedQty}
              >
                <Text style={styles.weightConfirmText}>Masukkan Keranjang</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* HOLD / OPEN BILLS MODAL */}
      <Modal visible={showHoldModal} transparent animationType="slide">
        <View style={styles.weightModalOverlay}>
          <View style={styles.holdModalCard}>
            <View style={styles.holdHeader}>
              <Text style={styles.holdTitle}>Daftar Pesanan Sementara (Hold)</Text>
              <TouchableOpacity onPress={() => setShowHoldModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {items.length > 0 && (
              <View style={styles.holdSaveSection}>
                <Text style={styles.holdSaveLabel}>Simpan Keranjang Ini:</Text>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="Catatan / Nama Pelanggan"
                  value={holdName}
                  onChangeText={setHoldName}
                />
                <TextInput
                  style={styles.inputSmall}
                  placeholder="Nomor Meja (opsional)"
                  value={holdTable}
                  onChangeText={setHoldTable}
                />
                <TouchableOpacity style={styles.saveHoldBtn} onPress={handleSaveCurrentHold}>
                  <Text style={styles.saveHoldBtnText}>+ Hold Keranjang Saat Ini</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.heldListLabel}>Pesanan Tersimpan:</Text>
            <ScrollView style={styles.heldListScroll}>
              {heldCarts.length === 0 ? (
                <Text style={styles.noHeldText}>Tidak ada pesanan yang di-hold saat ini.</Text>
              ) : (
                heldCarts.map((h) => (
                  <View key={h.id} style={styles.heldRow}>
                    <View style={styles.heldInfo}>
                      <Text style={styles.heldName}>{h.name}</Text>
                      {h.table_number && <Text style={styles.heldTable}>Meja {h.table_number}</Text>}
                    </View>
                    <TouchableOpacity
                      style={styles.resumeBtn}
                      onPress={() => handleResumeHold(h)}
                    >
                      <Text style={styles.resumeBtnText}>Lanjutkan</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SELECT CUSTOMER MODAL */}
      <Modal visible={showCustomerModal} transparent animationType="slide">
        <View style={styles.weightModalOverlay}>
          <View style={styles.customerModalCard}>
            <View style={styles.holdHeader}>
              <Text style={styles.holdTitle}>Pilih Pelanggan</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.clearCustomerBtn}
              onPress={() => {
                setCustomer(null);
                setShowCustomerModal(false);
              }}
            >
              <Text style={styles.clearCustomerText}>Hapus Pelanggan (Pelanggan Umum)</Text>
            </TouchableOpacity>

            <ScrollView style={styles.customerListScroll}>
              {customerList.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.customerItemRow}
                  onPress={() => {
                    setCustomer(c);
                    setShowCustomerModal(false);
                  }}
                >
                  <View>
                    <Text style={styles.customerItemName}>{c.name}</Text>
                    {c.phone ? <Text style={styles.customerItemPhone}>{c.phone}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onScan={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />

      {/* CHECKOUT MODAL */}
      <CheckoutModal
        visible={showCheckout}
        onClose={() => setShowCheckout(false)}
        onSuccess={(tx) => {
          setLastTransaction(tx);
          setShowReceipt(true);
        }}
        onSelectCustomerPress={handleOpenCustomerSelect}
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        visible={showReceipt}
        transaction={lastTransaction}
        onClose={() => {
          setShowReceipt(false);
          setLastTransaction(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  body: {
    flex: 1,
  },
  bodyLandscape: {
    flexDirection: 'row',
  },
  bodyPortrait: {
    flexDirection: 'column',
  },
  catalogPanel: {
    flex: 1,
    padding: 12,
  },
  catalogPanelLandscape: {
    flex: 0.62,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  cartPanelLandscape: {
    flex: 0.38,
    backgroundColor: '#FFFFFF',
  },
  searchBarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
  tableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tableBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  categoryScroll: {
    maxHeight: 40,
    marginBottom: 10,
  },
  categoryContent: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  categoryPillActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  productsScroll: {
    flex: 1,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 80,
  },
  emptyProducts: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  emptyProductsSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  productCard: {
    width: '31%',
    minWidth: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  productCardOut: {
    opacity: 0.5,
  },
  productBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productUnitBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productStockBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  productLowStock: {
    color: '#EF4444',
  },
  productCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    minHeight: 34,
  },
  productCardPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
    marginTop: 4,
  },
  cartContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    display: 'flex',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartCustomerBadge: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  cartTableBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearCartText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  cartItemsScroll: {
    flex: 1,
  },
  cartItemsContent: {
    padding: 12,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyCartText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  emptyCartSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemSubtotalBox: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  cartItemSubtotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  discountVal: {
    color: '#DC2626',
  },
  totalSummaryRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 6,
    marginTop: 4,
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
  },
  cartBarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartBarBadge: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBarCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  cartBarTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cartBarTap: {
    color: '#94A3B8',
    fontSize: 10,
  },
  cartBarPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cartBarPayText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  weightModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  weightModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  weightModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  weightModalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  weightInput: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
  },
  weightQuickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  weightQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  weightQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  weightModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  weightCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  weightCancelText: {
    color: '#475569',
    fontWeight: '700',
  },
  weightConfirmBtn: {
    flex: 1.5,
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  weightConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  holdModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  holdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  holdTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  holdSaveSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  holdSaveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputSmall: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
    marginBottom: 6,
  },
  saveHoldBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveHoldBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  heldListLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  heldListScroll: {
    maxHeight: 200,
  },
  noHeldText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 16,
  },
  heldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  heldInfo: {
    flex: 1,
  },
  heldName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  heldTable: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  resumeBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  customerModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    maxHeight: '75%',
  },
  clearCustomerBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    marginBottom: 10,
  },
  clearCustomerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  customerListScroll: {
    maxHeight: 260,
  },
  customerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  customerItemPhone: {
    fontSize: 11,
    color: '#64748B',
  },
});
