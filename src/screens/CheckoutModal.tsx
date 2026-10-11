import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCartStore } from '../stores/cartStore';
import { useAppStore } from '../stores/appStore';
import { Customer, Transaction } from '../types';
import { formatRupiah } from '../utils/format';
import { QuickCashButtons } from '../components/QuickCashButtons';
import { createTransaction } from '../repositories/transactionRepository';

interface CheckoutModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tx: Transaction) => void;
  onSelectCustomerPress: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onSelectCustomerPress,
}) => {
  const insets = useSafeAreaInsets();
  const { profile } = useAppStore();
  const {
    items,
    customer,
    tableNumber,
    note,
    discountPercent,
    discountAmount,
    getSubtotal,
    getTotalDiscount,
    getTaxAmount,
    getTotal,
    clearCart,
  } = useCartStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debt'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [debtDownPayment, setDebtDownPayment] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getSubtotal();
  const txDiscount = getTotalDiscount();
  const tax = getTaxAmount(profile.tax_percentage, profile.tax_enabled);
  const total = getTotal(profile.tax_percentage, profile.tax_enabled);

  const tenderedNumber = parseFloat(cashTendered.replace(/\./g, '')) || 0;
  const changeAmount = Math.max(0, tenderedNumber - total);

  const handleSelectQuickCash = (amount: number) => {
    setCashTendered(amount.toString());
  };

  const handleCompletePayment = async () => {
    if (items.length === 0) {
      Alert.alert('Peringatan', 'Keranjang masih kosong.');
      return;
    }

    if (paymentMethod === 'cash' && tenderedNumber < total) {
      Alert.alert(
        'Uang Kurang',
        `Jumlah uang tunai diterima (${formatRupiah(tenderedNumber)}) kurang dari total tagihan (${formatRupiah(total)}).`
      );
      return;
    }

    if (paymentMethod === 'debt' && !customer) {
      Alert.alert(
        'Pilih Pelanggan',
        'Pembayaran kasbon / piutang wajib memilih pelanggan yang terdaftar.'
      );
      return;
    }

    setIsProcessing(true);
    try {
      const dp = parseFloat(debtDownPayment.replace(/\./g, '')) || 0;
      const paid =
        paymentMethod === 'cash'
          ? tenderedNumber
          : paymentMethod === 'qris'
          ? total
          : dp;

      const tx = await createTransaction({
        customerId: customer?.id || null,
        customerName: customer?.name || null,
        tableNumber: tableNumber || null,
        paymentMethod,
        items,
        subtotal,
        discountPercent,
        discountAmount: txDiscount,
        taxAmount: tax,
        totalAmount: total,
        paidAmount: paid,
        changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
        note,
        dueDate: paymentMethod === 'debt' ? dueDate || null : null,
      });

      clearCart();
      setIsProcessing(false);
      onClose();
      onSuccess(tx);
    } catch (e: any) {
      setIsProcessing(false);
      Alert.alert('Transaksi Gagal', e?.message || 'Terjadi kesalahan saat memproses pembayaran.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Pembayaran</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Total Summary Header */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>TOTAL PEMBAYARAN</Text>
              <Text style={styles.totalValue}>{formatRupiah(total)}</Text>
              <View style={styles.detailSummaryRow}>
                <Text style={styles.detailSummaryText}>Subtotal: {formatRupiah(subtotal)}</Text>
                {txDiscount > 0 && (
                  <Text style={[styles.detailSummaryText, styles.discountText]}>
                    Diskon: -{formatRupiah(txDiscount)}
                  </Text>
                )}
                {tax > 0 && (
                  <Text style={styles.detailSummaryText}>
                    PPN ({profile.tax_percentage}%): {formatRupiah(tax)}
                  </Text>
                )}
              </View>
            </View>

            {/* Customer & Table Info Bar */}
            <View style={styles.infoBar}>
              <TouchableOpacity
                style={styles.infoBarItem}
                onPress={onSelectCustomerPress}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={16} color="#1E3A8A" />
                <Text style={styles.infoBarText}>
                  {customer ? customer.name : '+ Pilih Pelanggan'}
                </Text>
              </TouchableOpacity>

              {tableNumber ? (
                <View style={styles.infoBarItem}>
                  <Ionicons name="restaurant-outline" size={16} color="#059669" />
                  <Text style={styles.infoBarText}>Meja: {tableNumber}</Text>
                </View>
              ) : null}
            </View>

            {/* Payment Method Selector */}
            <Text style={styles.sectionLabel}>PILIH METODE PEMBAYARAN:</Text>
            <View style={styles.methodsRow}>
              {(['cash', 'qris', 'debt'] as const).map((method) => {
                const isActive = paymentMethod === method;
                const labels = {
                  cash: 'Tunai',
                  qris: 'QRIS',
                  debt: 'Piutang / Kasbon',
                };
                const icons: Record<string, any> = {
                  cash: 'cash-outline',
                  qris: 'qr-code-outline',
                  debt: 'newspaper-outline',
                };

                return (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodBtn, isActive && styles.methodBtnActive]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Ionicons
                      name={icons[method]}
                      size={20}
                      color={isActive ? '#FFFFFF' : '#475569'}
                    />
                    <Text
                      style={[styles.methodBtnText, isActive && styles.methodBtnTextActive]}
                    >
                      {labels[method]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* TAB 1: TUNAI */}
            {paymentMethod === 'cash' && (
              <View style={styles.methodSection}>
                <Text style={styles.inputLabel}>Uang Diterima:</Text>
                <TextInput
                  style={styles.cashInput}
                  placeholder="Rp 0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={cashTendered}
                  onChangeText={setCashTendered}
                />

                <QuickCashButtons
                  totalAmount={total}
                  onSelectAmount={handleSelectQuickCash}
                />

                <View style={styles.changeBox}>
                  <Text style={styles.changeLabel}>Kembalian:</Text>
                  <Text style={styles.changeValue}>{formatRupiah(changeAmount)}</Text>
                </View>
              </View>
            )}

            {/* TAB 2: QRIS */}
            {paymentMethod === 'qris' && (
              <View style={styles.methodSection}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={profile.qris_payload || `KASIRHAN|${total}|${Date.now()}`}
                    size={160}
                  />
                  <Text style={styles.qrTitle}>{profile.name}</Text>
                  <Text style={styles.qrNominal}>Total Tagihan: {formatRupiah(total)}</Text>
                  <Text style={styles.qrNote}>
                    Tunjukkan kode QR kepada pembeli. Tekan "Selesaikan Transaksi" setelah pembeli selesai membayar.
                  </Text>
                </View>
              </View>
            )}

            {/* TAB 3: PIUTANG / KASBON */}
            {paymentMethod === 'debt' && (
              <View style={styles.methodSection}>
                <View style={styles.debtAlert}>
                  <Ionicons name="information-circle-outline" size={20} color="#D97706" />
                  <Text style={styles.debtAlertText}>
                    Pembayaran dicatat sebagai piutang pelanggan dan dapat dicicil kemudian.
                  </Text>
                </View>

                {!customer && (
                  <TouchableOpacity
                    style={styles.selectCustomerPrompt}
                    onPress={onSelectCustomerPress}
                  >
                    <Ionicons name="person-add" size={20} color="#1E3A8A" />
                    <Text style={styles.selectCustomerPromptText}>
                      Klik di sini untuk memilih nama pelanggan
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.inputLabel}>Uang Muka / Bayar Awal (Opsional):</Text>
                <TextInput
                  style={styles.cashInput}
                  placeholder="Rp 0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={debtDownPayment}
                  onChangeText={setDebtDownPayment}
                />

                <Text style={styles.inputLabel}>Jatuh Tempo (Opsional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 30 Hari / 25 November 2026"
                  placeholderTextColor="#94A3B8"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Complete Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.paySubmitBtn, isProcessing && styles.btnDisabled]}
              onPress={handleCompletePayment}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={styles.paySubmitBtnText}>
                {isProcessing ? 'Memproses Transaksi...' : `Bayar ${formatRupiah(total)}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxWidth: 480,
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    display: 'flex',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  totalBox: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#93C5FD',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  detailSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  detailSummaryText: {
    fontSize: 11,
    color: '#BFDBFE',
  },
  discountText: {
    color: '#FCA5A5',
  },
  infoBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  infoBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  methodBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  methodBtnTextActive: {
    color: '#FFFFFF',
  },
  methodSection: {
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  cashInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
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
  changeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  changeValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15803D',
  },
  qrBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
  },
  qrNominal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E3A8A',
    marginTop: 2,
  },
  qrNote: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  debtAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  debtAlertText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  selectCustomerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  selectCustomerPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  paySubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  paySubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
