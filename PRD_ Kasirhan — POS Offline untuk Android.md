# PRD: Kasirhan — POS Offline untuk Android

**Versi:** 1.0 | **Tanggal:** 8 Oktober 2026 | **Status:** Final

---

## 1. Ringkasan

**Nama produk:** Kasirhan **Tagline:** Satu aplikasi, semua jenis usaha. 100% offline, tanpa akun.

Aplikasi kasir (Point of Sale) untuk Android yang berjalan sepenuhnya tanpa internet, ditujukan bagi UMKM Indonesia. Aplikasi dijual sebagai produk komersial (beli putus, tanpa batas fitur maupun jumlah produk), dibangun dengan React Native.

## 2. Latar Belakang & Masalah

- Banyak UMKM beroperasi di area dengan koneksi tidak stabil, sementara POS berbasis cloud sulit dipakai saat offline.
- Mesin kasir khusus mahal; HP/tablet Android lebih terjangkau.
- Aplikasi POS yang ada sering mewajibkan akun dan langganan bulanan, yang memberatkan usaha kecil.
- Pencatatan manual (buku tulis) rawan salah, tidak memberi laporan laba, dan sulit dilacak.

## 3. Tujuan & Non-Tujuan

### Tujuan

1. Kasir dapat menyelesaikan transaksi tunai dalam kurang dari 10 detik untuk 3 item.
2. Aplikasi berfungsi penuh tanpa internet dan tanpa pembuatan akun.
3. Pemilik usaha dapat melihat omzet dan laba tanpa menghitung manual.
4. Data aman: pengguna dapat backup dan restore dengan mudah.
5. Berjalan lancar di Android RAM 2-3 GB.

### Non-Tujuan (versi awal)

- Multi-perangkat / sinkronisasi cloud real-time
- Multi-cabang dan manajemen karyawan lanjutan
- Integrasi marketplace, e-commerce, atau akuntansi
- Verifikasi pembayaran QRIS otomatis (hanya pencatatan)
- Metode stok FIFO
- Versi iOS
- Multi-peran pengguna (kasir = pemilik, satu PIN, akses penuh)
- Enkripsi database (PIN hanya mengunci antarmuka)

## 4. Target Pengguna

| Persona                        | Deskripsi                                                             | Kebutuhan utama                        |
| ------------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| **Pemilik usaha mikro**        | Pemilik warung/toko kelontong, 1 orang kasir (sering dirinya sendiri) | Cepat, simpel, stok dan laba terpantau |
| **Pemilik kafe/resto kecil**   | 1-3 staf, ada meja                                                    | Nomor meja, open bill, struk           |
| **Pemilik butik/toko pakaian** | Produk bervariasi                                                     | Varian ukuran dan warna                |
| **Pedagang curah**             | Buah, sayur, sembako                                                  | Jual per kg/liter                      |
| **Pemilik = kasir**            | Satu pengguna, satu PIN, akses penuh ke semua fitur                   | Antarmuka jelas, tanpa pembagian peran |

**Positioning:** Semua jenis usaha. Fitur diaktifkan sesuai jenis usaha yang dipilih saat onboarding, dan materi pemasaran (katalog, video demo, situs) dibuat per segmen. Pengembangan tetap bertahap (v1.0 sampai v1.2), tetapi seluruh daftar fitur adalah cakupan produk.

## 5. Prinsip Produk

1. **Offline-first, tanpa akun.** Semua fitur inti tidak butuh internet.
2. **Sederhana untuk pemula.** Fitur disesuaikan jenis usaha saat onboarding.
3. **Data bisa dipercaya.** Transaksi tidak diedit/dihapus, hanya di-void dengan catatan.
4. **Jujur dalam klaim.** Fitur QRIS = pencatatan, bukan integrasi pembayaran.

## 6. Cakupan Fitur per Rilis

### v1.0 (MVP)

