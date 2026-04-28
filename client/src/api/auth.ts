import { http } from './http';

export const authApi = {
  register: (payload: { name: string; email: string; password: string }) => http.post('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) => http.post('/api/auth/login', payload),
  me: () => http.get('/api/auth/me')
};
