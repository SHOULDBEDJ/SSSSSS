import fs from 'fs-extra';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'db.json');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const COLLECTIONS = [
  'bookings', 'customers', 'categories', 'inventory_items', 
  'expenses', 'expense_types', 'function_types', 'vendors', 
  'vendor_transactions', 'vendor_bills', 'upi_ids', 
  'gallery_categories', 'gallery_albums', 'gallery_photos', 
  'business_profile', 'order_sessions'
];

async function migrate() {
  console.log('Starting migration from db.json to Turso...');

  if (!(await fs.pathExists(DATA_FILE))) {
    console.error('db.json not found. Nothing to migrate.');
    process.exit(1);
  }

  const db = await fs.readJson(DATA_FILE);

  for (const collection of COLLECTIONS) {
    const items = db[collection] || [];
    if (items.length === 0) {
      console.log(`Collection ${collection} is empty, skipping.`);
      continue;
    }

    console.log(`Migrating ${items.length} items to ${collection}...`);

    // Ensure table exists
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ${collection} (
        id TEXT PRIMARY KEY,
        data TEXT,
        created_at TEXT
      )
    `);

    // Clear existing data in table
    await client.execute(`DELETE FROM ${collection}`);

    // Insert items in batches
    const batchSize = 50;
    for (let i = 0; i < items.length; i += batchSize) {
      const batchItems = items.slice(i, i + batchSize);
      const batchQueries = batchItems.map(item => ({
        sql: `INSERT INTO ${collection} (id, data, created_at) VALUES (?, ?, ?)`,
        args: [
          item.id || String(Math.random()), 
          JSON.stringify(item), 
          item.created_at || new Date().toISOString()
        ]
      }));

      await client.batch(batchQueries, "write");
    }
    
    console.log(`Finished migrating ${collection}.`);
  }

  console.log('Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
