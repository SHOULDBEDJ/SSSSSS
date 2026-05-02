import axios from 'axios';
import { toast } from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred';
    
    // Only toast on non-GET errors by default to avoid toast spam on background refreshes,
    // or customize as needed.
    if (error.config.method !== 'get') {
      toast.error(message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
