import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { createBackup, restoreBackupFromJson } from '../utils/backup';
import { PinModal } from '../components/PinModal';
import { setupSecurity } from '../repositories/profileRepository';
import { generateRecoveryCode } from '../utils/security';

export const SettingsScreen: React.FC = () => {
  const { profile, updateProfile, setScreen } = useAppStore();
  const { deviceId } = useAuthStore();

  // Profile Form State
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(profile.address);
  const [phone, setPhone] = useState(profile.phone);
  const [footerNote, setFooterNote] = useState(profile.footer_note);
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(profile.paper_size);
  const [taxEnabled, setTaxEnabled] = useState(profile.tax_enabled);
  const [taxPercentage, setTaxPercentage] = useState(profile.tax_percentage.toString());
  const [qrisPayload, setQrisPayload] = useState(profile.qris_payload || '');
  const [tableEnabled, setTableEnabled] = useState(profile.table_enabled);

  // Backup / Restore State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Change PIN State
  const [showPinModal, setShowPinModal] = useState(false);
  const [showNewPinModal, setShowNewPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Peringatan', 'Nama usaha wajib diisi.');
      return;
    }
    const updated = {
      ...profile,
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      footer_note: footerNote.trim(),
      paper_size: paperSize,
      tax_enabled: taxEnabled,
      tax_percentage: parseFloat(taxPercentage) || 11,
      qris_payload: qrisPayload.trim() || null,
      table_enabled: tableEnabled,
    };
    await updateProfile(updated);
    Alert.alert('Sukses', 'Pengaturan usaha berhasil disimpan.');
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      await createBackup();
      Alert.alert('Sukses', 'File cadangan berhasil dibuat dan siap disimpan/dibagikan.');
    } catch (e: any) {
      Alert.alert('Gagal Backup', e?.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreJson.trim()) {
      Alert.alert('Peringatan', 'Tempel teks JSON cadangan terlebih dahulu.');
      return;
    }

    Alert.alert(
      'Konfirmasi Penimpaan Data',
      'Memulihkan data akan MENIMPA seluruh database saat ini dengan data dari file cadangan. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Pulihkan Sekarang',
          style: 'destructive',
          onPress: async () => {
            setIsRestoring(true);
            try {
              await restoreBackupFromJson(restoreJson.trim());
              setIsRestoring(false);
              setShowRestoreModal(false);
              setRestoreJson('');
              Alert.alert('Sukses', 'Data berhasil dipulihkan!');
            } catch (e: any) {
              setIsRestoring(false);
              Alert.alert('Gagal Restore', e?.message);
            }
          },
        },
      ]
    );
  };

  const handlePinAuthSuccess = () => {
    setShowPinModal(false);
    const code = generateRecoveryCode();
    setNewRecoveryCode(code);
    setShowNewPinModal(true);
  };

  const handleSaveNewPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) {
      Alert.alert('Peringatan', 'PIN baru harus 4-6 angka.');
      return;
    }
    await setupSecurity(newPin, newRecoveryCode);
    setShowNewPinModal(false);
    setNewPin('');
    Alert.alert('Sukses', 'PIN dan Kode Pemulihan baru berhasil disimpan.');
  };

  return (
    <View style={styles.container}>
      <Header title="Pengaturan Usaha" subtitle={profile.name} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: PROFIL TOKO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil Usaha</Text>

          <Text style={styles.label}>Nama Usaha / Toko *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nama Toko"
          />

          <Text style={styles.label}>Alamat</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Alamat Toko"
          />

          <Text style={styles.label}>Nomor Telepon / WhatsApp</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="08xxxxxxxxxx"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Pesan Kaki Struk (Footer Note)</Text>
          <TextInput
            style={styles.input}
            value={footerNote}
            onChangeText={setFooterNote}
            placeholder="Pesan di bagian bawah struk..."
          />
        </View>

        {/* SECTION 2: PRINTER & STRUK */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Printer & Format Struk</Text>

          <Text style={styles.label}>Ukuran Kertas Printer Thermal:</Text>
          <View style={styles.toggleRow}>
            {(['58mm', '80mm'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.toggleBtn, paperSize === size && styles.toggleBtnActive]}
                onPress={() => setPaperSize(size)}
              >
                <Text style={[styles.toggleText, paperSize === size && styles.toggleTextActive]}>
                  {size} {size === '58mm' ? '(58 mm / Kecil)' : '(80 mm / Lebar)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 3: PAJAK PPN & MEJA */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pajak & Fitur Tambahan</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Hitung Pajak PPN Otomatis</Text>
              <Text style={styles.switchSub}>Tambahkan tarif PPN pada setiap transaksi</Text>
            </View>
            <Switch value={taxEnabled} onValueChange={setTaxEnabled} />
          </View>

          {taxEnabled && (
            <>
              <Text style={styles.label}>Tarif PPN (%):</Text>
              <TextInput
                style={styles.input}
                value={taxPercentage}
                onChangeText={setTaxPercentage}
                keyboardType="numeric"
                placeholder="11"
              />
            </>
          )}

          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <Text style={styles.switchTitle}>Mode Meja & Open Bill</Text>
              <Text style={styles.switchSub}>Cocok untuk kafe dan rumah makan</Text>
            </View>
            <Switch value={tableEnabled} onValueChange={setTableEnabled} />
          </View>

          <Text style={styles.label}>Kode / Teks QRIS Toko (Opsional):</Text>
          <TextInput
            style={styles.input}
            value={qrisPayload}
            onChangeText={setQrisPayload}
            placeholder="Tempel payload QRIS atau link pembayaran"
          />
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
          <Ionicons name="save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
        </TouchableOpacity>

        {/* SECTION 4: KEAMANAN PIN */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Keamanan PIN</Text>
          <Text style={styles.cardDesc}>
            PIN mengunci aplikasi dan menyetujui pembatalan (Void) transaksi.
          </Text>

          <TouchableOpacity style={styles.outlineActionBtn} onPress={() => setShowPinModal(true)}>
            <Ionicons name="key-outline" size={18} color="#1E3A8A" />
            <Text style={styles.outlineActionText}>Ubah PIN Kasir</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 5: BACKUP & RESTORE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cadangkan & Pulihkan Data</Text>
          <Text style={styles.cardDesc}>
            Data Kasirhan 100% tersimpan secara offline di perangkat ini. Buat cadangan secara berkala agar aman.
          </Text>

          <View style={styles.backupButtonsRow}>
            <TouchableOpacity
              style={[styles.backupBtn, isBackingUp && styles.btnDisabled]}
              onPress={handleCreateBackup}
              disabled={isBackingUp}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              <Text style={styles.backupBtnText}>
                {isBackingUp ? 'Membuat Cadangan...' : 'Cadangkan Data (Backup)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={() => setShowRestoreModal(true)}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#1E3A8A" />
              <Text style={styles.restoreBtnText}>Pulihkan Data (Restore)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 6: BANTUAN & INFO LISENSI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bantuan & Info Lisensi</Text>

          <TouchableOpacity
            style={styles.faqLink}
            onPress={() => setScreen('faq')}
          >
            <View style={styles.faqLinkLeft}>
              <Ionicons name="help-circle-outline" size={20} color="#1E3A8A" />
              <Text style={styles.faqLinkText}>Panduan Lengkap & FAQ Offline</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.licenseInfoBox}>
            <Text style={styles.licenseLabel}>ID PERANGKAT INI:</Text>
            <Text style={styles.licenseId}>{deviceId || '-'}</Text>
            <Text style={styles.licenseStatus}>Status: Lisensi Aktif Seumur Hidup (Offline)</Text>
          </View>
        </View>
      </ScrollView>

      {/* RESTORE MODAL */}
      <Modal visible={showRestoreModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pulihkan Data (Restore)</Text>
              <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              Buka file backup Anda, salin seluruh isinya (JSON), lalu tempel ke kotak di bawah ini:
            </Text>

            <TextInput
              style={styles.restoreInput}
              placeholder="Tempel isi JSON backup di sini..."
              placeholderTextColor="#94A3B8"
              value={restoreJson}
              onChangeText={setRestoreJson}
              multiline
              numberOfLines={6}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowRestoreModal(false)}
              >
                <Text style={styles.cancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmRestoreBtn, isRestoring && styles.btnDisabled]}
                onPress={handleConfirmRestore}
                disabled={isRestoring}
              >
                <Text style={styles.confirmRestoreText}>
                  {isRestoring ? 'Memulihkan...' : 'Mulai Pulihkan Data'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN VERIFICATION BEFORE CHANGING PIN */}
      <PinModal
        visible={showPinModal}
        title="Verifikasi PIN Lama"
        subtitle="Masukkan PIN lama Anda sebelum membuat PIN baru"
        onSuccess={handlePinAuthSuccess}
        onCancel={() => setShowPinModal(false)}
      />

      {/* NEW PIN MODAL */}
      <Modal visible={showNewPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Atur PIN Baru</Text>
            <Text style={styles.modalDesc}>Masukkan PIN baru 4-6 digit:</Text>

            <TextInput
              style={styles.input}
              placeholder="PIN Baru"
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
              value={newPin}
              onChangeText={setNewPin}
            />

            <Text style={styles.label}>Kode Pemulihan Baru Anda:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{newRecoveryCode}</Text>
            </View>
            <Text style={styles.codeNote}>Simpan dan catat kode pemulihan baru ini.</Text>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewPin}>
              <Text style={styles.saveBtnText}>Simpan PIN Baru</Text>
            </TouchableOpacity>
          </View>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
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
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  toggleBtnActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#DBEAFE',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleTextActive: {
    color: '#1E3A8A',
    fontWeight: '800',
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
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  outlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  outlineActionText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 13,
  },
  backupButtonsRow: {
    gap: 10,
    marginTop: 6,
  },
  backupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  backupBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 10,
  },
  restoreBtnText: {
    color: '#1E3A8A',
    fontWeight: '700',
    fontSize: 13,
  },
  faqLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  faqLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faqLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  licenseInfoBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  licenseLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  licenseId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  licenseStatus: {
    fontSize: 11,
    color: '#15803D',
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
    maxWidth: 400,
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
    marginBottom: 10,
  },
  restoreInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#0F172A',
    height: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
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
  confirmRestoreBtn: {
    flex: 1.6,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmRestoreText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  codeBox: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
    marginVertical: 8,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    fontFamily: 'monospace',
  },
  codeNote: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
