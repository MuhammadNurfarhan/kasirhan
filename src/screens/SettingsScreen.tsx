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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { createBackup, restoreBackupFromJson } from '../utils/backup';

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
  const [qrisImageUri, setQrisImageUri] = useState<string | null>(profile.qris_image_uri || null);
  const [tableEnabled, setTableEnabled] = useState(profile.table_enabled);

  // Backup / Restore State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreJson, setRestoreJson] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const handlePickQrisImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi membutuhkan izin akses galeri foto untuk memilih gambar QRIS.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        // Salin ke direktori dokumen permanen aplikasi
        const ext = pickedAsset.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const targetUri = `${FileSystem.documentDirectory}qris_store_${Date.now()}.${ext}`;
        await FileSystem.copyAsync({
          from: pickedAsset.uri,
          to: targetUri,
        });
        setQrisImageUri(targetUri);
      }
    } catch (e: any) {
      Alert.alert('Gagal Memilih Foto', e?.message || 'Terjadi kesalahan saat membuka galeri foto.');
    }
  };

  const handleRemoveQrisImage = () => {
    Alert.alert(
      'Hapus Foto QRIS',
      'Apakah Anda yakin ingin menghapus foto QRIS toko?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => setQrisImageUri(null),
        },
      ]
    );
  };

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
      qris_payload: qrisImageUri ? 'QRIS_IMAGE' : null,
      qris_image_uri: qrisImageUri || null,
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

          {/* SECTION: FOTO QRIS TOKO */}
          <Text style={styles.label}>Foto QRIS Toko (Opsional):</Text>
          <Text style={styles.qrisDesc}>
            Upload foto barcode QRIS toko (BCA, Mandiri, BRI, GoPay, OVO, Dana, dll) dari galeri perangkat. Foto ini akan otomatis ditampilkan saat pembeli membayar dengan metode QRIS.
          </Text>

          {qrisImageUri ? (
            <View style={styles.qrisPreviewBox}>
              <Image
                source={{ uri: qrisImageUri }}
                style={styles.qrisPreviewImage}
                resizeMode="contain"
              />
              <View style={styles.qrisActionsRow}>
                <TouchableOpacity
                  style={styles.qrisChangeBtn}
                  onPress={handlePickQrisImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="images-outline" size={16} color="#1E3A8A" />
                  <Text style={styles.qrisChangeBtnText}>Ganti Foto QRIS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.qrisDeleteBtn}
                  onPress={handleRemoveQrisImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  <Text style={styles.qrisDeleteBtnText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.qrisUploadBox}
              onPress={handlePickQrisImage}
              activeOpacity={0.7}
            >
              <View style={styles.qrisUploadIconWrapper}>
                <Ionicons name="cloud-upload-outline" size={32} color="#1E3A8A" />
              </View>
              <Text style={styles.qrisUploadTitle}>Upload Foto QRIS Toko</Text>
              <Text style={styles.qrisUploadSubtitle}>
                Ketuk di sini untuk memilih gambar QRIS dari galeri perangkat
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
          <Ionicons name="save-outline" size={18} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Simpan Pengaturan</Text>
        </TouchableOpacity>

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
  qrisDesc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  qrisPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  qrisPreviewImage: {
    width: 220,
    height: 220,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  qrisActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  qrisChangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    paddingVertical: 10,
    borderRadius: 8,
  },
  qrisChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  qrisDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  qrisDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  qrisUploadBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#93C5FD',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  qrisUploadIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  qrisUploadTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  qrisUploadSubtitle: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
});