| ID   | Fitur                                                                                   | Prioritas |
| ---- | --------------------------------------------------------------------------------------- | --------- |
| F-01 | Onboarding: pilih jenis usaha, nama usaha, alamat, logo                                 | P0        |
| F-02 | Manajemen produk & kategori (nama, harga jual, stok, barcode)                           | P0        |
| F-03 | Layar kasir: keranjang, diskon, tunai, kembalian                                        | P0        |
| F-04 | Scan barcode (kamera) ke keranjang                                                      | P0        |
| F-05 | Jual per kg/liter (satuan terkecil integer)                                             | P0        |
| F-06 | Struk: cetak Bluetooth (58/80 mm) dan bagikan via WhatsApp/PDF                          | P0        |
| F-07 | Riwayat transaksi dan void                                                              | P0        |
| F-08 | Laporan dasar: omzet harian/bulanan, produk terlaris                                    | P0        |
| F-09 | PIN keamanan + mekanisme pemulihan                                                      | P0        |
| F-10 | Backup & restore (file lokal, bagikan lewat share sheet)                                | P0        |
| F-21 | Aktivasi lisensi offline (kunci lisensi terikat perangkat)                              | P0        |
| F-22 | Pemasangan lewat APK, dengan panduan instalasi dan bantuan dalam aplikasi (FAQ offline) | P0        |
| F-11 | Distribusi beli putus, tanpa batas produk/fitur                                         | P0        |

### v1.1

| ID   | Fitur                                                             | Prioritas |
| ---- | ----------------------------------------------------------------- | --------- |
| F-12 | Varian produk (ukuran, warna; SKU, harga, modal, stok per varian) | P1        |
| F-13 | Pencatatan pembayaran QRIS (tampilkan QRIS toko)                  | P1        |
| F-14 | Data pelanggan dan riwayat belanja                                | P1        |
| F-15 | HPP metode rata-rata bergerak dan laporan laba                    | P1        |
| F-16 | Export CSV                                                        | P1        |
| F-17 | Logo usaha pada struk                                             | P1        |

### v1.2

| ID   | Fitur                                                         | Prioritas |
| ---- | ------------------------------------------------------------- | --------- |
| F-18 | Nomor meja dan open bill                                      | P1        |
| F-19 | Piutang: bayar belakangan, cicilan, terikat pelanggan         | P1        |
| F-20 | PPN opsional (tarif dapat diatur, harga termasuk/belum pajak) | P2        |

### Berikutnya

Grafik tren penjualan, analisis jam sibuk, pelanggan teratas, backup otomatis terjadwal,

## 7. Kebutuhan Fungsional (Ringkas)

### 7.1 Produk & Stok

- Produk memiliki: nama, kategori, satuan, harga jual, harga modal, stok, barcode, foto (opsional).
- Produk tanpa varian memakai satu varian default secara internal.
- Stok berkurang otomatis saat transaksi dan kembali saat void.
- Peringatan stok menipis (ambang dapat diatur).
- Stok dapat dinonaktifkan untuk produk jasa/menu.

### 7.2 Kasir

- Tambah item lewat pencarian, kategori, atau scan barcode.
- Ubah jumlah, diskon per item dan per transaksi (nominal atau persen).
- Input uang diterima, hitung kembalian, tombol nominal cepat.
- Simpan keranjang sementara (hold) sebelum bayar.
- Setelah bayar: tampilkan struk, opsi cetak/bagikan.

### 7.3 Satuan Berat/Volume

- Kuantitas disimpan sebagai integer dalam gram/mililiter.
- Tampilan mengikuti satuan jual (kg/liter) dengan input desimal.
- Aturan pembulatan harga per baris didefinisikan dan konsisten di struk dan laporan.

### 7.4 Struk & Printer

- Dukungan printer thermal Bluetooth Classic (SPP) dengan ESC/POS, ukuran 58 mm dan 80 mm.
- Header: logo, nama usaha, alamat; footer: pesan kustom.
- Alternatif tanpa printer: gambar/PDF struk dibagikan via WhatsApp.
- Daftar printer yang diuji dan kompatibel dipublikasikan.

### 7.5 Transaksi & Integritas Data

- Transaksi bersifat immutable; pembatalan melalui void dengan alasan dan waktu.
- Snapshot harga jual, harga modal, dan pajak disimpan di setiap baris transaksi.
- Nomor transaksi unik dan berurutan per hari/perangkat.

### 7.6 Laporan

- Filter harian, mingguan, bulanan, rentang kustom.
- Omzet, jumlah transaksi, produk terlaris, rincian metode bayar.
- Laba kotor = penjualan - HPP (mulai v1.1).
- HPP memakai **rata-rata bergerak**: setiap pembelian/penambahan stok menghitung ulang modal rata-rata = (nilai stok lama + nilai masuk) / (qty lama + qty masuk). Nilai modal pada saat transaksi disimpan sebagai snapshot di baris transaksi.

### 7.7 Keamanan

