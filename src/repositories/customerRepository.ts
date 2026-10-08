import { getDb, withTransaction } from '../db/database';
import { Customer, Debt, DebtPayment } from '../types';
import { generateId } from '../utils/format';

export async function getCustomers(search?: string): Promise<Customer[]> {
  const db = await getDb();
  let sql = `
    SELECT c.*, 
      COALESCE(
        (SELECT SUM(remaining_amount) FROM debts d WHERE d.customer_id = c.id AND d.status != 'paid'), 0
      ) as total_debt
    FROM customers c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search && search.trim()) {
    sql += ' AND (LOWER(c.name) LIKE ? OR c.phone LIKE ?)';
    const q = `%${search.trim().toLowerCase()}%`;
    params.push(q, q);
  }

  sql += ' ORDER BY c.name ASC';
  const rows = await db.getAllAsync<any>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    address: r.address,
    total_debt: Number(r.total_debt || 0),
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
    total_debt: 0,
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

export async function getCustomerDebts(customerId: string): Promise<Debt[]> {
  const db = await getDb();
  return await db.getAllAsync<Debt>(
    'SELECT * FROM debts WHERE customer_id = ? ORDER BY created_at DESC',
    [customerId]
  );
}

export async function payDebt(debtId: string, amount: number, note: string = ''): Promise<void> {
  await withTransaction(async (db) => {
    const debt = await db.getFirstAsync<Debt>('SELECT * FROM debts WHERE id = ?', [debtId]);
    if (!debt) throw new Error('Catatan piutang tidak ditemukan');

    const paymentAmount = Math.min(amount, debt.remaining_amount);
    const newPaid = debt.paid_amount + paymentAmount;
    const newRemaining = Math.max(0, debt.remaining_amount - paymentAmount);
    const newStatus = newRemaining === 0 ? 'paid' : 'partial';
    const now = new Date().toISOString();

    // 1. Record payment history
    await db.runAsync(
      'INSERT INTO debt_payments (id, debt_id, amount, note, created_at) VALUES (?, ?, ?, ?, ?)',
      [generateId(), debtId, paymentAmount, note.trim() || 'Pembayaran cicilan piutang', now]
    );

    // 2. Update debt record
    await db.runAsync(
      'UPDATE debts SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = ? WHERE id = ?',
      [newPaid, newRemaining, newStatus, now, debtId]
    );
  });
}
