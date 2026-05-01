import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;

// Turso Client Initialization
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Initial Database Structure (Collections)
const COLLECTIONS = [
  'bookings', 'customers', 'categories', 'inventory_items', 
  'expenses', 'expense_types', 'function_types', 'vendors', 
  'vendor_transactions', 'vendor_bills', 'upi_ids', 
  'gallery_categories', 'gallery_albums', 'gallery_photos', 
  'business_profile', 'order_sessions'
];

// Ensure tables exist in Turso
const initDb = async () => {
  try {
    for (const collection of COLLECTIONS) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS ${collection} (
          id TEXT PRIMARY KEY,
          data TEXT,
          created_at TEXT
        )
      `);
    }
    console.log('Turso database tables verified.');
  } catch (error) {
    console.error('Error initializing Turso:', error);
  }
};

await initDb();

// --- Generic CRUD API (SQL Version) ---

// Get all items in a collection
app.get('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
    
    const result = await client.execute(`SELECT data FROM ${collection} ORDER BY created_at DESC`);
    const items = result.rows.map(row => JSON.parse(row.data));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to collection
app.post('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
    
    const id = req.body.id || uuidv4();
    const createdAt = new Date().toISOString();
    const item = { ...req.body, id, created_at: createdAt };
    
    await client.execute({
      sql: `INSERT INTO ${collection} (id, data, created_at) VALUES (?, ?, ?)`,
      args: [id, JSON.stringify(item), createdAt]
    });
    
    // Notify all clients via Socket.io
    io.emit('db_updated', { collection, action: 'insert', item });
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update item in collection (Merge version)
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
    
    // 1. Fetch existing data
    const existing = await client.execute({
      sql: `SELECT data FROM ${collection} WHERE id = ?`,
      args: [id]
    });
    
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    
    const existingData = JSON.parse(existing.rows[0].data);
    
    // 2. Merge new data
    const updatedAt = new Date().toISOString();
    const updatedData = { ...existingData, ...req.body, id, updated_at: updatedAt };
    
    // 3. Update in Turso
    await client.execute({
      sql: `UPDATE ${collection} SET data = ? WHERE id = ?`,
      args: [JSON.stringify(updatedData), id]
    });
    
    // Notify all clients
    io.emit('db_updated', { collection, action: 'update', id, item: updatedData });
    
    res.json(updatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete item from collection
app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
    
    const result = await client.execute({
      sql: `DELETE FROM ${collection} WHERE id = ?`,
      args: [id]
    });
    
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Item not found' });
    
    // Notify all clients
    io.emit('db_updated', { collection, action: 'delete', id });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Replace entire collection (batch update)
app.post('/api/:collection/batch', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
    
    const items = req.body;
    
    // Use a transaction for batch updates
    await client.batch(
      [
        { sql: `DELETE FROM ${collection}`, args: [] },
        ...items.map(item => ({
          sql: `INSERT INTO ${collection} (id, data, created_at) VALUES (?, ?, ?)`,
          args: [item.id || uuidv4(), JSON.stringify(item), item.created_at || new Date().toISOString()]
        }))
      ],
      "write"
    );
    
    // Notify all clients
    io.emit('db_updated', { collection, action: 'batch' });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected for real-time sync');
});

if (process.env.NODE_ENV !== 'production') {
  httpServer.listen(PORT, () => {
    console.log(`Smart Tailor Backend running on port ${PORT} (Turso Connected)`);
  });
}

export default app;
