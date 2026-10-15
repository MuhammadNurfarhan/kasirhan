import { getDb, withTransaction } from "../db/database";
import type { Transaction, TransactionItem, CartItem } from "../types";
import { generateId } from "../utils/format";

/* ------------------------------------------------------------------ *
 * Helper tanggal. created_at disimpan sebagai ISO UTC (toISOString()),
 * tetapi "hari ini" bagi pemilik toko adalah hari di zona waktu perangkat.
 * Karena itu batas hari dihitung dari tanggal LOKAL lalu diubah ke ISO UTC,
 * dan dibandingkan dengan  >= awal  AND  < awal hari berikutnya.
 * ------------------------------------------------------------------ */
const pad = (n: number, w = 2) => String(n).padStart(w, "0");
export const localYmd = (d = new Date()) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

function parseDay(s: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) throw new Error(`Format tanggal tidak valid: ${s}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
export const dayStartIso = (s: string) => {
  const [y, m, d] = parseDay(s);
  return new Date(y, m - 1, d).toISOString();
};
export const nextDayStartIso = (s: string) => {
  const [y, m, d] = parseDay(s);
  return new Date(y, m - 1, d + 1).toISOString();
};

export interface CreateTransactionParams {
  customerId: string | null;
  customerName: string | null;
  tableNumber: string | null;
  paymentMethod: "cash" | "qris";
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  note: string | null;
}

function assertValid(p: CreateTransactionParams) {
  if (!p.items.length) throw new Error("Keranjang kosong");
  if (p.items.some((i) => !(Number(i.quantity) > 0)))
    throw new Error("Jumlah item harus lebih dari 0");
  if (!(p.totalAmount > 0))
    throw new Error("Total transaksi harus lebih dari 0");
  if (p.paymentMethod === "cash" && p.paidAmount < p.totalAmount)
    throw new Error("Uang diterima kurang dari total");
}

export async function createTransaction(
  params: CreateTransactionParams,
): Promise<Transaction> {
  assertValid(params);

  return await withTransaction(async (db) => {
    const txId = generateId();
    const nowDate = new Date();
    const now = nowDate.toISOString();

    // Nomor faktur berurutan per HARI LOKAL (bukan hari UTC)
    const ymd = localYmd(nowDate);
    const countRow = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM transactions WHERE invoice_number LIKE ?",
      [`KSH-${ymd}%`],
    );
    const invoiceNumber = `KSH-${ymd}-${pad((countRow?.cnt || 0) + 1, 4)}`;

    // 1. Header transaksi
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
      ],
    );

    const insertedItems: TransactionItem[] = [];

    // 2. Item + kurangi stok
    for (const item of params.items) {
      const itemId = generateId();

      const v = await db.getFirstAsync<any>(
        "SELECT cost_price, stock FROM product_variants WHERE id = ?",
        [item.variantId],
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
        ],
      );

      if (item.trackStock) {
        const newStock = Math.max(0, currentStock - item.quantity);
        // Yang benar-benar dikurangi (bisa lebih kecil dari qty bila stok kurang).
        // Dicatat apa adanya agar void bisa mengembalikan persis jumlah yang sama.
        const deducted = currentStock - newStock;

        await db.runAsync(
          "UPDATE product_variants SET stock = ? WHERE id = ?",
          [newStock, item.variantId],
        );
        await db.runAsync(
          `INSERT INTO stock_movements (
            id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?, ?)`,
          [
            generateId(),
            item.variantId,
            -deducted,
            snapshotCost,
            currentStock,
            newStock,
            txId,
            `Penjualan ${invoiceNumber}`,
            now,
          ],
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

    return {
      id: txId,
      invoice_number: invoiceNumber,
      customer_id: params.customerId,
      customer_name: params.customerName,
      table_number: params.tableNumber,
      payment_method: params.paymentMethod,
      status: "completed",
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

export async function getTransactions(
  options: {
    date?: string; // YYYY-MM-DD (hari lokal)
    startDate?: string; // YYYY-MM-DD (hari lokal, inklusif)
    endDate?: string; // YYYY-MM-DD (hari lokal, inklusif)
    status?: "completed" | "void" | "all";
    limit?: number;
  } = {},
): Promise<Transaction[]> {
  const db = await getDb();
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params: any[] = [];

  const from = options.date ?? options.startDate;
  const to = options.date ?? options.endDate;
  if (from) {
    sql += " AND created_at >= ?";
    params.push(dayStartIso(from));
  }
  if (to) {
    sql += " AND created_at < ?";
    params.push(nextDayStartIso(to));
  }

  if (options.status && options.status !== "all") {
    sql += " AND status = ?";
    params.push(options.status);
  }

  sql += " ORDER BY created_at DESC";
  if (options.limit) {
    sql += " LIMIT ?";
    params.push(Math.max(1, Math.floor(options.limit)));
  }

  return await db.getAllAsync<Transaction>(sql, params);
}

export async function getTransactionWithItems(
  id: string,
): Promise<Transaction | null> {
  const db = await getDb();
  const tx = await db.getFirstAsync<Transaction>(
    "SELECT * FROM transactions WHERE id = ?",
    [id],
  );
  if (!tx) return null;

  const items = await db.getAllAsync<TransactionItem>(
    "SELECT * FROM transaction_items WHERE transaction_id = ? ORDER BY rowid ASC",
    [id],
  );
  return { ...tx, items };
}

/**
 * Void transaksi: transaksi TIDAK dihapus, hanya ditandai void + alasan.
 * Stok dikembalikan persis sebesar yang dulu dikurangi (dibaca dari stock_movements),
 * sehingga aman walau stok saat itu kurang dan walau pengaturan track_stock berubah kemudian.
 * Piutang terkait ditandai 'void' (riwayat tidak dihapus).
 */
export async function voidTransaction(
  transactionId: string,
  reason: string,
): Promise<void> {
  const why = reason.trim();
  if (why.length < 3) throw new Error("Alasan void wajib diisi");

  await withTransaction(async (db) => {
    const tx = await db.getFirstAsync<Transaction>(
      "SELECT * FROM transactions WHERE id = ?",
      [transactionId],
    );
    if (!tx) throw new Error("Transaksi tidak ditemukan");
    if (tx.status === "void")
      throw new Error("Transaksi sudah dibatalkan sebelumnya");

    const now = new Date().toISOString();

    const moves = await db.getAllAsync<{
      variant_id: string;
      quantity: number;
      cost_price: number;
    }>(
      "SELECT variant_id, quantity, cost_price FROM stock_movements WHERE ref_id = ? AND type = 'sale'",
      [transactionId],
    );

    for (const m of moves) {
      const give = -Number(m.quantity); // quantity penjualan bernilai negatif
      if (!(give > 0)) continue;

      const v = await db.getFirstAsync<any>(
        "SELECT stock FROM product_variants WHERE id = ?",
        [m.variant_id],
      );
      const prevStock = v ? Number(v.stock) : 0;
      const restoredStock = prevStock + give;

      await db.runAsync("UPDATE product_variants SET stock = ? WHERE id = ?", [
        restoredStock,
        m.variant_id,
      ]);
      await db.runAsync(
        `INSERT INTO stock_movements (
          id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
        ) VALUES (?, ?, 'void', ?, ?, ?, ?, ?, ?, ?)`,
        [
          generateId(),
          m.variant_id,
          give,
          Number(m.cost_price),
          prevStock,
          restoredStock,
          transactionId,
          `Void: ${why}`,
          now,
        ],
      );
    }

    await db.runAsync(
      "UPDATE transactions SET status = 'void', void_at = ?, void_reason = ? WHERE id = ?",
      [now, why, transactionId],
    );

    // Jangan hapus piutang: tandai void agar riwayat tetap ada.
    // (Pastikan kolom/constraint debts.status menerima nilai 'void'.)
    await db.runAsync(
      "UPDATE debts SET status = 'void', remaining_amount = 0, updated_at = ? WHERE transaction_id = ?",
      [now, transactionId],
    );
  });
}

export interface ReportSummary {
  omzet: number; // penjualan bersih, TANPA PPN
  totalHpp: number;
  grossProfit: number;
  transactionCount: number;
  avgTransaction: number;
  cashTotal: number;
  qrisTotal: number;
  topProducts: Array<{
    name: string;
    totalQty: number; // pcs, atau kg/liter untuk produk timbang
    totalAmount: number;
  }>;
}

/** startDate/endDate: YYYY-MM-DD hari lokal, keduanya inklusif. */
export async function getReportSummary(
  startDate: string,
  endDate: string,
): Promise<ReportSummary> {
  const db = await getDb();
  const from = dayStartIso(startDate);
  const to = nextDayStartIso(endDate);

  // PPN bukan pendapatan toko; hitung omzet dan laba tanpa PPN
  const net = "(total_amount - COALESCE(tax_amount, 0))";

  const aggRow = await db.getFirstAsync<any>(
    `SELECT
      COUNT(*) as tx_count,
      COALESCE(SUM(${net}), 0) as omzet,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN ${net} ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'qris' THEN ${net} ELSE 0 END), 0) as qris_total
     FROM transactions
     WHERE status = 'completed' AND created_at >= ? AND created_at < ?`,
    [from, to],
  );

  // "/ 1000.0": tanpa .0 SQLite membagi bilangan bulat dan membuang pecahan
  const hppRow = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(
        CASE WHEN ti.is_weighted = 1 THEN (ti.cost_price * ti.quantity) / 1000.0
             ELSE ti.cost_price * ti.quantity END
      ), 0) as total_hpp
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at < ?`,
    [from, to],
  );

  const topRows = await db.getAllAsync<any>(
    `SELECT
      MAX(ti.product_name) as name,
      SUM(CASE WHEN ti.is_weighted = 1 THEN ti.quantity / 1000.0 ELSE ti.quantity END) as totalQty,
      SUM(ti.subtotal) as totalAmount
     FROM transaction_items ti
     JOIN transactions t ON ti.transaction_id = t.id
     WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at < ?
     GROUP BY ti.product_id
     ORDER BY totalAmount DESC
     LIMIT 10`,
    [from, to],
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
    topProducts: topRows.map((r) => ({
      name: r.name,
      totalQty: Math.round(Number(r.totalQty) * 1000) / 1000, // 3 desimal, jangan dibulatkan ke bilangan bulat
      totalAmount: Number(r.totalAmount),
    })),
  };
}
