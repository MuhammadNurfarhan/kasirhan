import RNBluetoothClassic, {
  BluetoothDevice,
} from "react-native-bluetooth-classic";
import { PermissionsAndroid, Platform } from "react-native"; // [PATCH]
import { Transaction, BusinessProfile } from "../types";
import { formatRupiah, formatDateTime, formatQuantity } from "./format";

export interface BluetoothPrinterDevice {
  name: string;
  address: string;
  bonded?: boolean;
}

// [PATCH] ===================== IZIN RUNTIME BLUETOOTH =====================
type AndroidPermission = Parameters<typeof PermissionsAndroid.request>[0];
const BT_CONNECT: AndroidPermission = "android.permission.BLUETOOTH_CONNECT";

/**
 * Pastikan izin Bluetooth runtime sudah granted SEBELUM memanggil fungsi
 * hardware apa pun (getBondedDevices / connectToDevice / write).
 * Idempotent: hanya meminta yang belum granted => dialog tidak muncul berulang.
 *
 * BLUETOOTH_CONNECT cukup untuk membaca perangkat paired & terhubung ke printer.
 * Tambahkan 'android.permission.BLUETOOTH_SCAN' + 'android.permission.ACCESS_FINE_LOCATION'
 * HANYA jika nanti menambah fitur discovery printer baru (startDiscovery).
 */
async function ensureBluetoothPermissions(
  perms: AndroidPermission[] = [BT_CONNECT],
): Promise<void> {
  if (Platform.OS !== "android") return;

  const needed: AndroidPermission[] = [];
  for (const p of perms) {
    if (!(await PermissionsAndroid.check(p))) needed.push(p);
  }
  if (needed.length === 0) return;

  const result = await PermissionsAndroid.requestMultiple(needed);
  const statuses = result as unknown as Record<string, { status: string }>;

  const deniedPermanent = needed.some(
    (p) => statuses[p]?.status === "never_ask_again",
  );
  const anyDenied = needed.some((p) => statuses[p]?.status !== "granted");

  if (anyDenied) {
    throw new Error(
      deniedPermanent
        ? 'Izin Bluetooth ditolak permanen. Buka Pengaturan → Aplikasi → Kasirhan → Izin → aktifkan "Perangkat di sekitar Anda", lalu coba lagi.'
        : "Kasirhan butuh izin Bluetooth untuk terhubung ke printer thermal.",
    );
  }
}
// [PATCH] =================================================================

/**
 * Cek ketersediaan dan status Bluetooth
 */
export async function isBluetoothEnabled(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.isBluetoothEnabled();
  } catch (e) {
    return false;
  }
}

/**
 * Minta pengguna mengaktifkan Bluetooth jika belum aktif
 */
export async function requestEnableBluetooth(): Promise<boolean> {
  try {
    return await RNBluetoothClassic.requestBluetoothEnabled();
  } catch (e) {
    return false;
  }
}

/**
 * Ambil daftar perangkat printer Bluetooth yang sudah dipasangkan (Bonded/Paired)
 */
export async function getPairedPrinters(): Promise<BluetoothPrinterDevice[]> {
  await ensureBluetoothPermissions(); // [PATCH] gate sebelum getBondedDevices
  try {
    const devices: BluetoothDevice[] =
      await RNBluetoothClassic.getBondedDevices();
    return devices.map((d) => ({
      name: d.name || "Printer Bluetooth",
      address: d.address,
      bonded: Boolean(d.bonded),
    }));
  } catch (e: any) {
    throw new Error(e?.message || "Gagal memindai perangkat Bluetooth.");
  }
}

/**
 * Simpan alamat printer default
 */
export async function saveDefaultPrinter(address: string): Promise<void> {
  try {
    const FileSystem = await import("expo-file-system/legacy");
    const path = `${FileSystem.documentDirectory}printer_pref.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify({ address }));
  } catch {}
}

/**
 * Ambil alamat printer default yang pernah disimpan
 */
export async function getDefaultPrinter(): Promise<string | null> {
  try {
    const FileSystem = await import("expo-file-system/legacy");
    const path = `${FileSystem.documentDirectory}printer_pref.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(content);
    return parsed.address || null;
  } catch {
    return null;
  }
}

/**
 * Generator ESC/POS Byte Commands untuk Struk Kasir
 */
