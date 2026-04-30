import { http } from './http';
export const notesApi = {
    upload: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return http.post('/api/notes/upload', fd);
    },
    list: () => http.get('/api/notes'),
    get: (id) => http.get(`/api/notes/${id}`),
    status: (id) => http.get(`/api/notes/${id}/status`),
    update: (id, payload) => http.put(`/api/notes/${id}`, payload),
    correction: (id, payload) => http.post(`/api/notes/${id}/corrections`, payload),
    search: (q) => http.get(`/api/notes/search?q=${encodeURIComponent(q)}`),
    summary: (id) => http.post(`/api/ai/summary/${id}`),
    flashcards: (id) => http.post(`/api/ai/flashcards/${id}`),
    exportPdf: (id) => `${http.defaults.baseURL}/api/export/pdf/${id}`,
    exportDocx: (id) => `${http.defaults.baseURL}/api/export/docx/${id}`,
    exportMarkdown: (id) => `${http.defaults.baseURL}/api/export/markdown/${id}`,
    exportTxt: (id) => `${http.defaults.baseURL}/api/export/txt/${id}`
};
