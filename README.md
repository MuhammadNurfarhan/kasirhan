# Kasirhan — POS Offline untuk Android

> **Satu aplikasi, semua jenis usaha. 100% offline, tanpa akun.**

Kasirhan adalah aplikasi kasir (Point of Sale) untuk perangkat Android yang berjalan sepenuhnya tanpa koneksi internet, ditujukan bagi UMKM Indonesia (warung kelontong, rumah makan/kafe, butik pakaian, toko buah/sayur curah, apotek, toko elektronik, dan jasa). Aplikasi didistribusikan dalam bentuk APK komersial (beli putus seumur hidup) dengan aktivasi lisensi offline kriptografis Ed25519.

---

## 🚀 Fitur Utama

- **100% Offline-First & Tanpa Akun:** Seluruh transaksi, katalog produk, stok, dan laporan tersimpan lokal di SQLite perangkat.
- **Onboarding Adaptif:** Konfigurasi otomatis sesuai jenis usaha (Kelontong, Kuliner/Kafe, Buah & Curah, Butik, Apotek, Elektronik, Jasa, dll.).
- **Transaksi Cepat (< 10 Detik):** Dukungan pencarian cepat, filter kategori, dan pemindaian barcode langsung via kamera.
- **Dukungan Satuan Berat / Volume (Curah):** Jual per kg atau liter dengan input desimal akurat (kalkulasi internal integer gram/ml).
- **Varian & Manajemen Stok:** Dukungan produk bervarian (ukuran/warna), batas peringatan stok menipis, serta produk non-stok (jasa).
- **HPP Rata-Rata Bergerak (Moving Average):** Menghitung ulang modal secara otomatis saat restok barang, menyediakan laporan laba kotor yang akurat.
- **Metode Pembayaran Fleksibel:**
  - **Tunai:** Tombol uang pas, pecahan cepat nominal rupiah, dan kalkulasi kembalian otomatis.
  - **QRIS:** Tampilan kode QR toko & pencatatan nominal.
  - **Piutang / Kasbon:** Terikat data pelanggan, dengan pencatatan jatuh tempo dan cicilan pembayaran.
- **Meja & Open Bill:** Simpan keranjang sementara (*Hold Cart*) per meja atau nama pemesan untuk kafe dan resto.
- **Struk Thermal & Digital:**
  - Cetak Bluetooth thermal ESC/POS (ukuran kertas 58 mm dan 80 mm).
  - Bagikan struk digital via WhatsApp atau simpan format PDF.
- **Integritas Data & Void Terproteksi:** Transaksi bersifat *immutable*. Pembatalan transaksi (Void) mewajibkan alasan + verifikasi PIN, dan otomatis mengembalikan stok.
- **Keamanan PIN & Kode Pemulihan:** PIN 4–6 digit dengan salt hash SHA-256 serta kode pemulihan unik 12 karakter untuk reset PIN tanpa internet.
- **Cadangkan & Pulihkan (Backup & Restore):** Ekspor file cadangan JSON lokal dan bagikan lewat share sheet (WhatsApp, Drive, File Manager).
- **Ekspor CSV:** Ekspor riwayat transaksi penjualan dan katalog stok ke format CSV siap olah di Excel/Spreadsheet.
- **Bantuan & FAQ Offline:** Panduan lengkap dalam aplikasi dapat diakses tanpa koneksi internet.

---

## 🛠️ Arsitektur & Teknologi

- **Framework:** React Native + TypeScript, Expo SDK 57
- **Database:** SQLite (`expo-sqlite`) dengan schema DDL & transaksi atomik
- **State Management:** Zustand (`cartStore`, `authStore`, `appStore`)
- **Kriptografi & Lisensi:** `tweetnacl` (Ed25519 Detached Signatures), `expo-crypto`, `expo-secure-store`
- **Hardware & Periferal:** `expo-camera` (Barcode Scanner), `expo-print` & `expo-sharing` (Struk & Dokumen)

---

## 📁 Struktur Direktori

```text
kasirhan/
├── assets/                  # Ikon aplikasi dan splash screen
├── src/
│   ├── components/          # Komponen UI (Header, Navbar, PinModal, BarcodeScannerModal, ReceiptModal, dll.)
│   ├── db/                  # SQLite database instance, migrasi, dan schema DDL
│   ├── repositories/        # Lapisan data (Product, Transaction, Category, Customer, Profile, HeldCart)
│   ├── screens/             # Layar utama (Cashier, Products, History, Reports, Customers, Settings, Faq, dll.)
│   ├── stores/              # Zustand stores (cart, auth, app)
│   ├── types/               # TypeScript data contracts & interfaces
│   ├── utils/               # Formatter rupiah/berat, HPP, kalkulasi struk, security, backup, CSV
│   └── license.ts           # Logika verifikasi lisensi offline perangkat
├── tools/
│   ├── buat-kunci.js        # Generator pasangan kunci Ed25519 (Private & Public key)
│   ├── buat-lisensi.js      # Generator kunci aktivasi lisensi pembeli
│   └── test-core.js         # Pengujian unit otomatis logika inti PRD
├── App.tsx                  # Root switcher (Aktivasi -> Onboarding -> PIN Lock -> Main App)
├── app.json                 # Konfigurasi Expo dan izin perangkat Android
└── package.json
```

---

## 🔑 Sistem Lisensi & Alur Aktivasi

Aplikasi menggunakan aktivasi offline berbasis kunci digital:

1. **Alur Pengguna:**
   - Pembeli membuka aplikasi -> Layar aktivasi menampilkan **ID Perangkat** unik (16 karakter heksadesimal).
   - Pembeli menekan tombol *"Kirim via WhatsApp"* kepada penjual.
   - Pembeli menerima Kunci Lisensi, menempelkannya di aplikasi, dan menekan *"Aktivasi Sekarang"*.
   - Aplikasi memverifikasi tanda tangan Ed25519 secara offline dan aktif selamanya.

2. **Setup Kunci Penjual (Sekali Saja):**
   ```bash
   node tools/buat-kunci.js
   ```
   - Nilai `PUBLIC_KEY.txt` disematkan ke `PUBLIC_KEY_B64` pada [`src/license.ts`](file:///c:/Users/mnfar/Documents/Project/kasirhan/src/license.ts).
   - Simpan `PRIVATE.pem` secara rahasia di tempat aman (jangan di-commit ke Git).

3. **Membuat Kunci Lisensi Tiap Pembeli:**
   ```bash
   node tools/buat-lisensi.js <ID_PERANGKAT> "<Nama Pembeli>" <NomorWA> [catatan]
   ```
   *Contoh:*
   ```bash
   node tools/buat-lisensi.js A1B2C3D4E5F60718 "Bu Sari - Toko Berkah" 081234567890
   ```

---

## 🧪 Menjalankan Proyek & Pengujian

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Uji Logika Inti PRD (Lisensi, HPP Moving Average, Bobot Desimal, Laba)
```bash
node tools/test-core.js
```

### 3. Pengecekan TypeScript
```bash
npx tsc --noEmit
```

### 4. Menjalankan Server Pengembangan
```bash
npx expo start
```
- Jalankan di emulator Android atau peranti fisik via USB/Expo Go / Development Build.

---

## 📄 Lisensi & Hak Cipta
Aplikasi komersial tertutup. Dilarang mendistribusikan kunci privat (`PRIVATE.pem`) atau memodifikasi mekanisme validasi lisensi offline.
