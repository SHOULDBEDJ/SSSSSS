import { db, COLLECTIONS } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export const getAll = async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const result = await db.execute(`SELECT data FROM ${collection} ORDER BY created_at DESC`);
    const items = result.rows.map(row => JSON.parse(row.data));
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const id = req.body.id || uuidv4();
    const createdAt = new Date().toISOString();
    const item = { ...req.body, id, created_at: createdAt };
    
    await db.execute({
      sql: `INSERT INTO ${collection} (id, data, created_at) VALUES (?, ?, ?)`,
      args: [id, JSON.stringify(item), createdAt]
    });
    
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const { collection, id } = req.params;
    if (!COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const existing = await db.execute({
      sql: `SELECT data FROM ${collection} WHERE id = ?`,
      args: [id]
    });
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const existingData = JSON.parse(existing.rows[0].data);
    const updatedAt = new Date().toISOString();
    const updatedData = { ...existingData, ...req.body, id, updated_at: updatedAt };
    
    await db.execute({
      sql: `UPDATE ${collection} SET data = ? WHERE id = ?`,
      args: [JSON.stringify(updatedData), id]
    });
    
    res.json(updatedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const { collection, id } = req.params;
    if (!COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const result = await db.execute({
      sql: `DELETE FROM ${collection} WHERE id = ?`,
      args: [id]
    });
    
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const batchUpdate = async (req, res) => {
  try {
    const { collection } = req.params;
    if (!COLLECTIONS.includes(collection)) {
      return res.status(404).json({ error: 'Collection not found' });
    }
    
    const items = req.body;
    
    await db.batch(
      [
        { sql: `DELETE FROM ${collection}`, args: [] },
        ...items.map(item => ({
          sql: `INSERT INTO ${collection} (id, data, created_at) VALUES (?, ?, ?)`,
          args: [item.id || uuidv4(), JSON.stringify(item), item.created_at || new Date().toISOString()]
        }))
      ],
      "write"
    );
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
