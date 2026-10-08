export const CREATE_TABLES_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS business_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  footer_note TEXT DEFAULT '',
  paper_size TEXT DEFAULT '58mm',
  tax_enabled INTEGER DEFAULT 0,
  tax_percentage REAL DEFAULT 11,
  qris_payload TEXT DEFAULT NULL,
  table_enabled INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS auth_security (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pin_hash TEXT,
  pin_salt TEXT,
  recovery_code_hash TEXT,
  is_locked INTEGER DEFAULT 0,
  is_setup_completed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'tag',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  is_weighted INTEGER NOT NULL DEFAULT 0,
  track_stock INTEGER NOT NULL DEFAULT 1,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_uri TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  sku TEXT,
  barcode TEXT,
  cost_price INTEGER NOT NULL DEFAULT 0,
  sell_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  ref_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (variant_id) REFERENCES product_variants (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  customer_name TEXT,
  table_number TEXT,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  subtotal INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL,
  change_amount INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL,
  void_at TEXT,
  void_reason TEXT
);

CREATE TABLE IF NOT EXISTS transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  sell_price INTEGER NOT NULL,
  cost_price INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  subtotal INTEGER NOT NULL,
  is_weighted INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (debt_id) REFERENCES debts (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS held_carts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  table_number TEXT,
  cart_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Indices for rapid offline search
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_tx_items_tx ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON debts(customer_id);
`;
