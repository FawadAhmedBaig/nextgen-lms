import axios from 'axios';

const API = axios.create({
  // This pulls from your .env (VITE_API_URL)
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Optional: Add a request interceptor to attach JWT tokens automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;