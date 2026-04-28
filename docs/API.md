# API Docs

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- GET `/api/auth/me`

## Notes
- POST `/api/notes/upload`
- GET `/api/notes`
- GET `/api/notes/search?q=...`
- GET `/api/notes/:id`
- GET `/api/notes/:id/status`
- PUT `/api/notes/:id`
- POST `/api/notes/:id/corrections`
- DELETE `/api/notes/:id`

## AI
- POST `/api/ai/summary/:id`
- POST `/api/ai/flashcards/:id`

## Export
- GET `/api/export/pdf/:id`
- GET `/api/export/docx/:id`
- GET `/api/export/markdown/:id`
- GET `/api/export/txt/:id`
