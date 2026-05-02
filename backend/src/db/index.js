import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const dbUrl = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

console.log(`Connecting to database at: ${dbUrl}`);

export const db = createClient({
  url: dbUrl,
  authToken: authToken,
});

export const COLLECTIONS = [
  'bookings', 'customers', 'categories', 'inventory_items', 
  'expenses', 'expense_types', 'function_types', 'vendors', 
  'vendor_transactions', 'vendor_bills', 'upi_ids', 
  'gallery_categories', 'gallery_albums', 'gallery_photos', 
  'business_profile', 'order_sessions'
];

export const initDb = async () => {
  try {
    for (const collection of COLLECTIONS) {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS ${collection} (
          id TEXT PRIMARY KEY,
          data TEXT,
          created_at TEXT
        )
      `);
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
};
