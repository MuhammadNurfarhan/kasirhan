import { getDb, withTransaction } from '../db/database';
import { Product, ProductVariant, StockMovement, ProductUnit } from '../types';
import { generateId } from '../utils/format';

export interface ProductFilter {
  search?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

export async function getProducts(filter: ProductFilter = {}): Promise<Product[]> {
  const db = await getDb();
  let sql = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filter.activeOnly !== false) {
    sql += ' AND p.is_active = 1';
  }

  if (filter.categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(filter.categoryId);
  }

  if (filter.search && filter.search.trim()) {
    const q = `%${filter.search.trim().toLowerCase()}%`;
    sql += ` AND (
      LOWER(p.name) LIKE ? OR
      EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv.product_id = p.id AND (LOWER(pv.barcode) LIKE ? OR LOWER(pv.sku) LIKE ? OR LOWER(pv.name) LIKE ?)
      )
    )`;
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY p.name ASC';

  const rawProducts = await db.getAllAsync<any>(sql, params);
  if (rawProducts.length === 0) return [];

  // Fetch all variants for these products
  const productIds = rawProducts.map((p) => p.id);
  const placeholders = productIds.map(() => '?').join(',');
  const rawVariants = await db.getAllAsync<any>(
    `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY is_default DESC, name ASC`,
    productIds
  );

  const variantsByProductId: Record<string, ProductVariant[]> = {};
  for (const v of rawVariants) {
    if (!variantsByProductId[v.product_id]) {
      variantsByProductId[v.product_id] = [];
    }
    variantsByProductId[v.product_id].push({
      id: v.id,
      product_id: v.product_id,
      name: v.name,
      sku: v.sku,
      barcode: v.barcode,
      cost_price: Number(v.cost_price),
      sell_price: Number(v.sell_price),
      stock: Number(v.stock),
      is_default: Number(v.is_default),
    });
  }

  return rawProducts.map((p) => {
    const variants = variantsByProductId[p.id] || [];
    const defaultVariant = variants.find((v) => v.is_default === 1) || variants[0];
    return {
      id: p.id,
      name: p.name,
      category_id: p.category_id,
      category_name: p.category_name,
      unit: p.unit as ProductUnit,
      is_weighted: Boolean(p.is_weighted),
      track_stock: Boolean(p.track_stock),
      low_stock_threshold: Number(p.low_stock_threshold),
      image_uri: p.image_uri,
      is_active: Number(p.is_active),
      created_at: p.created_at,
      updated_at: p.updated_at,
      variants,
      default_variant: defaultVariant,
    };
  });
}

export async function findVariantByBarcode(barcode: string): Promise<{ product: Product; variant: ProductVariant } | null> {
  const db = await getDb();
  const v = await db.getFirstAsync<any>(
    'SELECT * FROM product_variants WHERE barcode = ? LIMIT 1',
    [barcode.trim()]
  );
  if (!v) return null;

  const p = await db.getFirstAsync<any>(
    `SELECT p.*, c.name as category_name 
     FROM products p 
     LEFT JOIN categories c ON p.category_id = c.id 
     WHERE p.id = ?`,
    [v.product_id]
  );
  if (!p) return null;

  const product: Product = {
    id: p.id,
    name: p.name,
    category_id: p.category_id,
    category_name: p.category_name,
    unit: p.unit as ProductUnit,
    is_weighted: Boolean(p.is_weighted),
    track_stock: Boolean(p.track_stock),
    low_stock_threshold: Number(p.low_stock_threshold),
    image_uri: p.image_uri,
    is_active: Number(p.is_active),
    created_at: p.created_at,
    updated_at: p.updated_at,
  };

  const variant: ProductVariant = {
    id: v.id,
    product_id: v.product_id,
    name: v.name,
    sku: v.sku,
    barcode: v.barcode,
    cost_price: Number(v.cost_price),
    sell_price: Number(v.sell_price),
    stock: Number(v.stock),
    is_default: Number(v.is_default),
  };

  return { product, variant };
}

export interface CreateProductInput {
  name: string;
  category_id: string | null;
  unit: ProductUnit;
  is_weighted: boolean;
  track_stock: boolean;
  low_stock_threshold?: number;
  image_uri?: string | null;
  variants: Array<{
    id?: string;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    cost_price: number;
    sell_price: number;
    stock: number;
    is_default?: boolean;
  }>;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return await withTransaction(async (db) => {
    const productId = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO products (
        id, name, category_id, unit, is_weighted, track_stock,
        low_stock_threshold, image_uri, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        productId,
        input.name.trim(),
        input.category_id,
        input.unit,
        input.is_weighted ? 1 : 0,
        input.track_stock ? 1 : 0,
        input.low_stock_threshold ?? 5,
        input.image_uri || null,
        now,
        now,
      ]
    );

    const createdVariants: ProductVariant[] = [];
    const variantsList = input.variants.length > 0 ? input.variants : [
      {
        name: 'Default',
        sku: null,
        barcode: null,
        cost_price: 0,
        sell_price: 0,
        stock: 0,
        is_default: true,
      },
    ];

    for (let i = 0; i < variantsList.length; i++) {
      const v = variantsList[i];
      const variantId = v.id || generateId();
      const isDefault = v.is_default !== undefined ? (v.is_default ? 1 : 0) : (i === 0 ? 1 : 0);

      await db.runAsync(
        `INSERT INTO product_variants (
          id, product_id, name, sku, barcode, cost_price, sell_price, stock, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          variantId,
          productId,
          v.name.trim(),
          v.sku || null,
          v.barcode || null,
          Math.round(v.cost_price || 0),
          Math.round(v.sell_price || 0),
          Math.round(v.stock || 0),
          isDefault,
        ]
      );

      // Record initial stock if > 0
      if (input.track_stock && v.stock > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements (
            id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
          ) VALUES (?, ?, 'in', ?, ?, 0, ?, NULL, 'Stok awal', ?)`,
          [
            generateId(),
            variantId,
            v.stock,
            v.cost_price,
            v.stock,
            now,
          ]
        );
      }

      createdVariants.push({
        id: variantId,
        product_id: productId,
        name: v.name.trim(),
        sku: v.sku || null,
        barcode: v.barcode || null,
        cost_price: Math.round(v.cost_price || 0),
        sell_price: Math.round(v.sell_price || 0),
        stock: Math.round(v.stock || 0),
        is_default: isDefault,
      });
    }

