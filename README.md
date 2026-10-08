# Sistem Lisensi Kasirhan

## Alur
1. Pembeli buka aplikasi -> layar aktivasi menampilkan ID Perangkat + tombol "Kirim via WhatsApp".
2. Pembeli membayar dan mengirim ID. Kamu menjalankan generator, lalu kirim kunci via WhatsApp.
3. Pembeli menempel kunci -> `activate(key)` -> aplikasi aktif (offline).

## Setup (sekali)
```
node tools/buat-kunci.js          # buat PRIVATE.pem + PUBLIC_KEY.txt
```
- Tempel isi PUBLIC_KEY.txt ke `PUBLIC_KEY_B64` di src/license.ts
- Isi `SELLER_WA` di src/license.ts
- CADANGKAN PRIVATE.pem (flashdisk + penyimpanan terenkripsi). Jangan commit ke git. Jangan ikut dibundel ke aplikasi.

## Tiap ada pembeli
```
node tools/buat-lisensi.js A1B2C3D4E5F60718 "Bu Sari" 081234567890
```
Kunci dicetak di terminal dan dicatat di lisensi-log.csv. Peringatan muncul bila:
- satu nomor memakai >= 3 ID perangkat berbeda
- satu ID perangkat sudah pernah dibuatkan kunci untuk nomor lain

## Pemakaian di aplikasi
```ts
import { isLicensed, activate, getDeviceId, openWhatsAppRequest } from './license';
// saat start: if (!(await isLicensed())) -> tampilkan layar aktivasi
```

## Uji wajib sebelum rilis
- Kunci perangkat A ditolak di perangkat B
- Kunci diubah satu karakter ditolak
- Aplikasi tetap aktif setelah restart tanpa internet
- Pakai keystore yang sama untuk semua build

## Catatan
- ID Perangkat bisa berubah setelah reset pabrik: pembeli cukup minta kunci baru (tanpa batas).
- Jangan simpan rahasia/kunci privat di dalam aplikasi.
