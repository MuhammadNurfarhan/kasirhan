import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDb, withTransaction } from '../db/database';

export interface BackupPayload {
  version: number;
  appName: string;
  timestamp: string;
  businessProfile: any;
  categories: any[];
  products: any[];
  productVariants: any[];
  stockMovements: any[];
  customers: any[];
  transactions: any[];
  transactionItems: any[];
  debts: any[];
  debtPayments: any[];
}

export async function createBackup(): Promise<string> {
  const db = await getDb();

  const businessProfile = await db.getFirstAsync('SELECT * FROM business_profile WHERE id = 1');
  const categories = await db.getAllAsync('SELECT * FROM categories');
  const products = await db.getAllAsync('SELECT * FROM products');
  const productVariants = await db.getAllAsync('SELECT * FROM product_variants');
  const stockMovements = await db.getAllAsync('SELECT * FROM stock_movements');
  const customers = await db.getAllAsync('SELECT * FROM customers');
  const transactions = await db.getAllAsync('SELECT * FROM transactions');
  const transactionItems = await db.getAllAsync('SELECT * FROM transaction_items');
  const debts = await db.getAllAsync('SELECT * FROM debts');
  const debtPayments = await db.getAllAsync('SELECT * FROM debt_payments');

  const payload: BackupPayload = {
    version: 1,
    appName: 'kasirhan',
    timestamp: new Date().toISOString(),
    businessProfile,
    categories,
    products,
    productVariants,
    stockMovements,
    customers,
    transactions,
    transactionItems,
    debts,
    debtPayments,
  };

  const json = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `kasirhan-backup-${dateStr}.json`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Simpan / Bagikan Backup Kasirhan',
    });
  }

  return filePath;
}

export async function restoreBackupFromJson(jsonString: string): Promise<boolean> {
  let data: BackupPayload;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Format file backup tidak valid (bukan JSON yang benar)');
  }

  if (data.appName !== 'kasirhan' || !data.version) {
    throw new Error('File ini bukan file backup Kasirhan yang valid');
  }

  await withTransaction(async (db) => {
    // Clear existing data
    await db.execAsync(`
      DELETE FROM debt_payments;
      DELETE FROM debts;
      DELETE FROM transaction_items;
      DELETE FROM transactions;
      DELETE FROM stock_movements;
      DELETE FROM product_variants;
      DELETE FROM products;
      DELETE FROM categories;
      DELETE FROM customers;
    `);

    // Restore categories
    if (data.categories && data.categories.length > 0) {
      for (const c of data.categories) {
        await db.runAsync(
          'INSERT OR REPLACE INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.name, c.color || '#3B82F6', c.icon || 'tag', c.created_at || new Date().toISOString()]
        );
      }
    }

    // Restore products
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        await db.runAsync(
          `INSERT OR REPLACE INTO products (
            id, name, category_id, unit, is_weighted, track_stock, low_stock_threshold, image_uri, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, p.name, p.category_id, p.unit || 'pcs', p.is_weighted ? 1 : 0,
            p.track_stock ? 1 : 0, p.low_stock_threshold || 5, p.image_uri,
            p.is_active !== undefined ? p.is_active : 1, p.created_at, p.updated_at
          ]
        );
      }
    }

    // Restore variants
    if (data.productVariants && data.productVariants.length > 0) {
      for (const v of data.productVariants) {
        await db.runAsync(
          `INSERT OR REPLACE INTO product_variants (
            id, product_id, name, sku, barcode, cost_price, sell_price, stock, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, v.product_id, v.name, v.sku, v.barcode, v.cost_price, v.sell_price, v.stock, v.is_default]
        );
      }
    }

    // Restore customers
    if (data.customers && data.customers.length > 0) {
      for (const c of data.customers) {
        await db.runAsync(
          'INSERT OR REPLACE INTO customers (id, name, phone, address, created_at) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.name, c.phone, c.address, c.created_at]
        );
      }
    }

    // Restore transactions
    if (data.transactions && data.transactions.length > 0) {
      for (const t of data.transactions) {
        await db.runAsync(
          `INSERT OR REPLACE INTO transactions (
            id, invoice_number, customer_id, customer_name, table_number,
            payment_method, status, subtotal, discount_amount, discount_percent,
            tax_amount, total_amount, paid_amount, change_amount, note, created_at, void_at, void_reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id, t.invoice_number, t.customer_id, t.customer_name, t.table_number,
            t.payment_method, t.status, t.subtotal, t.discount_amount, t.discount_percent,
            t.tax_amount, t.total_amount, t.paid_amount, t.change_amount, t.note,
            t.created_at, t.void_at, t.void_reason
          ]
        );
      }
    }

    // Restore transaction items
    if (data.transactionItems && data.transactionItems.length > 0) {
      for (const ti of data.transactionItems) {
        await db.runAsync(
          `INSERT OR REPLACE INTO transaction_items (
            id, transaction_id, product_id, variant_id, product_name,
            variant_name, unit, quantity, sell_price, cost_price, discount_amount, subtotal, is_weighted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ti.id, ti.transaction_id, ti.product_id, ti.variant_id, ti.product_name,
            ti.variant_name, ti.unit, ti.quantity, ti.sell_price, ti.cost_price,
            ti.discount_amount, ti.subtotal, ti.is_weighted
          ]
        );
      }
    }

    // Restore debts
    if (data.debts && data.debts.length > 0) {
      for (const d of data.debts) {
        await db.runAsync(
          `INSERT OR REPLACE INTO debts (
            id, transaction_id, customer_id, total_amount, paid_amount, remaining_amount, status, due_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [d.id, d.transaction_id, d.customer_id, d.total_amount, d.paid_amount, d.remaining_amount, d.status, d.due_date, d.created_at, d.updated_at]
        );
      }
    }

    // Restore profile
    if (data.businessProfile) {
      const bp = data.businessProfile;
      await db.runAsync(
        `INSERT OR REPLACE INTO business_profile (
          id, name, business_type, address, phone, footer_note, paper_size, tax_enabled, tax_percentage, qris_payload, table_enabled
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bp.name, bp.business_type, bp.address, bp.phone, bp.footer_note,
          bp.paper_size, bp.tax_enabled, bp.tax_percentage, bp.qris_payload, bp.table_enabled
        ]
      );
    }
  });

  return true;
}
