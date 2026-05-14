import request from 'supertest';
import { app } from './app';

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('auth validation', () => {
  it('rejects malformed login input before database work', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad-email', password: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid forgot-password email', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'bad-email' });
    expect(res.status).toBe(400);
  });

  it('rejects weak reset password input', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: '12345678901234567890', password: 'weak' });
    expect(res.status).toBe(400);
  });
});
