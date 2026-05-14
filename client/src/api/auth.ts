import { http } from './http';

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) => http.post('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) => http.post('/api/auth/login', payload),
  forgotPassword: (payload: { email: string }) => http.post('/api/auth/forgot-password', payload),
  resetPassword: (payload: { token: string; password: string }) => http.post('/api/auth/reset-password', payload),
  logout: () => http.post('/api/auth/logout'),
  me: () => http.get('/api/auth/me'),
  updateSettings: (payload: any) => http.put('/api/auth/settings', payload),
  deleteData: () => http.delete('/api/auth/data'),
  deleteAccount: () => http.delete('/api/auth/account')
};
