import axios from 'axios';

const isDev = import.meta.env.DEV;

export const apiClient = axios.create({
  baseURL: isDev ? 'http://localhost:5525/api' : 'https://workspace.northbkk.ac.th/api',
  withCredentials: true, // Requires backend to set CORS origin properly and accept credentials
});
