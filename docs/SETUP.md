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
5. `uvicorn app.main:app --reload --port 8000`

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

## Production security checklist
- Set `NODE_ENV=production`.
- Replace `JWT_SECRET=change_me` with a long random secret before deploy.
- Configure a real email provider before sending public password reset emails.
- Use HTTPS for the frontend and API.
- Keep MongoDB private; expose only the backend and frontend publicly.
- Keep original uploads in GridFS or another persistent storage provider.