    return {
      id: productId,
      name: input.name.trim(),
      category_id: input.category_id,
      unit: input.unit,
      is_weighted: input.is_weighted,
      track_stock: input.track_stock,
      low_stock_threshold: input.low_stock_threshold ?? 5,
      image_uri: input.image_uri || null,
      is_active: 1,
      created_at: now,
      updated_at: now,
      variants: createdVariants,
      default_variant: createdVariants[0],
    };
  });
}

export async function updateProduct(
  productId: string,
  input: Partial<CreateProductInput>
): Promise<void> {
  await withTransaction(async (db) => {
    const now = new Date().toISOString();

    if (input.name !== undefined) {
      await db.runAsync(
        `UPDATE products SET 
          name = ?, category_id = ?, unit = ?, is_weighted = ?, 
          track_stock = ?, low_stock_threshold = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name.trim(),
          input.category_id !== undefined ? input.category_id : null,
          input.unit || 'pcs',
          input.is_weighted ? 1 : 0,
          input.track_stock ? 1 : 0,
          input.low_stock_threshold ?? 5,
          now,
          productId,
        ]
      );
    }

    if (input.variants && input.variants.length > 0) {
      // Upsert variants
      for (const v of input.variants) {
        if (v.id) {
          await db.runAsync(
            `UPDATE product_variants SET 
              name = ?, sku = ?, barcode = ?, cost_price = ?, sell_price = ?, stock = ?
             WHERE id = ?`,
            [
              v.name.trim(),
              v.sku || null,
              v.barcode || null,
              Math.round(v.cost_price || 0),
              Math.round(v.sell_price || 0),
              Math.round(v.stock || 0),
              v.id,
            ]
          );
        } else {
          const newVarId = generateId();
          await db.runAsync(
            `INSERT INTO product_variants (
              id, product_id, name, sku, barcode, cost_price, sell_price, stock, is_default
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              newVarId,
              productId,
              v.name.trim(),
              v.sku || null,
              v.barcode || null,
              Math.round(v.cost_price || 0),
              Math.round(v.sell_price || 0),
              Math.round(v.stock || 0),
            ]
          );
        }
      }
    }
  });
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE products SET is_active = 0 WHERE id = ?', [productId]);
}

/**
 * Adjust stock & calculate Moving Average HPP if restocking
 * Formula: ((old_stock * old_cost) + (qty_in * in_cost)) / (old_stock + qty_in)
 */
export async function adjustStock(
  variantId: string,
  type: 'in' | 'adjustment',
  quantity: number,
  costPrice: number = 0,
  note: string = ''
): Promise<void> {
  await withTransaction(async (db) => {
    const v = await db.getFirstAsync<any>(
      'SELECT * FROM product_variants WHERE id = ?',
      [variantId]
    );
    if (!v) throw new Error('Varian tidak ditemukan');

    const previousStock = Number(v.stock);
    let newStock = previousStock;
    let newCostPrice = Number(v.cost_price);
    const now = new Date().toISOString();

    if (type === 'in') {
      newStock = previousStock + quantity;
      // Moving average calculation
      if (quantity > 0 && costPrice > 0) {
        if (previousStock > 0 && newStock > 0) {
          const totalValue = (previousStock * Number(v.cost_price)) + (quantity * costPrice);
          newCostPrice = Math.round(totalValue / newStock);
        } else {
          newCostPrice = costPrice;
        }
      }
    } else {
      // adjustment replaces or corrects stock
      newStock = quantity;
      if (costPrice > 0) {
        newCostPrice = costPrice;
      }
    }

    await db.runAsync(
      'UPDATE product_variants SET stock = ?, cost_price = ? WHERE id = ?',
      [newStock, newCostPrice, variantId]
    );

    await db.runAsync(
      `INSERT INTO stock_movements (
        id, variant_id, type, quantity, cost_price, previous_stock, current_stock, ref_id, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        generateId(),
        variantId,
        type,
        quantity,
        costPrice || newCostPrice,
        previousStock,
        newStock,
        note || (type === 'in' ? 'Restok masuk' : 'Penyesuaian stok'),
        now,
      ]
    );
  });
}

export async function getStockMovements(variantId: string): Promise<StockMovement[]> {
  const db = await getDb();
  return await db.getAllAsync<StockMovement>(
    'SELECT * FROM stock_movements WHERE variant_id = ? ORDER BY created_at DESC LIMIT 50',
    [variantId]
  );
}
