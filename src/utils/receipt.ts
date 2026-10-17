import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Linking, Platform } from 'react-native';
import { Transaction, BusinessProfile } from '../types';
import { formatRupiah, formatDateTime, formatQuantity } from './format';

export async function getLogoBase64(logoUri: string | null): Promise<string | null> {
  if (!logoUri) return null;
  try {
    const fileInfo = await FileSystem.getInfoAsync(logoUri);
    if (!fileInfo.exists) return null;
    const base64 = await FileSystem.readAsStringAsync(logoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = logoUri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export function generateReceiptHtml(
  tx: Transaction,
  profile: BusinessProfile,
  logoSrc?: string | null
): string {
  const is80mm = profile.paper_size === '80mm';
  const widthPx = is80mm ? '380px' : '280px';
  const items = tx.items || [];

  const itemsHtml = items
    .map((item) => {
      const qtyStr = formatQuantity(item.quantity, item.is_weighted, item.unit);
      const variantStr = item.variant_name && item.variant_name !== 'Default' ? ` (${item.variant_name})` : '';
      return `
        <tr>
          <td colspan="2" style="font-weight: bold; padding-top: 4px;">${item.product_name}${variantStr}</td>
        </tr>
        <tr>
          <td style="color: #444; font-size: 11px;">${qtyStr} @ ${formatRupiah(item.sell_price)}</td>
          <td style="text-align: right; font-size: 12px;">${formatRupiah(item.subtotal)}</td>
        </tr>
        ${item.discount_amount > 0 ? `<tr><td colspan="2" style="color: #c00; font-size: 10px;">(Diskon: -${formatRupiah(item.discount_amount)})</td></tr>` : ''}
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <style>
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            background-color: #fff;
            color: #000;
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.3;
          }
          .receipt-container {
            width: ${widthPx};
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .store-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .info-table {
            width: 100%;
            font-size: 11px;
            margin-bottom: 8px;
          }
          .items-table {
            width: 100%;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .summary-table {
            width: 100%;
            font-size: 12px;
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .total-row {
            font-size: 14px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 8px;
            color: #333;
          }
          .void-badge {
            color: #dc2626;
            font-size: 16px;
            font-weight: bold;
            border: 2px solid #dc2626;
            display: inline-block;
            padding: 4px 8px;
            margin-bottom: 8px;
          }
          .store-logo {
            max-width: 70px;
            max-height: 70px;
            border-radius: 6px;
            margin-bottom: 6px;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            ${tx.status === 'void' ? '<div class="void-badge">*** VOID / DIBATALKAN ***</div><br/>' : ''}
            ${logoSrc ? `<img src="${logoSrc}" class="store-logo" alt="Logo" />` : ''}
            <div class="store-name">${profile.name}</div>
            ${profile.address ? `<div>${profile.address}</div>` : ''}
            ${profile.phone ? `<div>Telp: ${profile.phone}</div>` : ''}
          </div>

          <table class="info-table">
            <tr>
              <td>No: ${tx.invoice_number}</td>
              <td style="text-align: right;">${formatDateTime(tx.created_at)}</td>
            </tr>
            ${tx.customer_name ? `<tr><td colspan="2">Pelanggan: ${tx.customer_name}</td></tr>` : ''}
            ${tx.table_number ? `<tr><td colspan="2">Meja: ${tx.table_number}</td></tr>` : ''}
          </table>

          <table class="items-table">
            ${itemsHtml}
          </table>

          <table class="summary-table">
            <tr>
              <td>Subtotal</td>
              <td style="text-align: right;">${formatRupiah(tx.subtotal)}</td>
            </tr>
            ${tx.discount_amount > 0 ? `
              <tr>
                <td>Diskon Transaksi</td>
                <td style="text-align: right; color: #c00;">-${formatRupiah(tx.discount_amount)}</td>
              </tr>
            ` : ''}
            ${tx.tax_amount > 0 ? `
              <tr>
                <td>PPN (${profile.tax_percentage}%)</td>
                <td style="text-align: right;">${formatRupiah(tx.tax_amount)}</td>
              </tr>
            ` : ''}
            <tr class="total-row">
              <td style="padding-top: 4px;">TOTAL</td>
              <td style="text-align: right; padding-top: 4px;">${formatRupiah(tx.total_amount)}</td>
            </tr>
            <tr>
              <td>Bayar (${tx.payment_method.toUpperCase()})</td>
              <td style="text-align: right;">${formatRupiah(tx.paid_amount)}</td>
            </tr>
            ${tx.payment_method === 'cash' ? `
              <tr>
                <td>Kembalian</td>
                <td style="text-align: right;">${formatRupiah(tx.change_amount)}</td>
              </tr>
            ` : ''}
          </table>

          <div class="footer">
            <div>${profile.footer_note || 'Terima kasih atas kunjungan Anda!'}</div>
            <div style="font-size: 10px; margin-top: 4px; color: #666;">Dicetak via Kasirhan POS Offline</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate PDF and share via Android share sheet (WhatsApp, Email, Drive)
 */
export async function shareReceiptPdf(tx: Transaction, profile: BusinessProfile): Promise<void> {
  const logoBase64 = await getLogoBase64(profile.logo_image_uri);
  const html = generateReceiptHtml(tx, profile, logoBase64);
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      UTI: '.pdf',
      mimeType: 'application/pdf',
      dialogTitle: `Struk ${tx.invoice_number}`,
    });
  }
}

/**
 * Share text receipt directly to WhatsApp
 */
export async function shareReceiptWhatsApp(tx: Transaction, profile: BusinessProfile, phone?: string): Promise<void> {
  const items = tx.items || [];
  let text = `*${profile.name.toUpperCase()}*\n`;
  if (profile.address) text += `${profile.address}\n`;
  if (profile.phone) text += `Telp: ${profile.phone}\n`;
  text += `--------------------------------\n`;
  text += `No: ${tx.invoice_number}\n`;
  text += `Waktu: ${formatDateTime(tx.created_at)}\n`;
  if (tx.customer_name) text += `Pelanggan: ${tx.customer_name}\n`;
  if (tx.table_number) text += `Meja: ${tx.table_number}\n`;
  text += `--------------------------------\n`;

  for (const item of items) {
    const qtyStr = formatQuantity(item.quantity, item.is_weighted, item.unit);
    const varStr = item.variant_name && item.variant_name !== 'Default' ? ` (${item.variant_name})` : '';
    text += `${item.product_name}${varStr}\n`;
    text += `  ${qtyStr} x ${formatRupiah(item.sell_price)} = ${formatRupiah(item.subtotal)}\n`;
  }

  text += `--------------------------------\n`;
  text += `Subtotal: ${formatRupiah(tx.subtotal)}\n`;
  if (tx.discount_amount > 0) text += `Diskon: -${formatRupiah(tx.discount_amount)}\n`;
  if (tx.tax_amount > 0) text += `PPN: ${formatRupiah(tx.tax_amount)}\n`;
  text += `*TOTAL: ${formatRupiah(tx.total_amount)}*\n`;
  text += `Bayar (${tx.payment_method.toUpperCase()}): ${formatRupiah(tx.paid_amount)}\n`;
  if (tx.payment_method === 'cash') text += `Kembalian: ${formatRupiah(tx.change_amount)}\n`;
  text += `--------------------------------\n`;
  text += `${profile.footer_note || 'Terima kasih!'}\n`;

  const cleanPhone = phone ? phone.replace(/\D/g, '').replace(/^0/, '62') : '';
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `whatsapp://send?text=${encodeURIComponent(text)}`;

  await Linking.openURL(url).catch(() => {
    // Fallback if whatsapp:// protocol is unavailable
    Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
  });
}

/**
 * Print receipt using system print / thermal printer
 */
export async function printReceipt(tx: Transaction, profile: BusinessProfile): Promise<void> {
  const logoBase64 = await getLogoBase64(profile.logo_image_uri);
  const html = generateReceiptHtml(tx, profile, logoBase64);
  await Print.printAsync({ html });
}
