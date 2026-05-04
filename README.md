# PenBot AI

> **Write by hand. Use digitally.**

PenBot AI is a full-stack web application that converts handwritten notes (image/PDF) into structured, editable, searchable digital notes.

## Monorepo apps
- `client` — React + TypeScript + Vite + Tailwind + Tiptap
- `server` — Node.js + Express + TypeScript + MongoDB + JWT
- `ai-service` — FastAPI + free local OCR/NLP pipeline with optional vision-model upgrade

## Implemented features
- Authentication: register/login/me/forgot/reset password
- Upload: JPG/PNG/JPEG/PDF
- Async OCR in-process background processing
- Free local OCR preprocessing: auto-crop, deskew, contrast boost, shadow/noise cleanup, multiple OCR passes, and stronger scanned-PDF rendering
- Upload scan quality check with focus, contrast, brightness, and retake/crop suggestions
- Smart structured blocks: title, headings, bullets, definitions, Q&A, formulas, code, and paragraphs
- Formula normalization (`²` → `^2`) and study-note block typing
- Summary and flashcards generation
- Subject tagging (DSA/OS/DBMS/CN/AI)
- Manual correction workflow that updates the current note and teaches future OCR retries
- Search with MongoDB text index
- Rich editing (Tiptap)
- Polished study-note export to PDF, DOCX, Markdown, TXT
- Demo mode sample notes from the upload page
- Persistent original uploads stored in MongoDB GridFS for preview and OCR retry after deploy/restart

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

## Deployment targets
- Frontend → Vercel
- Backend → Railway/Render
- MongoDB → Atlas
- AI service → GPU VM/Hugging Face Inference
