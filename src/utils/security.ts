import * as Crypto from 'expo-crypto';

export async function hashPin(pin: string, salt: string): Promise<string> {
  const combined = `${salt}|${pin}|kasirhan_pin`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
}

export function generateSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate 12-character uppercase recovery code formatted as XXXX-XXXX-XXXX
 */
export function generateRecoveryCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0, 1, I, O to avoid confusion
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `recovery|${normalized}|kasirhan`
  );
}

export async function verifyRecoveryCode(inputCode: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashRecoveryCode(inputCode);
  return inputHash === storedHash;
}
