import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('kasirhan.db');
  await initDatabase(dbInstance);
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);
  try {
    await db.execAsync('ALTER TABLE business_profile ADD COLUMN qris_image_uri TEXT DEFAULT NULL;');
  } catch {
    // Column already exists
  }
  try {
    await db.execAsync('ALTER TABLE business_profile ADD COLUMN logo_image_uri TEXT DEFAULT NULL;');
  } catch {
    // Column already exists
  }
}

/**
 * Execute within SQLite transaction
 */
export async function withTransaction<T>(
  action: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const db = await getDb();
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await action(db);
  });
  return result!;
}
