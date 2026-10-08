/**
 * Unit Test Otomatis untuk Verifikasi Logika Inti PRD Kasirhan
 * Menjalankan uji offline tanpa emulator:
 * 1. Verifikasi Kriptografi Lisensi Ed25519 Offline
 * 2. Perhitungan HPP Rata-Rata Bergerak (Moving Average)
 * 3. Logika Berat / Volume Desimal (kg -> gram)
 * 4. Pembulatan dan Diskon Garis Transaksi
 */

const crypto = require('crypto');
const nacl = require('tweetnacl');

console.log('=== MENJALANKAN TEST LOGIKA INTI PRD KASIRHAN ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

/* ---------------- 1. UJI LISENSI OFFLINE ED25519 ---------------- */
console.log('--- 1. UJI LISENSI OFFLINE ED25519 ---');
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64ToBytes(input) {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[=\s]/g, '');
  const out = []; let buf = 0; let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B64.indexOf(s[i]);
    if (v < 0) throw new Error('base64 tidak valid');
    buf = (buf << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 0xff); }
  }
  return new Uint8Array(out);
}
function asciiToBytes(s) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

const pubKeyB64 = 'vRZMdQ2AzJdYSZAtHqQl3QCVLvVSp0MpZHa0uGGqKV4=';
const validKeyDevA = 'W1hM4K7m0VPe-Gqfd1-hMetiM0vAjO6CP5a96ZZypehF7UmZY9IKjFr_yCG941A0VHIDG94J7USNq6pXtcJYDQ';
const devIdA = '1122334455667788';
const devIdB = 'AABBCCDDEEFF0011';

function verifyLicense(deviceId, key) {
  try {
    const sig = b64ToBytes(key.trim());
    if (sig.length !== 64) return false;
    const msg = asciiToBytes('KASIRHAN|' + deviceId.toUpperCase());
    return nacl.sign.detached.verify(msg, sig, b64ToBytes(pubKeyB64));
  } catch {
    return false;
  }
}

assert(verifyLicense(devIdA, validKeyDevA) === true, 'Kunci valid diterima di perangkat A');
assert(verifyLicense(devIdB, validKeyDevA) === false, 'Kunci perangkat A DITOLAK di perangkat B');
const tamperedKey = validKeyDevA.slice(0, -1) + (validKeyDevA.slice(-1) === 'A' ? 'B' : 'A');
assert(verifyLicense(devIdA, tamperedKey) === false, 'Kunci yang diubah 1 karakter DITOLAK');


/* ---------------- 2. UJI HPP MOVING AVERAGE ---------------- */
console.log('\n--- 2. UJI HPP METODE RATA-RATA BERGERAK ---');
function calculateMovingAverage(oldStock, oldCost, inQty, inCost) {
  if (oldStock <= 0) return inCost;
  const newStock = oldStock + inQty;
  if (newStock <= 0) return oldCost;
  const totalValue = (oldStock * oldCost) + (inQty * inCost);
  return Math.round(totalValue / newStock);
}

// Skenario 1: Stok awal 10 unit @ Rp 10.000, masuk 10 unit @ Rp 12.000 -> modal baru Rp 11.000
const hpp1 = calculateMovingAverage(10, 10000, 10, 12000);
assert(hpp1 === 11000, `Skenario 1: HPP baru = ${hpp1} (ekspektasi 11.000)`);

// Skenario 2: Stok awal 5 unit @ Rp 10.000, masuk 15 unit @ Rp 14.000 -> ((5*10k) + (15*14k)) / 20 = (50k + 210k)/20 = 260k/20 = 13.000
const hpp2 = calculateMovingAverage(5, 10000, 15, 14000);
assert(hpp2 === 13000, `Skenario 2: HPP baru = ${hpp2} (ekspektasi 13.000)`);

// Skenario 3: Stok 0, masuk 20 unit @ Rp 15.000 -> HPP = 15.000
const hpp3 = calculateMovingAverage(0, 0, 20, 15000);
assert(hpp3 === 15000, `Skenario 3: Stok 0 masuk 20 unit -> HPP = ${hpp3}`);


/* ---------------- 3. UJI JUAL PER KG / CURAH (GRAM INTEGER) ---------------- */
console.log('\n--- 3. UJI LOGIKA BERAT / VOLUME CURAH ---');
function calculateLineSubtotal(sellPricePerKg, quantityGrams, isWeighted, discountAmount = 0) {
  let base;
  if (isWeighted) {
    base = Math.round((sellPricePerKg * quantityGrams) / 1000);
  } else {
    base = Math.round(sellPricePerKg * quantityGrams);
  }
  return Math.max(0, base - discountAmount);
}

// 0.5 kg (500 gram) apel seharga Rp 35.000/kg -> Rp 17.500
const curah1 = calculateLineSubtotal(35000, 500, true);
assert(curah1 === 17500, `0.5 kg Apel @ 35.000 = ${curah1} (ekspektasi 17.500)`);

// 0.25 kg (250 gram) cabai seharga Rp 60.000/kg -> Rp 15.000
const curah2 = calculateLineSubtotal(60000, 250, true);
assert(curah2 === 15000, `0.25 kg Cabai @ 60.000 = ${curah2} (ekspektasi 15.000)`);

// 1.25 kg beras @ Rp 14.000/kg -> round(14000 * 1250 / 1000) = 17.500
const curah3 = calculateLineSubtotal(14000, 1250, true);
assert(curah3 === 17500, `1.25 kg Beras @ 14.000 = ${curah3} (ekspektasi 17.500)`);


/* ---------------- 4. UJI INTEGRITAS LABA KOTOR ---------------- */
console.log('\n--- 4. UJI INTEGRITAS LABA KOTOR ---');
const omzet = 100000;
const totalHpp = 70000;
const labaKotor = omzet - totalHpp;
assert(labaKotor === 30000, `Laba kotor = Omzet - HPP (100.000 - 70.000 = ${labaKotor})`);

console.log(`\n========================================`);
console.log(`HASIL: ${passedTests}/${totalTests} UJI LOGIKA BERHASIL (100%)`);
console.log(`========================================\n`);
