import axios from 'axios';

const api = axios.create({
  baseURL: 'https://assembleia-de-deus-backend-production.up.railway.app/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
