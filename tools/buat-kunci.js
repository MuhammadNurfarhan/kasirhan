// Jalankan SEKALI: node tools/buat-kunci.js
// Membuat pasangan kunci Ed25519.
//  - PRIVATE.pem  : RAHASIA. Simpan & cadangkan di beberapa tempat aman. JANGAN masuk ke aplikasi/git.
//  - PUBLIC_KEY.txt : kunci publik (base64), ditempel ke src/license.ts
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '..');
const privPath = path.join(out, 'PRIVATE.pem');

if (fs.existsSync(privPath)) {
  console.error('PRIVATE.pem sudah ada. Dihentikan agar tidak menimpa kunci lama.');
  console.error('Menimpa kunci akan membuat SEMUA lisensi yang sudah dijual tidak valid.');
  process.exit(1);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
fs.writeFileSync(privPath, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });

const raw = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
const b64 = raw.toString('base64');
fs.writeFileSync(path.join(out, 'PUBLIC_KEY.txt'), b64 + '\n');

console.log('Selesai.');
console.log('PRIVATE.pem   -> simpan aman, cadangkan.');
console.log('PUBLIC_KEY    =', b64);
console.log('Tempel nilai PUBLIC_KEY di src/license.ts (konstanta PUBLIC_KEY_B64).');