export function buildEscPosReceipt(
  tx: Transaction,
  profile: BusinessProfile,
): string {
  // ESC/POS Commands
  const ESC = "\x1B";
  const GS = "\x1D";

  const INIT = `${ESC}@`;
  const ALIGN_LEFT = `${ESC}a\x00`;
  const ALIGN_CENTER = `${ESC}a\x01`;
  const ALIGN_RIGHT = `${ESC}a\x02`;
  const BOLD_ON = `${ESC}E\x01`;
  const BOLD_OFF = `${ESC}E\x00`;
  const DOUBLE_HEIGHT = `${GS}!\x01`;
  const NORMAL_SIZE = `${GS}!\x00`;
  const FEED_AND_CUT = `\n\n\n\n${GS}V\x41\x00`;

  const paperWidthChars = profile.paper_size === "80mm" ? 48 : 32;

  const createDashedLine = () => "-".repeat(paperWidthChars) + "\n";

  const formatTwoCol = (left: string, right: string) => {
    const spaceCount = Math.max(
      1,
      paperWidthChars - left.length - right.length,
    );
    return left + " ".repeat(spaceCount) + right + "\n";
  };

  let buffer = "";
  buffer += INIT;

  // Header Toko (Center)
  buffer += ALIGN_CENTER;
  buffer += BOLD_ON + DOUBLE_HEIGHT;
  buffer += profile.name + '\n';
  buffer += NORMAL_SIZE + BOLD_OFF;

  if (profile.address) {
    buffer += `${profile.address}\n`;
  }
  if (profile.phone) {
    buffer += `Telp: ${profile.phone}\n`;
  }

  // Jika VOID
  if (tx.status === "void") {
    buffer += BOLD_ON + "\n*** TRANSAKSI BATAL / VOID ***\n" + BOLD_OFF;
    if (tx.void_reason) {
      buffer += `Alasan: ${tx.void_reason}\n`;
    }
  }

  buffer += createDashedLine();

  // Info Transaksi
  buffer += ALIGN_LEFT;
  buffer += formatTwoCol(
    `No: ${tx.invoice_number}`,
    formatDateTime(tx.created_at),
  );
  if (tx.customer_name) {
    buffer += `Pelanggan: ${tx.customer_name}\n`;
  }
  if (tx.table_number) {
    buffer += `Meja: ${tx.table_number}\n`;
  }

  buffer += createDashedLine();

  // Item Belanja
  const items = tx.items || [];
  for (const item of items) {
    const variantStr =
      item.variant_name && item.variant_name !== "Default"
        ? ` (${item.variant_name})`
        : "";
    buffer += BOLD_ON + `${item.product_name}${variantStr}\n` + BOLD_OFF;

    const qtyStr = formatQuantity(item.quantity, item.is_weighted, item.unit);
    const leftText = `  ${qtyStr} x ${formatRupiah(item.sell_price)}`;
    const rightText = formatRupiah(item.subtotal);
    buffer += formatTwoCol(leftText, rightText);

    if (item.discount_amount > 0) {
      buffer += formatTwoCol(
        "  Diskon Item",
        `-${formatRupiah(item.discount_amount)}`,
      );
    }
  }

  buffer += createDashedLine();

  // Summary / Total
  buffer += formatTwoCol("Subtotal", formatRupiah(tx.subtotal));
  if (tx.discount_amount > 0) {
    buffer += formatTwoCol(
      "Diskon Transaksi",
      `-${formatRupiah(tx.discount_amount)}`,
    );
  }
  if (tx.tax_amount > 0) {
    buffer += formatTwoCol("PPN", formatRupiah(tx.tax_amount));
  }

  buffer += BOLD_ON + DOUBLE_HEIGHT;
  buffer += formatTwoCol("TOTAL", formatRupiah(tx.total_amount));
  buffer += NORMAL_SIZE + BOLD_OFF;

  const methodLabel = tx.payment_method.toUpperCase();
  buffer += formatTwoCol(
    `Bayar (${methodLabel})`,
    formatRupiah(tx.paid_amount),
  );

  if (tx.payment_method === "cash") {
    buffer += formatTwoCol("Kembalian", formatRupiah(tx.change_amount));
  }

  buffer += createDashedLine();

  // Footer Note
  buffer += ALIGN_CENTER;
  buffer += `${profile.footer_note || "Terima kasih atas kunjungan Anda!"}\n`;
  buffer += "Kasirhan POS Offline\n";

  // Feed & Cut Paper
  buffer += FEED_AND_CUT;

  return buffer;
}

/**
 * Cetak Struk Langsung ke Printer Thermal Bluetooth
 */
export async function printReceiptBluetooth(
  tx: Transaction,
  profile: BusinessProfile,
  targetDeviceAddress?: string,
): Promise<boolean> {
  await ensureBluetoothPermissions(); // [PATCH] gate sebelum connect/write

  const address = targetDeviceAddress || (await getDefaultPrinter());
  if (!address) {
    throw new Error(
      "Alamat printer Bluetooth belum dipilih. Silakan pilih printer terlebih dahulu.",
    );
  }

  const enabled = await isBluetoothEnabled();
  if (!enabled) {
    const turnedOn = await requestEnableBluetooth();
    if (!turnedOn) {
      throw new Error(
        "Bluetooth tidak aktif. Silakan aktifkan Bluetooth perangkat.",
      );
    }
  }

  let device: BluetoothDevice | null = null;
  try {
    const isConnected = await RNBluetoothClassic.isDeviceConnected(address);
    if (isConnected) {
      device = await RNBluetoothClassic.getConnectedDevice(address);
    } else {
      device = await RNBluetoothClassic.connectToDevice(address, {
        connectorType: "rfcomm",
        delimiter: "\n",
      });
    }

    if (!device) {
      throw new Error("Gagal menghubungkan ke printer Bluetooth.");
    }

    const payload = buildEscPosReceipt(tx, profile);
    await device.write(payload, "utf8");

    return true;
  } catch (e: any) {
    throw new Error(
      e?.message || "Terjadi kesalahan saat mencetak ke printer Bluetooth.",
    );
  }
}
