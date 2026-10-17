import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Transaction } from '../types';
import { useAppStore } from '../stores/appStore';
import { formatRupiah, formatDateTime, formatQuantity } from '../utils/format';
import { printReceipt, shareReceiptPdf, shareReceiptWhatsApp } from '../utils/receipt';
import {
  printReceiptBluetooth,
  getPairedPrinters,
  BluetoothPrinterDevice,
  getDefaultPrinter,
  saveDefaultPrinter,
} from '../utils/bluetoothPrinter';

interface ReceiptModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { profile } = useAppStore();

  // Bluetooth Printer states
  const [showPrinterSelector, setShowPrinterSelector] = React.useState(false);
  const [pairedPrinters, setPairedPrinters] = React.useState<BluetoothPrinterDevice[]>([]);
  const [isPrintingBt, setIsPrintingBt] = React.useState(false);

  if (!transaction) return null;

  const handlePrintSystem = async () => {
    try {
      await printReceipt(transaction, profile);
    } catch (e: any) {
      Alert.alert('Gagal Mencetak', e?.message || 'Pastikan printer terhubung.');
    }
  };

  const handlePrintBluetoothDirect = async () => {
    try {
      const defaultAddr = await getDefaultPrinter();
      if (!defaultAddr) {
        // Belum ada printer tersimpan, buka pemilih printer
        await openPrinterSelector();
        return;
      }
      setIsPrintingBt(true);
      await printReceiptBluetooth(transaction, profile, defaultAddr);
      setIsPrintingBt(false);
      Alert.alert('Sukses', 'Struk berhasil dikirim ke printer Bluetooth.');
    } catch (e: any) {
      setIsPrintingBt(false);
      Alert.alert(
        'Printer Bluetooth',
        `${e?.message || 'Gagal mencetak'}\n\nIngin memilih ulang printer Bluetooth?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Pilih Printer', onPress: openPrinterSelector },
        ]
      );
    }
  };

  const openPrinterSelector = async () => {
    try {
      const printers = await getPairedPrinters();
      if (printers.length === 0) {
        Alert.alert(
          'Tidak Ada Printer Terpasang',
          'Pastikan printer thermal Bluetooth Anda sudah di-pairing di Pengaturan Bluetooth HP Android Anda.'
        );
        return;
      }
      setPairedPrinters(printers);
      setShowPrinterSelector(true);
    } catch (e: any) {
      Alert.alert('Gagal Memindai Bluetooth', e?.message);
    }
  };

  const handleSelectPrinter = async (device: BluetoothPrinterDevice) => {
    setShowPrinterSelector(false);
    await saveDefaultPrinter(device.address);
    try {
      setIsPrintingBt(true);
      await printReceiptBluetooth(transaction, profile, device.address);
      setIsPrintingBt(false);
      Alert.alert('Sukses', `Berhasil mencetak ke ${device.name}`);
    } catch (e: any) {
      setIsPrintingBt(false);
      Alert.alert('Gagal Cetak', e?.message);
    }
  };

  const handleSharePdf = async () => {
    try {
      await shareReceiptPdf(transaction, profile);
    } catch (e: any) {
      Alert.alert('Gagal Membagikan', e?.message || 'Terjadi kesalahan saat membuat file struk.');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      await shareReceiptWhatsApp(transaction, profile);
    } catch (e: any) {
      Alert.alert('Gagal Membagikan', e?.message || 'Aplikasi WhatsApp tidak dapat dibuka.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(16, insets.top + 8),
            paddingBottom: Math.max(16, insets.bottom + 8),
          },
        ]}
      >
        <View style={styles.card}>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <Text style={styles.topTitle}>Struk Transaksi</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Receipt Paper Simulation */}
          <ScrollView style={styles.paperScroll} contentContainerStyle={styles.paperContent}>
            <View style={styles.receiptPaper}>
              {transaction.status === 'void' && (
                <View style={styles.voidBadge}>
                  <Text style={styles.voidText}>*** VOID / DIBATALKAN ***</Text>
                  {transaction.void_reason ? (
                    <Text style={styles.voidReason}>Alasan: {transaction.void_reason}</Text>
                  ) : null}
                </View>
              )}

              {profile.logo_image_uri ? (
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: profile.logo_image_uri }}
                    style={styles.storeLogo}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              <Text style={styles.storeName}>{profile.name}</Text>
              {profile.address ? <Text style={styles.storeAddress}>{profile.address}</Text> : null}
              {profile.phone ? <Text style={styles.storePhone}>Telp: {profile.phone}</Text> : null}

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>No: {transaction.invoice_number}</Text>
                <Text style={styles.metaText}>{formatDateTime(transaction.created_at)}</Text>
              </View>

              {transaction.customer_name && (
                <Text style={styles.metaText}>Pelanggan: {transaction.customer_name}</Text>
              )}
              {transaction.table_number && (
                <Text style={styles.metaText}>Meja: {transaction.table_number}</Text>
              )}

              <View style={styles.divider} />

              {/* Items */}
              {transaction.items?.map((item, idx) => (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.product_name}
                      {item.variant_name && item.variant_name !== 'Default' ? ` (${item.variant_name})` : ''}
                    </Text>
                    <Text style={styles.itemQtyPrice}>
                      {formatQuantity(item.quantity, item.is_weighted, item.unit)} @ {formatRupiah(item.sell_price)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>{formatRupiah(item.subtotal)}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              {/* Summary */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatRupiah(transaction.subtotal)}</Text>
              </View>

              {transaction.discount_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.discountText]}>Diskon</Text>
                  <Text style={[styles.summaryValue, styles.discountText]}>
                    -{formatRupiah(transaction.discount_amount)}
                  </Text>
                </View>
              )}

              {transaction.tax_amount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>PPN ({profile.tax_percentage}%)</Text>
                  <Text style={styles.summaryValue}>{formatRupiah(transaction.tax_amount)}</Text>
                </View>
              )}

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{formatRupiah(transaction.total_amount)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bayar ({transaction.payment_method.toUpperCase()})</Text>
                <Text style={styles.summaryValue}>{formatRupiah(transaction.paid_amount)}</Text>
              </View>

              {transaction.payment_method === 'cash' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Kembalian</Text>
                  <Text style={styles.summaryValue}>{formatRupiah(transaction.change_amount)}</Text>
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.footerNote}>{profile.footer_note || 'Terima kasih atas kunjungan Anda!'}</Text>
              <Text style={styles.watermark}>Kasirhan POS Offline</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.btPrintBtn, isPrintingBt && styles.btnDisabled]}
              onPress={handlePrintBluetoothDirect}
              disabled={isPrintingBt}
            >
              <Ionicons name="bluetooth" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>
                {isPrintingBt ? 'Mencetak...' : 'Thermal BT'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.printBtn]} onPress={handlePrintSystem}>
              <Ionicons name="print-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Sistem</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.waBtn]} onPress={handleShareWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.pdfBtn]} onPress={handleSharePdf}>
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* SELECT PRINTER BLUETOOTH MODAL */}
      <Modal visible={showPrinterSelector} transparent animationType="fade" onRequestClose={() => setShowPrinterSelector(false)}>
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorCard}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Pilih Printer Thermal Bluetooth</Text>
              <TouchableOpacity onPress={() => setShowPrinterSelector(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.selectorSub}>
              Pilih printer thermal yang sudah tersambung (paired) ke HP Anda:
            </Text>

            <ScrollView style={styles.printerList}>
              {pairedPrinters.map((item) => (
                <TouchableOpacity
                  key={item.address}
                  style={styles.printerItem}
                  onPress={() => handleSelectPrinter(item)}
                >
                  <Ionicons name="print" size={22} color="#1E3A8A" />
                  <View style={styles.printerItemInfo}>
                    <Text style={styles.printerItemName}>{item.name}</Text>
                    <Text style={styles.printerItemAddress}>{item.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelSelectorBtn}
              onPress={() => setShowPrinterSelector(false)}
            >
              <Text style={styles.cancelSelectorText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  paperScroll: {
    flex: 1,
  },
  paperContent: {
    padding: 16,
    alignItems: 'center',
  },
  receiptPaper: {
    width: 290,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  voidBadge: {
    borderWidth: 2,
    borderColor: '#DC2626',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  voidText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  voidReason: {
    color: '#991B1B',
    fontSize: 11,
    marginTop: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0F172A',
  },
  storeAddress: {
    fontSize: 11,
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  storePhone: {
    fontSize: 11,
    textAlign: 'center',
    color: '#475569',
  },
  divider: {
    height: 1,
    borderBottomWidth: 1,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemQtyPrice: {
    fontSize: 10,
    color: '#64748B',
  },
  itemSubtotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#475569',
  },
  summaryValue: {
    fontSize: 11,
    color: '#1E293B',
  },
  discountText: {
    color: '#DC2626',
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  footerNote: {
    fontSize: 11,
    textAlign: 'center',
    color: '#475569',
    marginTop: 4,
  },
  watermark: {
    fontSize: 9,
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  printBtn: {
    backgroundColor: '#3B82F6',
  },
  btPrintBtn: {
    backgroundColor: '#1E3A8A',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  waBtn: {
    backgroundColor: '#16A34A',
  },
  pdfBtn: {
    backgroundColor: '#0284C7',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  selectorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  selectorSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  printerList: {
    maxHeight: 220,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  printerItemInfo: {
    flex: 1,
  },
  printerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  printerItemAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cancelSelectorBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  cancelSelectorText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
});
