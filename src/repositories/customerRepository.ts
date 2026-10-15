import { getDb } from '../db/database';
import { Customer } from '../types';
import { generateId } from '../utils/format';

export async function getCustomers(search?: string): Promise<Customer[]> {
  const db = await getDb();
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params: any[] = [];

  if (search && search.trim()) {
    sql += ' AND (LOWER(name) LIKE ? OR phone LIKE ?)';
    const q = `%${search.trim().toLowerCase()}%`;
    params.push(q, q);
  }

  sql += ' ORDER BY name ASC';
  const rows = await db.getAllAsync<any>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    created_at: r.created_at,
  }));
}

export async function createCustomer(name: string, phone?: string, address?: string): Promise<Customer> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name.trim(), phone?.trim() || null, address?.trim() || null, now]
  );

  return {
    id,
    name: name.trim(),
    phone: phone?.trim() || null,
    address: address?.trim() || null,
    created_at: now,
  };
}

export async function updateCustomer(id: string, name: string, phone?: string, address?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
    [name.trim(), phone?.trim() || null, address?.trim() || null, id]
  );
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM customers WHERE id = ?', [id]);
}

