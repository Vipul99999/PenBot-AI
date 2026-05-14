import { http } from './http';
export const adminApi = {
    ocrStats: () => http.get('/api/admin/ocr/stats'),
    ocrJobs: () => http.get('/api/admin/ocr/jobs'),
    cleanupFailed: (days = 30) => http.post(`/api/admin/cleanup/failed?days=${days}`)
};
