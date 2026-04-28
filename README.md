# PenBot AI

> **Write by hand. Use digitally.**

PenBot AI is a full-stack web application that converts handwritten notes (image/PDF) into structured, editable, searchable digital notes.

## Monorepo apps
- `client` — React + TypeScript + Vite + Tailwind + Tiptap
- `server` — Node.js + Express + TypeScript + MongoDB + JWT + BullMQ + Redis
- `ai-service` — FastAPI + OCR/NLP pipeline scaffold for transformer integration

## Implemented features
- Authentication: register/login/me/forgot/reset password
- Upload: JPG/PNG/JPEG/PDF
- Async OCR queue processing
- Smart structured blocks + confidence highlight support
- Formula normalization (`²` → `^2`) and code/table-compatible block typing
- Summary and flashcards generation
- Subject tagging (DSA/OS/DBMS/CN/AI)
- Personalized OCR learning endpoint for correction feedback
- Search with MongoDB text index
- Rich editing (Tiptap)
- Export PDF, DOCX, Markdown, TXT

## Quick start (Docker)
```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- AI service: http://localhost:8000

## Local development
### Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### AI service
```bash
cd ai-service
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Client
```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Documentation
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SETUP.md`
- `docs/FINAL_YEAR_REPORT.md`
- `docs/PRESENTATION.md`
- `docs/TROUBLESHOOTING.md`

## Deployment targets
- Frontend → Vercel
- Backend → Railway/Render
- MongoDB → Atlas
- AI service → GPU VM/Hugging Face Inference