- PIN 4-6 digit, disimpan sebagai hash dengan salt.
- Pemulihan PIN (dipilih): **kode pemulihan** acak 12 karakter yang dibuat saat setup PIN, ditampilkan sekali, dan wajib dikonfirmasi pengguna (dicatat/disimpan sebagai gambar atau dibagikan ke diri sendiri). Kode disimpan sebagai hash. Dengan kode ini pengguna dapat mengatur PIN baru tanpa kehilangan data.
- Jika kode hilang: PIN dapat di-reset dengan menghapus data aplikasi, lalu restore dari file backup (dengan peringatan jelas). Pengguna dianjurkan membuat backup sebelum hal ini terjadi.
- Tidak ada enkripsi database. PIN hanya mengunci antarmuka; informasikan hal ini secara jujur di aplikasi dan materi pemasaran.
- Auto-lock setelah aplikasi di background.

### 7.8 Backup & Restore

- Ekspor file backup (database + aset) ke penyimpanan lokal, atau bagikan lewat share sheet Android (WhatsApp, Google Drive, email) tanpa perlu integrasi API Google.
- Restore dengan validasi versi skema dan konfirmasi penimpaan data.
- Pengingat backup berkala dalam aplikasi.

### 7.9 Distribusi, Monetisasi & Lisensi

- **Distribusi:** file `.apk` yang diunduh langsung oleh klien (tautan unduhan/dikirim penjual). **Tidak** diunggah ke Google Play.
- **Monetisasi:** beli putus **Rp 50.000**, sekali bayar, **tanpa masa uji coba**, tanpa batas fitur/produk, gratis seumur hidup. Pembayaran dilakukan di luar aplikasi, lalu kunci lisensi dikirim lewat **WhatsApp**.
- **Aktivasi lisensi offline:**
  - Saat pertama dibuka, aplikasi menampilkan **ID Perangkat** (kode unik turunan perangkat/instalasi) dan meminta kunci lisensi.
  - Penjual membuat kunci lisensi lewat **alat generator** (terpisah dari aplikasi) yang menandatangani ID perangkat memakai kunci privat (Ed25519). Aplikasi hanya memuat **kunci publik** untuk verifikasi, jadi tidak perlu internet.
  - Satu kunci berlaku untuk satu perangkat. Pindah perangkat: pengguna mengirim ID Perangkat baru via WhatsApp dan mendapat kunci baru, **tanpa batas jumlah penggantian**, lalu restore backup.
  - Permintaan dan pengiriman kunci dilakukan lewat WhatsApp; penjual disarankan menyimpan catatan (nama, nomor, ID Perangkat, tanggal) untuk memantau penyalahgunaan.
  - Tanpa kunci valid, aplikasi hanya menampilkan layar aktivasi (tidak ada mode trial).
  - Kunci privat disimpan aman oleh penjual; kebocorannya membuat semua lisensi dapat dipalsukan.
- **Versi:** distribusi berupa satu APK final setelah seluruh fitur selesai. Tidak ada saluran pembaruan, hosting versi baru, atau notifikasi update. Tahap v1.0-v1.2 hanya urutan pengembangan internal. Keystore penandatanganan tetap dicadangkan jika suatu saat perbaikan kritis perlu dikirim manual.
- **Pemasangan:** pengguna perlu mengizinkan "Pasang aplikasi tidak dikenal" dan mungkin melihat peringatan Google Play Protect. Sediakan panduan bergambar singkat dan tautan unduhan resmi (HTTPS).

### 7.10 Orientasi Layar

- **Mode jual** (layar kasir, keranjang, pembayaran): landscape.
- Layar lain (produk, laporan, riwayat, pengaturan, backup): portrait.
- Orientasi berpindah otomatis mengikuti layar; keranjang tidak boleh hilang saat berpindah.
- Tata letak mode jual dioptimalkan untuk tablet dan HP (dua panel: katalog dan keranjang).

## 8. Kebutuhan Non-Fungsional

| Area           | Target                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Performa       | Cold start \< 3 detik di perangkat RAM 2 GB; pencarian produk \< 200 ms untuk 5.000 item              |
| Keandalan      | Tidak ada kehilangan data saat aplikasi crash/baterai habis (transaksi atomik via SQLite transaction) |
| Kompatibilitas | Android 8.0 (API 26) ke atas; HP dan tablet (landscape di mode jual, portrait di layar lain)          |
| Ukuran         | APK/AAB awal \< 40 MB                                                                                 |
| Bahasa         | Bahasa Indonesia (utama), Inggris (opsional)                                                          |
| Aksesibilitas  | Target sentuh besar, kontras tinggi, teks dapat dibaca di bawah cahaya terang                         |
| Privasi        | Tidak ada data dikirim keluar tanpa tindakan pengguna; kebijakan privasi jelas                        |

