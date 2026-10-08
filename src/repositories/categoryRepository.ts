import { getDb } from '../db/database';
import { Category } from '../types';
import { generateId } from '../utils/format';

export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC');
}

export async function createCategory(name: string, color: string = '#3B82F6', icon: string = 'tag'): Promise<Category> {
  const db = await getDb();
  const category: Category = {
    id: generateId(),
    name: name.trim(),
    color,
    icon,
    created_at: new Date().toISOString(),
  };

  await db.runAsync(
    'INSERT INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
    [category.id, category.name, category.color || '#3B82F6', category.icon || 'tag', category.created_at!]
  );
  return category;
}

export async function updateCategory(id: string, name: string, color?: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET name = ?, color = COALESCE(?, color) WHERE id = ?',
    [name.trim(), color || null, id]
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function seedCategories(categories: Category[]): Promise<void> {
  const db = await getDb();
  for (const cat of categories) {
    await db.runAsync(
      'INSERT OR IGNORE INTO categories (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
      [cat.id, cat.name, cat.color || '#3B82F6', cat.icon || 'tag', cat.created_at || new Date().toISOString()]
    );
  }
}
