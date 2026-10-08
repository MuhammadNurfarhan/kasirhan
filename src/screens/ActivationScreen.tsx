import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { openWhatsAppRequest } from '../license';

export const ActivationScreen: React.FC = () => {
  const { deviceId, activateWithKey } = useAuthStore();
  const [buyerName, setBuyerName] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCopyId = () => {
    Clipboard.setString(deviceId);
    Alert.alert('Tersalin', 'ID Perangkat berhasil disalin ke clipboard.');
  };

  const handleWhatsApp = async () => {
    try {
      await openWhatsAppRequest(buyerName);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat membuka WhatsApp. Silakan salin ID Perangkat manual.');
    }
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      Alert.alert('Peringatan', 'Silakan tempel atau masukkan kunci lisensi Anda.');
      return;
    }

    setIsSubmitting(true);
    const success = await activateWithKey(licenseKey.trim());
    setIsSubmitting(false);

    if (success) {
      Alert.alert('Aktivasi Berhasil', 'Selamat datang di Kasirhan POS!');
    } else {
      Alert.alert(
        'Kunci Tidak Valid',
        'Kunci lisensi salah atau tidak cocok dengan ID Perangkat ini. Pastikan Anda menyalin kunci dengan benar.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* App Branding */}
        <View style={styles.brandBox}>
          <View style={styles.logoCircle}>
            <Ionicons name="cart" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>KASIRHAN</Text>
          <Text style={styles.tagline}>Satu Aplikasi, Semua Jenis Usaha</Text>
          <View style={styles.pillOffline}>
            <Ionicons name="cloud-offline" size={14} color="#15803D" />
            <Text style={styles.pillOfflineText}>100% Offline • Tanpa Akun</Text>
          </View>
        </View>

        {/* Activation Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Aktivasi Lisensi Perangkat</Text>
          <Text style={styles.cardDesc}>
            Aplikasi ini menggunakan lisensi beli putus seumur hidup. Kirim ID Perangkat di bawah kepada penjual via WhatsApp untuk mendapatkan Kunci Lisensi.
          </Text>

          {/* Device ID Display */}
          <View style={styles.idContainer}>
            <Text style={styles.idLabel}>ID PERANGKAT ANDA:</Text>
            <View style={styles.idRow}>
              <Text style={styles.idText}>{deviceId || 'MEMUAT...'}</Text>
              <TouchableOpacity style={styles.copyBtn} onPress={handleCopyId}>
                <Ionicons name="copy-outline" size={18} color="#1E3A8A" />
                <Text style={styles.copyBtnText}>Salin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Name for WhatsApp */}
          <Text style={styles.inputLabel}>Nama Pemilik / Usaha (Opsional):</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Bu Sari / Toko Berkah"
            placeholderTextColor="#94A3B8"
            value={buyerName}
            onChangeText={setBuyerName}
          />

          {/* WhatsApp Request Button */}
          <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.waBtnText}>Kirim ID via WhatsApp</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SUDAH PUNYA KUNCI?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* License Key Input */}
          <Text style={styles.inputLabel}>Tempel Kunci Lisensi:</Text>
          <TextInput
            style={[styles.input, styles.keyInput]}
            placeholder="Tempel kunci lisensi di sini..."
            placeholderTextColor="#94A3B8"
            value={licenseKey}
            onChangeText={setLicenseKey}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.activateBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleActivate}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Ionicons name="key" size={20} color="#FFFFFF" />
            <Text style={styles.activateBtnText}>
              {isSubmitting ? 'Memeriksa Kunci...' : 'Aktivasi Sekarang'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Lisensi terikat pada perangkat ini secara offline via kriptografi Ed25519.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 10,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  pillOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  pillOfflineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  idContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 14,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
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
    marginBottom: 12,
  },
  keyInput: {
    height: 70,
    textAlignVertical: 'top',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  waBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    marginHorizontal: 10,
  },
  activateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  activateBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 18,
  },
});
