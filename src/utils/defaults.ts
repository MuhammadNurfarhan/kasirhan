import { BusinessType, Category, BusinessProfile } from '../types';
import { generateId } from './format';

export interface BusinessTypePreset {
  id: BusinessType;
  title: string;
  description: string;
  icon: string;
  defaultCategories: string[];
  enableTable: boolean;
  enableWeight: boolean;
  defaultUnit: 'pcs' | 'porsi' | 'kg';
}

export const BUSINESS_TYPE_PRESETS: BusinessTypePreset[] = [
  {
    id: 'kelontong',
    title: 'Toko Kelontong / Minimarket',
    description: 'Scan barcode, kelola stok & kategori sembako.',
    icon: 'storefront',
    defaultCategories: ['Sembako', 'Makanan Ringan', 'Minuman', 'Perawatan Diri', 'Kebutuhan Rumah'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
  {
    id: 'kuliner',
    title: 'Rumah Makan, Kafe & Kedai',
    description: 'Nomor meja, open bill, transaksi cepat, cetak struk.',
    icon: 'restaurant',
    defaultCategories: ['Makanan', 'Minuman', 'Camilan', 'Paket Hemat', 'Menu Tambahan'],
    enableTable: true,
    enableWeight: false,
    defaultUnit: 'porsi',
  },
  {
    id: 'curah',
    title: 'Toko Buah, Sayur & Curah',
    description: 'Jual per kg / liter dengan kalkulasi desimal akurat.',
    icon: 'scale',
    defaultCategories: ['Buah Segar', 'Sayuran', 'Beras & Biji-bijian', 'Minyak & Bumbu Curah'],
    enableTable: false,
    enableWeight: true,
    defaultUnit: 'kg',
  },
  {
    id: 'fashion',
    title: 'Butik & Toko Pakaian',
    description: 'Varian ukuran & warna (S/M/L, Merah/Biru), struk elegan.',
    icon: 'shirt',
    defaultCategories: ['Atasan', 'Bawahan', 'Dress & Gamis', 'Hijab & Aksesoris', 'Sepatu & Tas'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
  {
    id: 'apotek',
    title: 'Apotek & Toko Obat',
    description: 'Lacak HPP & margin laba, pencatatan obat & suplemen.',
    icon: 'medkit',
    defaultCategories: ['Obat Bebas', 'Suplemen & Vitamin', 'Alat Kesehatan', 'Herbal', 'Perawatan Bayi'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
  {
    id: 'elektronik',
    title: 'Elektronik & Toko HP',
    description: 'Barcode & serial produk, laporan keuntungan.',
    icon: 'hardware-chip',
    defaultCategories: ['Aksesoris HP', 'Kabel & Charger', 'Audio & Speaker', 'Gadget', 'Komponen'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
  {
    id: 'jasa',
    title: 'Jasa, Bengkel & Salon',
    description: 'Layanan tanpa inventori stok, pencatatan pelanggan.',
    icon: 'cut',
    defaultCategories: ['Layanan Utama', 'Paket Perawatan', 'Produk Pendukung', 'Layanan Tambahan'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
  {
    id: 'umum',
    title: 'Usaha Umum / Lainnya',
    description: 'Fitur POS standar fleksibel untuk segala kebutuhan.',
    icon: 'briefcase',
    defaultCategories: ['Umum', 'Produk Unggulan', 'Lain-lain'],
    enableTable: false,
    enableWeight: false,
    defaultUnit: 'pcs',
  },
];

export function getDefaultCategoriesForType(type: BusinessType): Category[] {
  const preset = BUSINESS_TYPE_PRESETS.find((p) => p.id === type) || BUSINESS_TYPE_PRESETS[0];
  const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777'];
  return preset.defaultCategories.map((name, index) => ({
    id: generateId(),
    name,
    color: colors[index % colors.length],
    icon: 'pricetag',
    created_at: new Date().toISOString(),
  }));
}

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  name: 'Toko Saya',
  business_type: 'kelontong',
  address: 'Jl. Merdeka No. 12',
  phone: '08123456789',
  footer_note: 'Terima kasih atas kunjungan Anda!',
  paper_size: '58mm',
  tax_enabled: false,
  tax_percentage: 11,
  qris_payload: null,
  qris_image_uri: null,
  logo_image_uri: null,
  table_enabled: false,
};