## 9. Arsitektur & Teknologi

- **Framework:** React Native + TypeScript, Expo (development build)
- **Database:** SQLite (expo-sqlite) + Drizzle ORM dengan migrasi versi
- **State:** Zustand (keranjang, UI); data utama dari SQLite
- **UI list:** FlashList
- **Barcode:** react-native-vision-camera atau expo-camera
- **Printer:** library Bluetooth Classic + generator ESC/POS
- **Lapisan repository** antara UI dan database agar sync cloud dapat ditambah kemudian

**Keputusan data:**

1. Uang disimpan sebagai integer rupiah.
2. ID memakai UUID/ULID.
3. Kuantitas berat/volume dalam satuan terkecil integer.
4. Struktur `produk -> varian` sejak v1.
5. Snapshot harga modal per baris transaksi.

## 10. Alur Pengguna Utama

1. **Onboarding:** pilih jenis usaha -> isi profil usaha -> atur PIN -> simpan kode pemulihan -> tambah produk pertama.
2. **Transaksi tunai:** buka kasir -> tambah item (scan/cari) -> cek keranjang -> bayar tunai -> kembalian -> cetak/bagikan struk.
3. **Void:** riwayat -> pilih transaksi -> void -> isi alasan -> konfirmasi PIN -> stok dikembalikan.
4. **Backup:** pengaturan -> backup -> pilih lokasi -> konfirmasi sukses.

## 11. Metrik Keberhasilan

| Metrik                                                               | Target (3 bulan setelah rilis) |
| -------------------------------------------------------------------- | ------------------------------ |
| Aktivasi: pengguna yang menyelesaikan transaksi pertama dalam 24 jam | > 60%                          |
| Retensi hari ke-30                                                   | > 30%                          |
| Transaksi per pengguna aktif per minggu                              | > 50                           |
| Skor kepuasan pelanggan (survei singkat)                             | >= 4,3 / 5                     |
| Crash-free sessions                                                  | > 99%                          |
| Keberhasilan instalasi + aktivasi dari klien yang membeli            | > 90%                          |
| Pengguna yang melakukan minimal 1 backup                             | > 40%                          |

Catatan: aplikasi tanpa akun dan tanpa Play Store, jadi metrik berbasis data penjual (penjualan, aktivasi, tiket dukungan, survei). Telemetri/crash report hanya opt-in dan anonim, diungkapkan di kebijakan privasi.

## 12. Risiko & Mitigasi

| Risiko                                                                | Dampak        | Mitigasi                                                                                                                             |
| --------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Kompatibilitas printer Bluetooth beragam                              | Tinggi        | Uji 3-4 merek sejak minggu pertama; fallback struk digital                                                                           |
| Pengguna kehilangan data (HP hilang/rusak)                            | Tinggi        | Pengingat backup, backup terjadwal, ekspor CSV                                                                                       |
| PIN terlupa tanpa akun                                                | Tinggi        | Kode pemulihan saat setup, jalur restore backup                                                                                      |
| Cakupan fitur terlalu luas                                            | Sedang        | Rilis bertahap; fokus segmen hero                                                                                                    |
| Persaingan (Moka, Majoo, Qasir, Olsera, dll.)                         | Sedang        | Pembeda: offline, tanpa akun, harga sangat murah/beli putus                                                                          |
| Pembajakan/penyebaran APK                                             | Tinggi        | Lisensi terikat ID perangkat (tanda tangan digital), obfuscation, harga terjangkau; terima bahwa pembajakan penuh tidak bisa dicegah |
| Kunci privat lisensi atau keystore bocor/hilang                       | Tinggi        | Simpan terenkripsi, cadangan di banyak tempat, akses terbatas                                                                        |
| Peringatan Play Protect / hambatan instalasi                          | Sedang        | Panduan instalasi bergambar, situs unduhan HTTPS, bantuan via WhatsApp                                                               |
| Bug setelah rilis tanpa saluran update                                | Sedang        | Uji beta di toko nyata cukup lama; perbaikan kritis dikirim manual via WhatsApp                                                      |
| Tidak ada kanal dukungan resmi                                        | Sedang        | FAQ dan panduan dalam aplikasi, tombol backup/ekspor jelas, panduan instalasi                                                        |
| Penggantian kunci tanpa batas disalahgunakan untuk membagikan lisensi | Sedang        | Catat riwayat permintaan di WhatsApp; kunci tetap per perangkat                                                                      |
| Data terbaca di perangkat root (tanpa enkripsi)                       | Rendah-Sedang | Risiko diterima; komunikasi jujur bahwa PIN mengunci aplikasi, bukan mengenkripsi data                                               |
| Kinerja buruk di HP murah                                             | Sedang        | Uji rutin di perangkat RAM 2 GB, FlashList, optimasi query                                                                           |
| Klaim pemasaran tidak akurat (QRIS, keamanan)                         | Sedang        | Klaim QRIS = pencatatan; jelaskan batas PIN                                                                                          |

