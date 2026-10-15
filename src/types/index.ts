export type BusinessType =
  | 'kelontong'
  | 'kuliner'
  | 'fashion'
  | 'curah'
  | 'apotek'
  | 'elektronik'
  | 'jasa'
  | 'umum';

export type ProductUnit =
  | 'pcs'
  | 'porsi'
  | 'cup'
  | 'box'
  | 'lembar'
  | 'paket'
  | 'kg'
  | 'gram'
  | 'liter'
  | 'ml';

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  cost_price: number; // HPP (integer Rupiah)
  sell_price: number; // Harga jual (integer Rupiah)
  stock: number; // Integer (dalam gram/ml jika berat/volume, atau pcs)
  is_default: number; // 1 | 0
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  category_name?: string;
  unit: ProductUnit;
  is_weighted: boolean; // True jika jual per kg/gram/liter/ml
  track_stock: boolean; // False jika produk jasa/tanpa inventori
  low_stock_threshold: number;
  image_uri: string | null;
  is_active: number; // 1 | 0
  created_at: string;
  updated_at: string;
  variants?: ProductVariant[];
  default_variant?: ProductVariant;
}

export interface StockMovement {
  id: string;
  variant_id: string;
  type: 'in' | 'sale' | 'void' | 'adjustment';
  quantity: number;
  cost_price: number;
  previous_stock: number;
  current_stock: number;
  ref_id: string | null;
  note: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  unit: ProductUnit;
  quantity: number; // Integer (dalam gram jika is_weighted, pcs jika biasa)
  sell_price: number; // Snapshot harga jual per unit
  cost_price: number; // Snapshot HPP per unit (moving average)
  discount_amount: number;
  subtotal: number;
  is_weighted: boolean;
}

export interface Transaction {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string | null;
  table_number: string | null;
  payment_method: 'cash' | 'qris';
  status: 'completed' | 'void';
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  note: string | null;
  created_at: string;
  void_at: string | null;
  void_reason: string | null;
  items?: TransactionItem[];
}

export interface BusinessProfile {
  name: string;
  business_type: BusinessType;
  address: string;
  phone: string;
  footer_note: string;
  paper_size: '58mm' | '80mm';
  tax_enabled: boolean;
  tax_percentage: number;
  qris_payload: string | null;
  qris_image_uri: string | null;
  table_enabled: boolean;
}

export interface CartItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  unit: ProductUnit;
  isWeighted: boolean;
  trackStock: boolean;
  availableStock: number;
  sellPrice: number; // Harga jual per 1 unit / 1 kg
  costPrice: number; // HPP snapshot
  quantity: number; // Integer: gram jika isWeighted, pcs jika biasa
  discountAmount: number;
  subtotal: number; // Hasil hitung: jika isWeighted: round((sellPrice * grams)/1000) - discount
  note?: string;
}

export interface HeldCart {
  id: string;
  name: string; // Meja / Nama Pemesan
  tableNumber: string | null;
  customer: Customer | null;
  items: CartItem[];
  discountPercent: number;
  discountAmount: number;
  heldAt: string;
}
