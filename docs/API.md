# API Docs

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`
- POST `/api/auth/logout`
- GET `/api/auth/me`
- PUT `/api/auth/settings`
- DELETE `/api/auth/data`
- DELETE `/api/auth/account`

Auth uses an HttpOnly `penbot_token` cookie and also accepts a Bearer token for development/API clients.

## Notes
- POST `/api/notes/upload`
- GET `/api/notes`
- GET `/api/notes/search?q=...`
- GET `/api/notes/:id`
- GET `/api/notes/:id/original` - streams the GridFS original upload for preview
- GET `/api/notes/:id/status`
- PUT `/api/notes/:id`
- POST `/api/notes/:id/corrections`
- DELETE `/api/notes/:id`

## AI
- POST `/api/ai/summary/:id`
- POST `/api/ai/flashcards/:id`

## System
- GET `/api/system/readiness` - checks backend, MongoDB/GridFS, AI service, OCR providers, and local-first cost mode

## Admin
- GET `/api/admin/ocr/stats` - admin-only OCR/storage summary
- GET `/api/admin/ocr/jobs` - admin-only recent OCR job list
- POST `/api/admin/cleanup/failed?days=30` - admin-only cleanup for old failed uploads

## Export
- GET `/api/export/pdf/:id`
- GET `/api/export/docx/:id`
- GET `/api/export/markdown/:id`
- GET `/api/export/txt/:id`
