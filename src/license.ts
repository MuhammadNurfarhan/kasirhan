// src/license.ts
// Dependensi:
//   npx expo install expo-application expo-crypto expo-secure-store expo-linking
//   npm i tweetnacl
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Linking, Platform } from 'react-native';
import nacl from 'tweetnacl';

// Tempel isi PUBLIC_KEY.txt hasil `node tools/buat-kunci.js`
const PUBLIC_KEY_B64 = 'vRZMdQ2AzJdYSZAtHqQl3QCVLvVSp0MpZHa0uGGqKV4=';

// Nomor WhatsApp penjual, format internasional tanpa + (contoh: 6281234567890)
export const SELLER_WA = '62XXXXXXXXXXX';

const STORE_KEY = 'kasirhan_license_v1';
const MSG_PREFIX = 'KASIRHAN|';

/* ---------- helper base64 / base64url (tanpa dependensi tambahan) ---------- */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64ToBytes(input: string): Uint8Array {
  const s = input.replace(/-/g, '+').replace(/_/g, '/').replace(/[=\s]/g, '');
  const out: number[] = [];
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = B64.indexOf(s[i]);
    if (v < 0) throw new Error('base64 tidak valid');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function asciiToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/* ---------- ID Perangkat ---------- */
let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  const androidId =
    Platform.OS === 'android' ? Application.getAndroidId() : 'non-android';
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${androidId}|kasirhan`,
  );
  cachedId = hash.slice(0, 16).toUpperCase(); // 16 karakter heksadesimal
  return cachedId;
}

/* ---------- Verifikasi ---------- */
export function verifyLicense(deviceId: string, licenseKey: string): boolean {
  try {
    const sig = b64ToBytes(licenseKey.trim());
    if (sig.length !== 64) return false;
    const msg = asciiToBytes(MSG_PREFIX + deviceId.toUpperCase());
    return nacl.sign.detached.verify(msg, sig, b64ToBytes(PUBLIC_KEY_B64));
  } catch {
    return false;
  }
}

/* ---------- Aktivasi & pengecekan ---------- */
/** Dipanggil dari layar aktivasi. Mengembalikan true jika kunci valid dan tersimpan. */
export async function activate(licenseKey: string): Promise<boolean> {
  const id = await getDeviceId();
  const key = licenseKey.trim();
  if (!verifyLicense(id, key)) return false;
  await SecureStore.setItemAsync(STORE_KEY, key);
  return true;
}

/** Dipanggil tiap aplikasi dibuka. true = boleh masuk, false = tampilkan layar aktivasi. */
export async function isLicensed(): Promise<boolean> {
  try {
    const key = await SecureStore.getItemAsync(STORE_KEY);
    if (!key) return false;
    return verifyLicense(await getDeviceId(), key);
  } catch {
    return false;
  }
}

/* ---------- Tombol "Kirim via WhatsApp" ---------- */
export async function openWhatsAppRequest(buyerName?: string): Promise<void> {
  const id = await getDeviceId();
  const text =
    `Halo, saya ingin aktivasi Kasirhan.\n` +
    (buyerName ? `Nama: ${buyerName}\n` : '') +
    `ID Perangkat: ${id}`;
  await Linking.openURL(`https://wa.me/${SELLER_WA}?text=${encodeURIComponent(text)}`);
}
