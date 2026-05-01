/**
 * Local Data Service
 * Connects to the Node.js backend for persistence.
 */

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";

export const localDataService = {
  /**
   * Get all items from a table
   */
  getAll: async (table: string) => {
    try {
      const res = await fetch(`${API_BASE}/${table}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      return [];
    }
  },

  /**
   * Get a single item by ID
   */
  getById: async (table: string, id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${table}/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      console.error(`Error fetching ${table}/${id}:`, error);
      return null;
    }
  },

  /**
   * Insert a new item
   */
  insert: async (table: string, item: any) => {
    try {
      // Handle auto-incrementing-like IDs for bookings (e.g., BKG-1001)
      if (table === "bookings" && !item.booking_id) {
        const items = await localDataService.getAll(table);
        const count = items.length + 1;
        item.booking_id = `BKG-${1000 + count}`;
      }

      const res = await fetch(`${API_BASE}/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      return await res.json();
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing item
   */
  update: async (table: string, id: string, updates: any) => {
    try {
      const res = await fetch(`${API_BASE}/${table}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return await res.json();
    } catch (error) {
      console.error(`Error updating ${table}/${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete an item
   */
  delete: async (table: string, id: string) => {
    try {
      const res = await fetch(`${API_BASE}/${table}/${id}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (error) {
      console.error(`Error deleting from ${table}/${id}:`, error);
      return false;
    }
  },

  /**
   * Bulk insert/replace
   */
  saveAll: async (table: string, items: any[]) => {
    try {
      const res = await fetch(`${API_BASE}/${table}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      return await res.json();
    } catch (error) {
      console.error(`Error batch updating ${table}:`, error);
      throw error;
    }
  },

  /**
   * Initialize defaults (Handled by backend now, but kept for compatibility)
   */
  initializeDefaults: async () => {
    // The backend handles initialization of db.json if it's missing.
    // We just trigger a ping or do nothing.
    console.log("Backend connection initialized.");
  }
};
