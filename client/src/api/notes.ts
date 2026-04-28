import { http } from './http';

export const notesApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return http.post('/api/notes/upload', fd);
  },
  list: () => http.get('/api/notes'),
  get: (id: string) => http.get(`/api/notes/${id}`),
  status: (id: string) => http.get(`/api/notes/${id}/status`),
  update: (id: string, payload: any) => http.put(`/api/notes/${id}`, payload),
  correction: (id: string, payload: { wrong: string; corrected: string }) => http.post(`/api/notes/${id}/corrections`, payload),
  search: (q: string) => http.get(`/api/notes/search?q=${encodeURIComponent(q)}`),
  summary: (id: string) => http.post(`/api/ai/summary/${id}`),
  flashcards: (id: string) => http.post(`/api/ai/flashcards/${id}`),
  exportPdf: (id: string) => `${http.defaults.baseURL}/api/export/pdf/${id}`,
  exportDocx: (id: string) => `${http.defaults.baseURL}/api/export/docx/${id}`,
  exportMarkdown: (id: string) => `${http.defaults.baseURL}/api/export/markdown/${id}`,
  exportTxt: (id: string) => `${http.defaults.baseURL}/api/export/txt/${id}`
};