## 13. Rencana & Milestone

| Milestone           | Perkiraan                      | Isi                                                                  |
| ------------------- | ------------------------------ | -------------------------------------------------------------------- |
| M0                  | Minggu 1                       | Riset 5-10 calon pengguna, uji printer, keputusan pertanyaan terbuka |
| M1                  | Minggu 2-4                     | Skema DB, produk, kategori, stok, layar kasir                        |
| M2                  | Minggu 5-6                     | Printer, struk, WhatsApp, barcode, jual per kg                       |
| M3                  | Minggu 7-8                     | Laporan, PIN, backup/restore, lisensi                                |
| Beta                | Minggu 9-10                    | Uji di toko nyata, perbaikan                                         |
| Uji internal v1.0   | Minggu 10-12                   | Build uji, belum dibagikan ke klien umum                             |
| Internal v1.1       | +4 minggu                      | Varian, QRIS catat, pelanggan, HPP, CSV                              |
| Internal v1.2       | +4 minggu                      | Meja, open bill, piutang, PPN                                        |
| **Rilis final APK** | Setelah v1.2 selesai dan diuji | Satu APK berisi seluruh fitur, dikirim ke klien                      |

## 14. Kriteria Penerimaan v1.0

- Semua fitur P0 berfungsi tanpa internet.
- Cetak struk berhasil di minimal 3 merek printer thermal berbeda.
- Backup lalu restore di perangkat lain mengembalikan seluruh data secara utuh.
- Tidak ada selisih antara total laporan dan jumlah transaksi non-void.
- Lolos uji di minimal 3 perangkat Android RAM 2-3 GB.
- Kode pemulihan dapat mereset PIN tanpa kehilangan data.
- Mode jual landscape dan layar lain portrait, tanpa kehilangan isi keranjang.
- Nilai HPP rata-rata sesuai perhitungan manual pada 5 skenario uji.
- Aktivasi lisensi bekerja offline; kunci untuk perangkat A ditolak di perangkat B.
- APK terpasang dan berjalan di perangkat Android 8.0+ tanpa Play Store.

## 15. Keputusan

| #   | Topik               | Keputusan                                                           |
| --- | ------------------- | ------------------------------------------------------------------- |
| 1   | Monetisasi          | Beli putus Rp 50.000; tanpa batas fitur/produk; tanpa masa uji coba |
| 2   | Mekanisme pembelian | Sekali bayar di luar aplikasi; kunci lisensi dikirim via WhatsApp   |
| 3   | Update              | Gratis seumur hidup; tidak ada saluran update (satu rilis final)    |
| 4   | Distribusi          | File APK langsung ke klien, tidak lewat Play Store                  |
| 5   | Ganti perangkat     | Penggantian kunci tidak terbatas, via WhatsApp                      |
| 6   | Dukungan pelanggan  | Tidak ada kanal resmi; FAQ dalam aplikasi                           |
| 7   | Pemulihan PIN       | Kode pemulihan 12 karakter + jalur restore backup                   |
| 8   | Enkripsi database   | Tidak diterapkan                                                    |
| 9   | Peran               | Kasir = pemilik, satu PIN                                           |
| 10  | Segmen              | Semua jenis usaha, fitur aktif sesuai pilihan onboarding            |
| 11  | HPP                 | Rata-rata bergerak                                                  |
| 12  | Nama produk         | Kasirhan (sudah dicek aman)                                         |
| 13  | Orientasi           | Landscape di mode jual, portrait di layar lain                      |

## 16. Pertanyaan Terbuka

Tidak ada. Semua keputusan produk sudah ditetapkan.
