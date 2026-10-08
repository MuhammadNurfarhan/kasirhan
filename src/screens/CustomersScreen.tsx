import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { Customer, Debt } from '../types';
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDebts,
  payDebt,
} from '../repositories/customerRepository';
import { formatRupiah, formatDateTime } from '../utils/format';

export const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Debt details modal
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [targetDebt, setTargetDebt] = useState<Debt | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const loadCustomers = async () => {
    const list = await getCustomers(search || undefined);
    setCustomers(list);
  };

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setShowCustomerModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setShowCustomerModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Peringatan', 'Nama pelanggan wajib diisi.');
      return;
    }
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, name, phone, address);
      Alert.alert('Sukses', 'Data pelanggan diperbarui.');
    } else {
      await createCustomer(name, phone, address);
      Alert.alert('Sukses', 'Pelanggan baru ditambahkan.');
    }
    setShowCustomerModal(false);
    loadCustomers();
  };

  const handleDelete = (c: Customer) => {
    Alert.alert('Hapus Pelanggan', `Hapus "${c.name}" dari kontak?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomer(c.id);
          loadCustomers();
        },
      },
    ]);
  };

  const handleOpenDebts = async (c: Customer) => {
    setActiveCustomer(c);
    const list = await getCustomerDebts(c.id);
    setDebts(list);
    setTargetDebt(null);
    setPaymentAmount('');
    setShowDebtModal(true);
  };

  const handlePayDebt = async () => {
    if (!targetDebt) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      Alert.alert('Peringatan', 'Jumlah pembayaran harus lebih dari 0.');
      return;
    }

    try {
      await payDebt(targetDebt.id, amt, paymentNote);
      Alert.alert('Sukses', 'Pembayaran piutang berhasil dicatat.');
      const list = await getCustomerDebts(activeCustomer!.id);
      setDebts(list);
      setTargetDebt(null);
      setPaymentAmount('');
      loadCustomers();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Data Pelanggan & Piutang" subtitle={`${customers.length} Pelanggan`} />

      {/* Top Search & Add */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau nomor HP..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={handleOpenAdd}>
          <Ionicons name="person-add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Pelanggan</Text>
        </TouchableOpacity>
      </View>

      {/* Customers List */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Belum ada data pelanggan</Text>
          </View>
        ) : (
          customers.map((c) => {
            const hasDebt = (c.total_debt || 0) > 0;
            return (
              <View key={c.id} style={styles.customerCard}>
                <View style={styles.customerMain}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{c.name}</Text>
                    {c.phone && <Text style={styles.customerPhone}>{c.phone}</Text>}
                    {c.address && <Text style={styles.customerAddress}>{c.address}</Text>}
                  </View>

                  <View style={styles.debtCol}>
                    {hasDebt ? (
                      <View style={styles.debtBadge}>
                        <Text style={styles.debtBadgeLabel}>Piutang:</Text>
                        <Text style={styles.debtBadgeValue}>{formatRupiah(c.total_debt)}</Text>
                      </View>
                    ) : (
                      <Text style={styles.noDebtText}>Lunas</Text>
                    )}
                  </View>
                </View>

                {/* Bottom Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => handleOpenDebts(c)}
                  >
                    <Ionicons name="newspaper-outline" size={16} color="#D97706" />
                    <Text style={[styles.actionBtnText, { color: '#D97706' }]}>
                      Riwayat Piutang
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnOutline}
                    onPress={() => handleOpenEdit(c)}
                  >
                    <Ionicons name="create-outline" size={16} color="#1E3A8A" />
                    <Text style={[styles.actionBtnText, { color: '#1E3A8A' }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtnOutline, styles.deleteBtn]}
                    onPress={() => handleDelete(c)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ADD / EDIT CUSTOMER MODAL */}
      <Modal visible={showCustomerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nama Pelanggan *</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Pak Budi"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Nomor WhatsApp / HP</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 08123456789"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>Alamat (Opsional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: RT 02 / RW 05"
              value={address}
              onChangeText={setAddress}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave}>
              <Text style={styles.submitBtnText}>Simpan Pelanggan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DEBT DETAILS & REPAYMENT MODAL */}
      <Modal visible={showDebtModal} animationType="slide">
        <View style={styles.debtSafe}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Piutang {activeCustomer?.name}</Text>
              <Text style={styles.debtSubTitle}>
                Total Belum Lunas: {formatRupiah(activeCustomer?.total_debt)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDebtModal(false)}>
              <Ionicons name="close" size={26} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.debtBody} contentContainerStyle={styles.debtBodyContent}>
            {targetDebt && (
              <View style={styles.payBox}>
                <Text style={styles.payBoxTitle}>Bayar Cicilan Piutang</Text>
                <Text style={styles.payBoxSub}>
                  Sisa Tagihan: {formatRupiah(targetDebt.remaining_amount)}
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Jumlah Bayar (Rp)..."
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  autoFocus
                />

                <TextInput
                  style={styles.input}
                  placeholder="Catatan pembayaran..."
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                />

                <View style={styles.payBoxActions}>
                  <TouchableOpacity
                    style={styles.payCancelBtn}
                    onPress={() => setTargetDebt(null)}
                  >
                    <Text style={styles.payCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.paySubmitBtn} onPress={handlePayDebt}>
                    <Text style={styles.paySubmitText}>Konfirmasi Pembayaran</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.debtSectionTitle}>Daftar Tagihan Kasbon:</Text>
            {debts.length === 0 ? (
              <Text style={styles.noDebtTextLarge}>Tidak ada riwayat piutang untuk pelanggan ini.</Text>
            ) : (
              debts.map((d) => (
                <View key={d.id} style={styles.debtCard}>
                  <View style={styles.debtCardHeader}>
                    <Text style={styles.debtDate}>{formatDateTime(d.created_at)}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        d.status === 'paid' ? styles.statusPaid : styles.statusUnpaid,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          d.status === 'paid' ? styles.statusTextPaid : styles.statusTextUnpaid,
                        ]}
                      >
                        {d.status === 'paid' ? 'LUNAS' : d.status === 'partial' ? 'SEBAGIAN' : 'BELUM BAYAR'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.debtAmounts}>
                    <Text style={styles.debtTotal}>Total: {formatRupiah(d.total_amount)}</Text>
                    <Text style={styles.debtRemaining}>Sisa: {formatRupiah(d.remaining_amount)}</Text>
                  </View>

                  {d.remaining_amount > 0 && (
                    <TouchableOpacity
                      style={styles.payThisBtn}
                      onPress={() => {
                        setTargetDebt(d);
                        setPaymentAmount(d.remaining_amount.toString());
                      }}
                    >
                      <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.payThisBtnText}>Bayar Cicilan Ini</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  customerCard: {
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
  customerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  debtCol: {
    alignItems: 'flex-end',
  },
  debtBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'flex-end',
  },
  debtBadgeLabel: {
    fontSize: 9,
    color: '#92400E',
    fontWeight: '700',
  },
  debtBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  noDebtText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
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
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  debtSafe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  debtSubTitle: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
  },
  debtBody: {
    flex: 1,
  },
  debtBodyContent: {
    padding: 16,
    gap: 12,
  },
  payBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  payBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  payBoxSub: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
    marginBottom: 10,
  },
  payBoxActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  payCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  payCancelText: {
    color: '#475569',
    fontWeight: '700',
  },
  paySubmitBtn: {
    flex: 2,
    backgroundColor: '#D97706',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  paySubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  debtSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
  },
  noDebtTextLarge: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 20,
  },
  debtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debtCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtDate: {
    fontSize: 11,
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#DCFCE7',
  },
  statusUnpaid: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPaid: {
    color: '#15803D',
  },
  statusTextUnpaid: {
    color: '#B45309',
  },
  debtAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  debtTotal: {
    fontSize: 13,
    color: '#475569',
  },
  debtRemaining: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B45309',
  },
  payThisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  payThisBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
