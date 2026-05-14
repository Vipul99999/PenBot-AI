import { http } from './http';

export const notesApi = {
  upload: (file: File, scanQuality?: any, options?: any) => {
    const fd = new FormData();
    fd.append('file', file);
    if (scanQuality) fd.append('scanQuality', JSON.stringify(scanQuality));
    if (options?.ocrMode) fd.append('ocrMode', options.ocrMode);
    if (options?.documentTemplate) fd.append('documentTemplate', options.documentTemplate);
    if (options?.maxPdfPages) fd.append('maxPdfPages', String(options.maxPdfPages));
    return http.post('/api/notes/upload', fd);
  },
  list: () => http.get('/api/notes'),
  get: (id: string) => http.get(`/api/notes/${id}`),
  original: (id: string) => http.get(`/api/notes/${id}/original`, { responseType: 'blob' }),
  status: (id: string) => http.get(`/api/notes/${id}/status`),
  retryOcr: (id: string) => http.post(`/api/notes/${id}/retry-ocr`),
  update: (id: string, payload: any) => http.put(`/api/notes/${id}`, payload),
  delete: (id: string) => http.delete(`/api/notes/${id}`),
  correction: (id: string, payload: { wrong: string; corrected: string }) => http.post(`/api/notes/${id}/corrections`, payload),
  search: (q: string) => http.get(`/api/notes/search?q=${encodeURIComponent(q)}`),
  summary: (id: string) => http.post(`/api/ai/summary/${id}`),
  flashcards: (id: string) => http.post(`/api/ai/flashcards/${id}`),
  exportPdf: (id: string) => `${http.defaults.baseURL}/api/export/pdf/${id}`,
  exportDocx: (id: string) => `${http.defaults.baseURL}/api/export/docx/${id}`,
  exportMarkdown: (id: string) => `${http.defaults.baseURL}/api/export/markdown/${id}`,
  exportTxt: (id: string) => `${http.defaults.baseURL}/api/export/txt/${id}`
};
