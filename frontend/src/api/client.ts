import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:5525/api',
  withCredentials: true, // Requires backend to set CORS origin properly and accept credentials
});
