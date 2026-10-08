import { getDb } from '../db/database';
import { generateId } from '../utils/format';

export interface HeldCartRecord {
  id: string;
  name: string;
  table_number: string | null;
  cart_json: string;
  created_at: string;
}

export async function saveHeldCart(name: string, tableNumber: string | null, cartJson: string): Promise<string> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO held_carts (id, name, table_number, cart_json, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), tableNumber?.trim() || null, cartJson, now]
  );
  return id;
}

export async function getHeldCarts(): Promise<HeldCartRecord[]> {
  const db = await getDb();
  return await db.getAllAsync<HeldCartRecord>('SELECT * FROM held_carts ORDER BY created_at DESC');
}

export async function deleteHeldCart(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM held_carts WHERE id = ?', [id]);
}
