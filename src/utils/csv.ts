import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Transaction, Product } from '../types';
import { formatDateTime } from './format';

const csvEsc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';

export async function exportTransactionsCsv(transactions: Transaction[]): Promise<void> {
  const headers = [
    'Nomor Faktur',
    'Tanggal',
    'Pelanggan',
    'Nomor Meja',
    'Metode Bayar',
    'Status',
    'Subtotal',
    'Diskon',
    'PPN',
    'Total',
    'Bayar',
    'Kembalian',
    'Catatan / Alasan Void',
  ];

  const rows = transactions.map((tx) => [
    csvEsc(tx.invoice_number),
    csvEsc(formatDateTime(tx.created_at)),
    csvEsc(tx.customer_name || '-'),
    csvEsc(tx.table_number || '-'),
    csvEsc(tx.payment_method.toUpperCase()),
    csvEsc(tx.status.toUpperCase()),
    tx.subtotal,
    tx.discount_amount,
    tx.tax_amount,
    tx.total_amount,
    tx.paid_amount,
    tx.change_amount,
    csvEsc(tx.status === 'void' ? tx.void_reason : tx.note),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = `${FileSystem.documentDirectory}laporan-transaksi-${dateStr}.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Laporan Transaksi CSV',
    });
  }
}

export async function exportProductsCsv(products: Product[]): Promise<void> {
  const headers = [
    'ID Produk',
    'Nama Produk',
    'Kategori',
    'Satuan',
    'Jual per Berat/Volume',
    'Kelola Stok',
    'Varian',
    'Barcode',
    'SKU',
    'Harga Modal (HPP)',
    'Harga Jual',
    'Stok Saat Ini',
  ];

  const rows: any[] = [];
  for (const p of products) {
    const variants = p.variants || (p.default_variant ? [p.default_variant] : []);
    for (const v of variants) {
      rows.push([
        csvEsc(p.id),
        csvEsc(p.name),
        csvEsc(p.category_name || '-'),
        csvEsc(p.unit),
        csvEsc(p.is_weighted ? 'Ya' : 'Tidak'),
        csvEsc(p.track_stock ? 'Ya' : 'Tidak'),
        csvEsc(v.name),
        csvEsc(v.barcode || ''),
        csvEsc(v.sku || ''),
        v.cost_price,
        v.sell_price,
        v.stock,
      ]);
    }
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = `${FileSystem.documentDirectory}katalog-produk-${dateStr}.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Katalog Produk CSV',
    });
  }
}
