import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || '' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
