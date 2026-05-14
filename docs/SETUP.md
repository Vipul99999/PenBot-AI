# Setup Guide

## Prerequisites
- Node.js 20+
- Python 3.11+
- Docker + Docker Compose

## Option A: Docker (recommended)
1. `docker compose up --build`
2. Open:
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:4000/health`
   - AI service: `http://localhost:8000/health`

## Option B: Local services
### Server
1. `cd server`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

### AI service
1. `cd ai-service`
2. `cp .env.example .env`
3. `python -m venv .venv && source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. For stronger handwriting accuracy, install the free local TrOCR/ViT stack: `pip install -r requirements-vision.txt`
6. Set `ENABLE_TROCR=true` in `ai-service/.env`
7. `uvicorn app.main:app --reload --port 8000`

Use `OCR mode = High accuracy` in the upload screen to run TrOCR/ViT. `Fast` and `Balanced` stay on the lighter local OCR path to keep normal usage cheaper and faster.

Set `MAX_PDF_PAGES` in `ai-service/.env` to control local OCR cost for very large PDFs. The default is `25`.

### Client
1. `cd client`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

## Verification checklist
- Register and login from `/register` and `/login`.
- Upload a sample note in `/dashboard/upload`.
- Open note in editor and confirm status updates to `done`.
- Refresh/restart the backend and confirm the original preview still opens; uploaded originals are stored in MongoDB GridFS.
- Generate summary + flashcards.
- Add correction in Personalized OCR learning panel.
- Export PDF/DOCX/MD/TXT.
- Preview PDF before download from the editor.
- Visit `/dashboard/settings` to configure OCR mode, document template, max PDF pages, and default export format.
- For admin users listed in `ADMIN_EMAILS`, visit `/dashboard/admin` to monitor OCR jobs.

## End-to-end tests
1. Start MongoDB, server, AI service, and client.
2. Run `cd client && npm run e2e`.
3. The test covers register -> sample upload -> OCR result -> edit A4 document -> PDF preview.

## Production security checklist
- Set `NODE_ENV=production`.
- Replace `JWT_SECRET=change_me` with a long random secret before deploy.
- Configure a real email provider before sending public password reset emails.
- Set SMTP values in `server/.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Put admin emails in `ADMIN_EMAILS` for the OCR operations dashboard.
- Use HTTPS for the frontend and API.
- Keep MongoDB private; expose only the backend and frontend publicly.
- Keep original uploads in GridFS or another persistent storage provider.
