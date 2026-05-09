import { http } from './http';

export const systemApi = {
  readiness: () => http.get('/api/system/readiness')
};
