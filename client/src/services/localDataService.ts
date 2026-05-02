import api from '../api/axios';
import { toast } from 'react-hot-toast';

export const localDataService = {
  /**
   * Get all items from a table
   */
  getAll: async (table: string) => {
    try {
      const { data } = await api.get(`/${table}`);
      return data;
    } catch (error) {
      console.error(`Error fetching ${table}:`, error);
      toast.error(`Failed to fetch ${table}`);
      return [];
    }
  },

  /**
   * Get a single item by ID
   */
  getById: async (table: string, id: string) => {
    try {
      const { data } = await api.get(`/${table}/${id}`);
      return data;
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
      // Handle auto-incrementing-like IDs for bookings
      if (table === "bookings" && !item.booking_id) {
        const items = await localDataService.getAll(table);
        const count = items.length + 1;
        item.booking_id = `BKG-${1000 + count}`;
      }

      const { data } = await api.post(`/${table}`, item);
      toast.success('Saved successfully');
      return data;
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      toast.error('Failed to save');
      throw error;
    }
  },

  /**
   * Update an existing item
   */
  update: async (table: string, id: string, updates: any) => {
    try {
      const { data } = await api.put(`/${table}/${id}`, updates);
      toast.success('Updated successfully');
      return data;
    } catch (error) {
      console.error(`Error updating ${table}/${id}:`, error);
      toast.error('Failed to update');
      throw error;
    }
  },

  /**
   * Delete an item
   */
  delete: async (table: string, id: string) => {
    try {
      await api.delete(`/${table}/${id}`);
      toast.success('Deleted successfully');
      return true;
    } catch (error) {
      console.error(`Error deleting from ${table}/${id}:`, error);
      toast.error('Failed to delete');
      return false;
    }
  },

  /**
   * Bulk insert/replace
   */
  saveAll: async (table: string, items: any[]) => {
    try {
      const { data } = await api.post(`/${table}/batch`, items);
      toast.success('Bulk update successful');
      return data;
    } catch (error) {
      console.error(`Error batch updating ${table}:`, error);
      toast.error('Bulk update failed');
      throw error;
    }
  },

  /**
   * Initialize defaults
   */
  initializeDefaults: async () => {
    console.log("Backend connection initialized.");
  }
};
