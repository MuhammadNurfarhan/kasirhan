import { getDb } from '../db/database';
import { BusinessProfile } from '../types';
import { hashPin, generateSalt, hashRecoveryCode, verifyRecoveryCode } from '../utils/security';

export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM business_profile WHERE id = 1');
  if (!row) return null;
  return {
    name: row.name,
    business_type: row.business_type,
    address: row.address || '',
    phone: row.phone || '',
    footer_note: row.footer_note || '',
    paper_size: row.paper_size || '58mm',
    tax_enabled: Boolean(row.tax_enabled),
    tax_percentage: row.tax_percentage ?? 11,
    qris_payload: row.qris_payload || null,
    table_enabled: Boolean(row.table_enabled),
  };
}

export async function saveBusinessProfile(profile: BusinessProfile): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO business_profile (
      id, name, business_type, address, phone, footer_note,
      paper_size, tax_enabled, tax_percentage, qris_payload, table_enabled
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      profile.name,
      profile.business_type,
      profile.address,
      profile.phone,
      profile.footer_note,
      profile.paper_size,
      profile.tax_enabled ? 1 : 0,
      profile.tax_percentage,
      profile.qris_payload,
      profile.table_enabled ? 1 : 0,
    ]
  );
}

export async function isSetupCompleted(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT is_setup_completed FROM auth_security WHERE id = 1');
  return Boolean(row?.is_setup_completed);
}

export async function setupSecurity(pin: string, recoveryCode: string): Promise<void> {
  const db = await getDb();
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  const recoveryHash = await hashRecoveryCode(recoveryCode);

  await db.runAsync(
    `INSERT OR REPLACE INTO auth_security (
      id, pin_hash, pin_salt, recovery_code_hash, is_locked, is_setup_completed
    ) VALUES (1, ?, ?, ?, 0, 1)`,
    [pinHash, salt, recoveryHash]
  );
}

export async function verifyUserPin(pin: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT pin_hash, pin_salt FROM auth_security WHERE id = 1');
  if (!row || !row.pin_hash || !row.pin_salt) return false;
  const computed = await hashPin(pin, row.pin_salt);
  return computed === row.pin_hash;
}

export async function resetPinWithRecoveryCode(recoveryCode: string, newPin: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT recovery_code_hash FROM auth_security WHERE id = 1');
  if (!row || !row.recovery_code_hash) return false;

  const valid = await verifyRecoveryCode(recoveryCode, row.recovery_code_hash);
  if (!valid) return false;

  const salt = generateSalt();
  const pinHash = await hashPin(newPin, salt);
  await db.runAsync(
    'UPDATE auth_security SET pin_hash = ?, pin_salt = ?, is_locked = 0 WHERE id = 1',
    [pinHash, salt]
  );
  return true;
}
