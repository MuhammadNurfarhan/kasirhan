import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Transaction } from '../types';
import {
  getTransactions,
  getTransactionWithItems,
  voidTransaction,
} from '../repositories/transactionRepository';
import { formatRupiah, formatDateTime } from '../utils/format';
import { ReceiptModal } from '../components/ReceiptModal';
import { PinModal } from '../components/PinModal';

export const HistoryScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterDate, setFilterDate] = useState<string>('today');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'void'>('all');

  // Selected for Receipt
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Void flow
  const [voidTargetTx, setVoidTargetTx] = useState<Transaction | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [showVoidReasonModal, setShowVoidReasonModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [filterDate, filterStatus]);

  const loadTransactions = async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    let dateArg: string | undefined = undefined;

    if (filterDate === 'today') {
      dateArg = todayStr;
    }

    const txs = await getTransactions({
      date: dateArg,
      status: filterStatus === 'all' ? undefined : filterStatus,
    });
    setTransactions(txs);
  };

  const handleOpenReceipt = async (tx: Transaction) => {
    const fullTx = await getTransactionWithItems(tx.id);
    if (fullTx) {
      setSelectedTx(fullTx);
      setShowReceiptModal(true);
    }
  };

  const handleStartVoid = (tx: Transaction) => {
    if (tx.status === 'void') {
      Alert.alert('Info', 'Transaksi ini sudah dibatalkan sebelumnya.');
      return;
    }
    setVoidTargetTx(tx);
    setVoidReason('');
    setShowVoidReasonModal(true);
  };

  const handleConfirmVoidReason = () => {
    if (!voidReason.trim()) {
      Alert.alert('Peringatan', 'Harap isi alasan pembatalan (void).');
      return;
    }
    setShowVoidReasonModal(false);
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    if (!voidTargetTx) return;
    try {
      await voidTransaction(voidTargetTx.id, voidReason);
      setShowPinModal(false);
      setVoidTargetTx(null);
      setVoidReason('');
      Alert.alert('Sukses', 'Transaksi berhasil di-void dan stok telah dikembalikan.');
      loadTransactions();
    } catch (e: any) {
      Alert.alert('Gagal Void', e?.message);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Riwayat Transaksi" subtitle={`${transactions.length} Transaksi`} />

      {/* Date & Status Filters */}
      <View style={styles.filterBar}>
        <View style={styles.filterRow}>
          {(['today', 'all'] as const).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.filterBtn, filterDate === d && styles.filterBtnActive]}
              onPress={() => setFilterDate(d)}
            >
              <Text style={[styles.filterText, filterDate === d && styles.filterTextActive]}>
                {d === 'today' ? 'Hari Ini' : 'Semua Tanggal'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'completed', 'void'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterPill, filterStatus === s && styles.filterPillActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterPillText, filterStatus === s && styles.filterPillTextActive]}>
                {s === 'all' ? 'Semua' : s === 'completed' ? 'Selesai' : 'Void'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transactions List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Tidak ada transaksi ditemukan</Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const isVoid = tx.status === 'void';
            return (
              <TouchableOpacity
                key={tx.id}
                style={[styles.txCard, isVoid && styles.txCardVoid]}
                onPress={() => handleOpenReceipt(tx)}
                activeOpacity={0.7}
              >
                <View style={styles.txHeader}>
                  <View>
                    <Text style={styles.invoiceNo}>{tx.invoice_number}</Text>
                    <Text style={styles.txDate}>{formatDateTime(tx.created_at)}</Text>
                  </View>

                  <View style={styles.statusBadgeRow}>
                    <View
                      style={[
                        styles.methodBadge,
                        tx.payment_method === 'cash'
                          ? styles.cashBadge
                          : styles.qrisBadge,
                      ]}
                    >
                      <Text style={styles.methodBadgeText}>
                        {tx.payment_method.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        isVoid ? styles.voidBadge : styles.completedBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isVoid ? styles.voidBadgeText : styles.completedBadgeText,
                        ]}
                      >
                        {isVoid ? 'VOID' : 'SELESAI'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Customer / Table */}
                {(tx.customer_name || tx.table_number) && (
                  <View style={styles.txMetaRow}>
                    {tx.customer_name && (
                      <Text style={styles.txMetaText}>Pelanggan: {tx.customer_name}</Text>
                    )}
                    {tx.table_number && (
                      <Text style={styles.txMetaText}>Meja: {tx.table_number}</Text>
                    )}
                  </View>
                )}

                {isVoid && tx.void_reason && (
                  <Text style={styles.voidReasonText}>Alasan Void: {tx.void_reason}</Text>
                )}

                {/* Amount and Void Button */}
                <View style={styles.txFooter}>
                  <Text style={[styles.totalAmount, isVoid && styles.totalAmountVoid]}>
                    {formatRupiah(tx.total_amount)}
                  </Text>

                  <View style={styles.txActionButtons}>
                    {!isVoid && (
                      <TouchableOpacity
                        style={styles.voidBtn}
                        onPress={() => handleStartVoid(tx)}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                        <Text style={styles.voidBtnText}>Void</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.detailBtn}
                      onPress={() => handleOpenReceipt(tx)}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#1E3A8A" />
                      <Text style={styles.detailBtnText}>Struk</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* VOID REASON MODAL */}
      <Modal visible={showVoidReasonModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alasan Pembatalan (Void)</Text>
              <TouchableOpacity onPress={() => setShowVoidReasonModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Pembatalan transaksi akan mengembalikan stok produk ke sistem. Alasan pembatalan wajib dicatat.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Contoh: Pelanggan salah pesan / Uang ditarik kembali"
              placeholderTextColor="#94A3B8"
              value={voidReason}
              onChangeText={setVoidReason}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowVoidReasonModal(false)}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextPinBtn} onPress={handleConfirmVoidReason}>
                <Text style={styles.nextPinText}>Lanjut ke PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN VERIFICATION MODAL FOR VOID */}
      <PinModal
        visible={showPinModal}
        title="Otorisasi Void"
        subtitle="Masukkan PIN untuk menyetujui pembatalan transaksi ini"
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinModal(false)}
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        visible={showReceiptModal}
        transaction={selectedTx}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedTx(null);
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
  filterBar: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterPillActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#DBEAFE',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  list: {
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
  txCard: {
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
  txCardVoid: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  txDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cashBadge: {
    backgroundColor: '#DCFCE7',
  },
  qrisBadge: {
    backgroundColor: '#DBEAFE',
  },
  debtBadge: {
    backgroundColor: '#FEF3C7',
  },
  methodBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  voidBadge: {
    backgroundColor: '#FEE2E2',
  },
  voidBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  txMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  txMetaText: {
    fontSize: 11,
    color: '#475569',
  },
  voidReasonText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 4,
    fontStyle: 'italic',
  },
  txFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E3A8A',
  },
  totalAmountVoid: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  txActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  voidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  voidBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailBtnText: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  reasonInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '700',
  },
  nextPinBtn: {
    flex: 1.5,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  nextPinText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
