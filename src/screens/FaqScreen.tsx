import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { useAppStore } from '../stores/appStore';

const FAQ_ITEMS = [
  {
    q: 'Apakah Kasirhan butuh koneksi internet?',
    a: 'Tidak sama sekali. Kasirhan dirancang 100% offline-first. Semua data produk, transaksi, dan laporan tersimpan aman di memori perangkat Anda tanpa membutuhkan akun atau internet.',
  },
  {
    q: 'Bagaimana cara menghubungkan printer struk Bluetooth?',
    a: 'Nyalakan printer thermal Anda dan hubungkan melalui pengaturan Bluetooth Android terlebih dahulu. Di aplikasi Kasirhan, pilih ukuran kertas 58mm atau 80mm di menu Pengaturan.',
  },
  {
    q: 'Bagaimana jika saya tidak punya printer fisik?',
    a: 'Anda tetap bisa membagikan struk digital dalam bentuk PDF atau ringkasan pesan WhatsApp langsung kepada pelanggan Anda.',
  },
  {
    q: 'Bagaimana cara kerja perhitungan HPP (Harga Pokok Penjualan)?',
    a: 'Kasirhan menggunakan metode Rata-Rata Bergerak (Moving Average). Setiap kali Anda menambah stok baru dengan modal berbeda, sistem otomatis menghitung ulang harga modal rata-rata per unit.',
  },
  {
    q: 'Bagaimana jika saya lupa PIN kasir?',
    a: 'Gunakan Kode Pemulihan 12 karakter yang Anda dapatkan saat pertama kali mengatur PIN. Kode ini dapat mereset PIN Anda tanpa menghapus data.',
  },
  {
    q: 'Bagaimana cara mengamankan data saya agar tidak hilang jika HP rusak?',
    a: 'Buka menu Pengaturan -> Cadangkan Data (Backup). Simpan file cadangan tersebut ke Google Drive, kirim ke WhatsApp sendiri, atau simpan di kartu SD secara berkala.',
  },
  {
    q: 'Apakah saya bisa membatalkan transaksi yang salah input?',
    a: 'Bisa. Buka menu Riwayat -> tekan tombol Void pada transaksi yang ingin dibatalkan. Masukkan alasan pembatalan dan PIN Anda. Stok produk akan otomatis dikembalikan ke etalase.',
  },
  {
    q: 'Bagaimana jika saya berganti perangkat HP?',
    a: 'Cukup buat cadangan (Backup) dari HP lama, pasang Kasirhan di HP baru, kirim ID Perangkat baru Anda ke penjual melalui WhatsApp untuk mendapatkan Kunci Lisensi baru (gratis seumur hidup tanpa batas ganti perangkat), lalu pulihkan data Anda melalui menu Restore.',
  },
];

export const FaqScreen: React.FC = () => {
  const { setScreen } = useAppStore();

  return (
    <View style={styles.container}>
      <Header title="Panduan & FAQ" subtitle="Bantuan Offline" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="help-buoy" size={32} color="#1E3A8A" />
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>Pusat Bantuan Offline</Text>
            <Text style={styles.bannerSub}>
              Semua panduan dasar penggunaan Kasirhan dapat dibaca kapan saja tanpa internet.
            </Text>
          </View>
        </View>

        {FAQ_ITEMS.map((item, idx) => (
          <View key={idx} style={styles.faqCard}>
            <View style={styles.qRow}>
              <Text style={styles.qNum}>Q{idx + 1}</Text>
              <Text style={styles.question}>{item.q}</Text>
            </View>
            <Text style={styles.answer}>{item.a}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('settings')}>
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Kembali ke Pengaturan</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 40,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  bannerSub: {
    fontSize: 12,
    color: '#1E40AF',
    marginTop: 2,
    lineHeight: 16,
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  qNum: {
    backgroundColor: '#1E3A8A',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  question: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  answer: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    paddingLeft: 26,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
