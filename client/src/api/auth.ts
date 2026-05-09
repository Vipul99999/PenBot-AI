import { http } from './http';

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) => http.post('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) => http.post('/api/auth/login', payload),
  forgotPassword: (payload: { email: string }) => http.post('/api/auth/forgot-password', payload),
  resetPassword: (payload: { token: string; password: string }) => http.post('/api/auth/reset-password', payload),
  me: () => http.get('/api/auth/me')
};
