import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { zip, unzip } from 'react-native-zip-archive';
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

/**
 * Buat cadangan data terkompresi (.zip) yang mencakup:
 * 1. data.json (Database SQLite Kasirhan)
 * 2. Seluruh file gambar foto produk & foto QRIS toko
 */
export async function createCompressedBackup(): Promise<string> {
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

  const timestamp = Date.now();
  const tempDir = `${FileSystem.cacheDirectory}backup_staging_${timestamp}/`;
  const imagesDir = `${tempDir}images/`;

  await FileSystem.makeDirectoryAsync(imagesDir, { intermediates: true });

  // Tulis data.json ke staging
  const jsonString = JSON.stringify(payload, null, 2);
  await FileSystem.writeAsStringAsync(`${tempDir}data.json`, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Salin file gambar produk ke folder images
  for (const prod of products as any[]) {
    if (prod.image_uri && prod.image_uri.startsWith('file://')) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(prod.image_uri);
        if (fileInfo.exists) {
          const fileName = prod.image_uri.split('/').pop()?.split('?')[0];
          if (fileName) {
            await FileSystem.copyAsync({
              from: prod.image_uri,
              to: `${imagesDir}${fileName}`,
            });
          }
        }
      } catch (err) {
        console.warn('Gagal menyertakan gambar produk ke backup:', err);
      }
    }
  }

  // Salin file gambar QRIS toko jika ada
  if (businessProfile && (businessProfile as any).qris_image_uri?.startsWith('file://')) {
    try {
      const qrisUri = (businessProfile as any).qris_image_uri;
      const fileInfo = await FileSystem.getInfoAsync(qrisUri);
      if (fileInfo.exists) {
        const fileName = qrisUri.split('/').pop()?.split('?')[0];
        if (fileName) {
          await FileSystem.copyAsync({
            from: qrisUri,
            to: `${imagesDir}${fileName}`,
          });
        }
      }
    } catch (err) {
      console.warn('Gagal menyertakan gambar QRIS ke backup:', err);
    }
  }

  // Salin file logo toko jika ada
  if (businessProfile && (businessProfile as any).logo_image_uri?.startsWith('file://')) {
    try {
      const logoUri = (businessProfile as any).logo_image_uri;
      const fileInfo = await FileSystem.getInfoAsync(logoUri);
      if (fileInfo.exists) {
        const fileName = logoUri.split('/').pop()?.split('?')[0];
        if (fileName) {
          await FileSystem.copyAsync({
            from: logoUri,
            to: `${imagesDir}${fileName}`,
          });
        }
      }
    } catch (err) {
      console.warn('Gagal menyertakan logo toko ke backup:', err);
    }
  }

  // Kompres folder staging ke file .zip (disimpan sementara di app storage)
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const zipFileName = `kasirhan-backup-${dateStr}.zip`;
  const zipTempPath = `${FileSystem.documentDirectory}${zipFileName}`;

  const cleanTempPath = tempDir.replace(/^file:\/\//, '');
  const cleanZipTempPath = zipTempPath.replace(/^file:\/\//, '');

  await zip(cleanTempPath, cleanZipTempPath);

  // Bersihkan folder staging
  await FileSystem.deleteAsync(tempDir, { idempotent: true });

  // Simpan langsung ke penyimpanan internal menggunakan StorageAccessFramework
  // User memilih folder tujuan (defaultnya Downloads)
  let savedToInternal = false;
  try {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (permissions.granted) {
      // Baca konten ZIP sebagai base64
      const zipBase64 = await FileSystem.readAsStringAsync(zipTempPath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Buat file baru di folder yang dipilih user
      const safUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        zipFileName,
        'application/zip'
      );

      // Tulis konten ke file
      await FileSystem.writeAsStringAsync(safUri, zipBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      savedToInternal = true;
    }
  } catch (_safErr) {
    // SAF gagal → fallback ke share sheet
  }

  if (!savedToInternal) {
    // Fallback: buka dialog share jika SAF dibatalkan atau gagal
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(zipTempPath, {
        mimeType: 'application/zip',
        dialogTitle: 'Simpan Cadangan Terkompresi Kasirhan',
      });
    }
  }

  // Hapus file ZIP sementara di app storage
  await FileSystem.deleteAsync(zipTempPath, { idempotent: true });

  return zipTempPath;
}

/**
 * Pulihkan data langsung dari file ZIP cadangan yang dipilih user
 */
export async function restoreFromZipFile(): Promise<boolean> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', 'application/x-zip-compressed', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return false;
  }

  const selectedFile = result.assets[0];
  const zipSourceUri = selectedFile.uri;

  const timestamp = Date.now();
  const extractDir = `${FileSystem.cacheDirectory}restore_extract_${timestamp}/`;
  await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });

  const cleanSourcePath = zipSourceUri.replace(/^file:\/\//, '');
  const cleanExtractPath = extractDir.replace(/^file:\/\//, '');

  // Ekstrak file zip
  await unzip(cleanSourcePath, cleanExtractPath);

  // Baca data.json
  const dataJsonPath = `${extractDir}data.json`;
  const dataInfo = await FileSystem.getInfoAsync(dataJsonPath);
  if (!dataInfo.exists) {
    await FileSystem.deleteAsync(extractDir, { idempotent: true });
    throw new Error('File ZIP ini tidak memuat file data.json cadangan Kasirhan.');
  }

  const jsonContent = await FileSystem.readAsStringAsync(dataJsonPath);

  // Pindahkan gambar dari extractDir/images ke FileSystem.documentDirectory
  const imagesDirPath = `${extractDir}images/`;
  const imagesDirInfo = await FileSystem.getInfoAsync(imagesDirPath);
  if (imagesDirInfo.exists) {
    const imageFiles = await FileSystem.readDirectoryAsync(imagesDirPath);
    for (const imgName of imageFiles) {
      const sourceImg = `${imagesDirPath}${imgName}`;
      const destImg = `${FileSystem.documentDirectory}${imgName}`;
      try {
        await FileSystem.copyAsync({ from: sourceImg, to: destImg });
      } catch {}
    }
  }

  // Restore database
  await restoreBackupFromJson(jsonContent);

  // Bersihkan folder extract
  await FileSystem.deleteAsync(extractDir, { idempotent: true });
  return true;
}

/**
 * Backup plain JSON lama (tetap dipertahankan untuk kompatibilitas)
 */
export async function createBackup(): Promise<string> {
  return createCompressedBackup();
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
          [c.id, c.name, c.color, c.icon, c.created_at]
        );
      }
    }

    // Restore products
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        await db.runAsync(
          `INSERT OR REPLACE INTO products (
            id, name, category_id, unit, is_weighted, track_stock,
            low_stock_threshold, image_uri, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id, p.name, p.category_id, p.unit, p.is_weighted, p.track_stock,
            p.low_stock_threshold, p.image_uri, p.is_active, p.created_at, p.updated_at
          ]
        );
      }
    }

    // Restore variants
    if (data.productVariants && data.productVariants.length > 0) {
      for (const v of data.productVariants) {
        await db.runAsync(
          `INSERT OR REPLACE INTO product_variants (
            id, product_id, name, sku, barcode, cost_price, sell_price, stock, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id, v.product_id, v.name, v.sku, v.barcode,
            v.cost_price, v.sell_price, v.stock, v.created_at, v.updated_at
          ]
        );
      }
    }

    // Restore customers
    if (data.customers && data.customers.length > 0) {
      for (const cu of data.customers) {
        await db.runAsync(
          'INSERT OR REPLACE INTO customers (id, name, phone, email, address, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          [cu.id, cu.name, cu.phone, cu.email, cu.address, cu.created_at]
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
          id, name, business_type, address, phone, footer_note, paper_size, tax_enabled, tax_percentage, qris_payload, qris_image_uri, logo_image_uri, table_enabled, auto_print_enabled
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bp.name, bp.business_type, bp.address, bp.phone, bp.footer_note,
          bp.paper_size, bp.tax_enabled, bp.tax_percentage, bp.qris_payload, bp.qris_image_uri || null, bp.logo_image_uri || null, bp.table_enabled, bp.auto_print_enabled ? 1 : 0
        ]
      );
    }
  });

  return true;
}
