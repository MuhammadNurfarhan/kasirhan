import { getDb, withTransaction } from '../db/database';
import { Transaction, TransactionItem, CartItem } from '../types';
import { generateId, generateInvoiceNumber } from '../utils/format';

export interface CreateTransactionParams {
  customerId: string | null;
  customerName: string | null;
  tableNumber: string | null;
  paymentMethod: 'cash' | 'qris' | 'debt';
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  note: string | null;
  dueDate?: string | null; // for debt
}

export async function createTransaction(params: CreateTransactionParams): Promise<Transaction> {
  return await withTransaction(async (db) => {
    const txId = generateId();
    const now = new Date().toISOString();

    // Generate unique sequential invoice number for today
    const datePrefix = `KSH-${now.slice(0, 10).replace(/-/g, '')}%`;
    const countRow = await db.getFirstAsync<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM transactions WHERE invoice_number LIKE ?',
      [datePrefix]
    );
    const seq = (countRow?.cnt || 0) + 1;
    const invoiceNumber = generateInvoiceNumber(seq);

    // 1. Insert Transaction Header
    await db.runAsync(
      `INSERT INTO transactions (
        id, invoice_number, customer_id, customer_name, table_number,
        payment_method, status, subtotal, discount_amount, discount_percent,
        tax_amount, total_amount, paid_amount, change_amount, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txId,
        invoiceNumber,
        params.customerId,
        params.customerName,
        params.tableNumber,
        params.paymentMethod,
        params.subtotal,
        params.discountAmount,
        params.discountPercent,
        params.taxAmount,
        params.totalAmount,
        params.paidAmount,
        params.changeAmount,
        params.note,
        now,
      ]
    );

    const insertedItems: TransactionItem[] = [];

    // 2. Insert Items & Decrement Stock atomically
    for (const item of params.items) {
      const itemId = generateId();

      // Fetch latest variant cost_price snapshot and stock
      const v = await db.getFirstAsync<any>(
        'SELECT cost_price, stock FROM product_variants WHERE id = ?',
        [item.variantId]
      );
      const snapshotCost = v ? Number(v.cost_price) : item.costPrice;
      const currentStock = v ? Number(v.stock) : item.availableStock;

      await db.runAsync(
        `INSERT INTO transaction_items (
          id, transaction_id, product_id, variant_id, product_name,
          variant_name, unit, quantity, sell_price, cost_price,
          discount_amount, subtotal, is_weighted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itemId,
          txId,
          item.productId,
          item.variantId,
          item.productName,
          item.variantName,
          item.unit,
          item.quantity,
          item.sellPrice,
          snapshotCost,
          item.discountAmount,
          item.subtotal,
          item.isWeighted ? 1 : 0,
        ]
      );

      // Decrement stock if track_stock is enabled
      if (item.trackStock) {
        const newStock = Math.max(0, currentStock - item.quantity);
        await db.runAsync(
          'UPDATE product_variants SET stock = ? WHERE id = ?',
          [newStock, item.variantId]
        );

        // Record stock movement
        await db.runAsync(
          `INSERT INTO stock_movements (
            id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, 'Penjualan ' || ?, ?)`,
          [
            generateId(),
            item.variantId,
            -item.quantity,
            snapshotCost,
            currentStock,
            newStock,
            txId,
            invoiceNumber,
            now,
          ]
        );
      }

      insertedItems.push({
        id: itemId,
        transaction_id: txId,
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productName,
        variant_name: item.variantName,
        unit: item.unit,
        quantity: item.quantity,
        sell_price: item.sellPrice,
        cost_price: snapshotCost,
        discount_amount: item.discountAmount,
        subtotal: item.subtotal,
        is_weighted: item.isWeighted,
      });
    }

    // 3. If payment method is 'debt', record to debts table
    if (params.paymentMethod === 'debt' && params.customerId) {
      const debtId = generateId();
      const remaining = Math.max(0, params.totalAmount - params.paidAmount);
      const status = remaining === 0 ? 'paid' : params.paidAmount > 0 ? 'partial' : 'unpaid';

      await db.runAsync(
        `INSERT INTO debts (
          id, transaction_id, customer_id, total_amount, paid_amount, remaining_amount, status, due_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          debtId,
          txId,
          params.customerId,
          params.totalAmount,
          params.paidAmount,
          remaining,
          status,
          params.dueDate || null,
          now,
          now,
        ]
      );
    }

    return {
      id: txId,
      invoice_number: invoiceNumber,
      customer_id: params.customerId,
      customer_name: params.customerName,
      table_number: params.tableNumber,
      payment_method: params.paymentMethod,
      status: 'completed',
      subtotal: params.subtotal,
      discount_amount: params.discountAmount,
      discount_percent: params.discountPercent,
      tax_amount: params.taxAmount,
      total_amount: params.totalAmount,
      paid_amount: params.paidAmount,
      change_amount: params.changeAmount,
      note: params.note,
      created_at: now,
      void_at: null,
      void_reason: null,
      items: insertedItems,
    };
  });
}

export async function getTransactions(options: {
  date?: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  status?: 'completed' | 'void' | 'all';
  limit?: number;
} = {}): Promise<Transaction[]> {
  const db = await getDb();
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: any[] = [];

  if (options.date) {
    sql += ' AND created_at LIKE ?';
    params.push(`${options.date}%`);
  } else if (options.startDate && options.endDate) {
    sql += ' AND created_at >= ? AND created_at <= ?';
    params.push(options.startDate, options.endDate + 'T23:59:59');
  }

  if (options.status && options.status !== 'all') {
    sql += ' AND status = ?';
    params.push(options.status);
  }

  sql += ' ORDER BY created_at DESC';
  if (options.limit) {
    sql += ` LIMIT ${options.limit}`;
  }

  return await db.getAllAsync<Transaction>(sql, params);
}

export async function getTransactionWithItems(id: string): Promise<Transaction | null> {
  const db = await getDb();
  const tx = await db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!tx) return null;

  const items = await db.getAllAsync<TransactionItem>(
    'SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY id ASC',
    [id]
  );
  return { ...tx, items };
}

/**
 * Void a transaction.
 * Restores product stock atomically, logs stock movement 'void',
 * marks transaction status = 'void' with reason.
 */
export async function voidTransaction(transactionId: string, reason: string): Promise<void> {
  await withTransaction(async (db) => {
    const tx = await db.getFirstAsync<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );
    if (!tx) throw new Error('Transaksi tidak ditemukan');
    if (tx.status === 'void') throw new Error('Transaksi sudah dibatalkan sebelumnya');

    const now = new Date().toISOString();

    // 1. Get all items
    const items = await db.getAllAsync<any>(
      `SELECT ti.*, p.track_stock 
       FROM transaction_items ti 
       JOIN products p ON ti.product_id = p.id 
       WHERE ti.transaction_id = ?`,
      [transactionId]
    );

    // 2. Restore stocks
    for (const item of items) {
      if (item.track_stock) {
        const v = await db.getFirstAsync<any>(
          'SELECT stock FROM product_variants WHERE id = ?',
          [item.variant_id]
        );
        const prevStock = v ? Number(v.stock) : 0;
        const restoredStock = prevStock + Number(item.quantity);

        await db.runAsync(
          'UPDATE product_variants SET stock = ? WHERE id = ?',
          [restoredStock, item.variant_id]
        );

        await db.runAsync(
          `INSERT INTO stock_movements (
            id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
          ) VALUES (?, ?, 'void', ?, ?, ?, ?, ?, 'Void: ' || ?, ?)`,
          [
            generateId(),
            item.variant_id,
            Number(item.quantity),
            Number(item.cost_price),
            prevStock,
            restoredStock,
            transactionId,
            reason.trim(),
            now,
          ]
        );
      }
    }

    // 3. Mark transaction as void
    await db.runAsync(
      'UPDATE transactions SET status = "void", void_at = ?, void_reason = ? WHERE id = ?',
      [now, reason.trim(), transactionId]
    );

    // 4. Cancel debt if any
    await db.runAsync(
      'DELETE FROM debts WHERE transaction_id = ?',
      [transactionId]
    );
  });
}

export interface ReportSummary {
  omzet: number;
  totalHpp: number;
  grossProfit: number;
  transactionCount: number;
  avgTransaction: number;
  cashTotal: number;
  qrisTotal: number;
  debtTotal: number;
  topProducts: Array<{
    name: string;
    totalQty: number;
    totalAmount: number;
  }>;
}

export async function getReportSummary(startDate: string, endDate: string): Promise<ReportSummary> {
  const db = await getDb();
  const start = startDate.includes('T') ? startDate : `${startDate}T00:00:00`;
  const end = endDate.includes('T') ? endDate : `${endDate}T23:59:59`;

  const aggRow = await db.getFirstAsync<any>(
    `SELECT 
      COUNT(*) as tx_count,
      COALESCE(SUM(total_amount), 0) as omzet,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN total_amount ELSE 0 END), 0) as qris_total,
      COALESCE(SUM(CASE WHEN payment_method = 'debt' THEN total_amount ELSE 0 END), 0) as debt_total
     FROM transactions 
     WHERE status = 'completed' AND created_at >= ? AND created_at <= ?`,
    [start, end]
  );

  const hppRow = await db.getFirstAsync<any>(
    `SELECT 
      COALESCE(SUM(
        CASE 
          WHEN ti.is_weighted = 1 THEN (ti.cost_price * ti.quantity) / 1000
          ELSE ti.cost_price * ti.quantity
        END
      ), 0) as total_hpp
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at <= ?`,
    [start, end]
  );

  const topRows = await db.getAllAsync<any>(
    `SELECT 
      ti.product_name as name,
      SUM(CASE WHEN ti.is_weighted = 1 THEN ti.quantity / 1000 ELSE ti.quantity END) as totalQty,
      SUM(ti.subtotal) as totalAmount
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at <= ?
     GROUP BY ti.product_name
     ORDER BY totalAmount DESC
     LIMIT 10`,
    [start, end]
  );

  const omzet = Number(aggRow?.omzet || 0);
  const totalHpp = Math.round(Number(hppRow?.total_hpp || 0));
  const txCount = Number(aggRow?.tx_count || 0);

  return {
    omzet,
    totalHpp,
    grossProfit: omzet - totalHpp,
    transactionCount: txCount,
    avgTransaction: txCount > 0 ? Math.round(omzet / txCount) : 0,
    cashTotal: Number(aggRow?.cash_total || 0),
    qrisTotal: Number(aggRow?.qris_total || 0),
    debtTotal: Number(aggRow?.debt_total || 0),
    topProducts: topRows.map((r) => ({
      name: r.name,
      totalQty: Math.round(Number(r.totalQty)),
      totalAmount: Number(r.totalAmount),
    })),
  };
}
