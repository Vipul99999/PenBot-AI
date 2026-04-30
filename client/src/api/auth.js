import { http } from './http';
export const authApi = {
    register: (payload) => http.post('/api/auth/register', payload),
    login: (payload) => http.post('/api/auth/login', payload),
    me: () => http.get('/api/auth/me')
};
