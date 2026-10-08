// Pemakaian:
//   node tools/buat-lisensi.js <ID_PERANGKAT> "<Nama Pembeli>" <NomorWA> [catatan]
// Contoh:
//   node tools/buat-lisensi.js A1B2C3D4E5F60718 "Bu Sari" 081234567890
//
// Hasil: kunci lisensi dicetak (kirim via WhatsApp) dan dicatat di lisensi-log.csv
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PRIVATE_PEM = path.join(ROOT, 'PRIVATE.pem');
const LOG = path.join(ROOT, 'lisensi-log.csv');
const WARN_DISTINCT_IDS = 3; // peringatan jika satu nomor meminta >= 3 ID berbeda

const [idArg, nama, nomor, catatan = ''] = process.argv.slice(2);
if (!idArg || !nama || !nomor) {
  console.error('Pemakaian: node tools/buat-lisensi.js <ID_PERANGKAT> "<Nama>" <NomorWA> [catatan]');
  process.exit(1);
}

const deviceId = idArg.trim().toUpperCase();
if (!/^[0-9A-F]{16}$/.test(deviceId)) {
  console.error('ID Perangkat tidak valid. Harus 16 karakter heksadesimal (0-9, A-F).');
  process.exit(1);
}
if (!fs.existsSync(PRIVATE_PEM)) {
  console.error('PRIVATE.pem tidak ditemukan. Jalankan dulu: node tools/buat-kunci.js');
  process.exit(1);
}

const csvEsc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
const parseLine = (line) => {
  const cells = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { cells.push(cur); cur = ''; }
    else cur += c;
  }
  cells.push(cur); return cells;
};

// Baca log lama untuk deteksi pola mencurigakan
const normNomor = nomor.replace(/\D/g, '').replace(/^0/, '62');
let rows = [];
if (fs.existsSync(LOG)) {
  rows = fs.readFileSync(LOG, 'utf8').split('\n').slice(1).filter(Boolean).map(parseLine);
} else {
  fs.writeFileSync(LOG, 'tanggal,nama,nomor_wa,id_perangkat,catatan\n');
}
const sameNomor = rows.filter((r) => (r[2] || '').replace(/\D/g, '').replace(/^0/, '62') === normNomor);
const distinctIds = new Set(sameNomor.map((r) => r[3]));
distinctIds.add(deviceId);

if (rows.some((r) => r[3] === deviceId && (r[2] || '').replace(/\D/g, '').replace(/^0/, '62') !== normNomor)) {
  console.warn('PERINGATAN: ID perangkat ini sebelumnya dibuatkan kunci untuk NOMOR LAIN. Periksa dulu.');
}
if (distinctIds.size >= WARN_DISTINCT_IDS) {
  console.warn(`PERINGATAN: nomor ini sudah memakai ${distinctIds.size} ID perangkat berbeda. Pastikan bukan pembagian lisensi.`);
}

const priv = crypto.createPrivateKey(fs.readFileSync(PRIVATE_PEM));
const sig = crypto.sign(null, Buffer.from('KASIRHAN|' + deviceId, 'utf8'), priv);
const key = sig.toString('base64url');

const tanggal = new Date().toISOString().slice(0, 16).replace('T', ' ');
fs.appendFileSync(LOG, [tanggal, nama, nomor, deviceId, catatan].map(csvEsc).join(',') + '\n');

console.log('\nKunci lisensi (kirim via WhatsApp):\n');
console.log(key);
console.log('\nTercatat di lisensi-log.csv\n');
