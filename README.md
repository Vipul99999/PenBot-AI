# PenBot AI

> Write by hand. Use digitally.

PenBot AI converts handwritten notes from images or PDFs into structured, editable, searchable digital study notes. It is built as a low-cost, local-first product: MongoDB stores documents and originals, the backend manages users and exports, and the AI service runs free OCR/NLP locally with optional TrOCR/ViT handwriting recognition.

## Apps

- `client`: React + TypeScript + Vite + Tailwind
- `server`: Node.js + Express + TypeScript + MongoDB + JWT
- `ai-service`: FastAPI + preprocessing + RapidOCR/Tesseract + optional TrOCR/ViT

## Product Features

- Register/login and protected user workspace
- HttpOnly cookie auth with token fallback for development
- SMTP password reset email support
- Upload JPG, PNG, JPEG, or PDF notes
- Image preview with crop, rotate, and scan-quality guidance before conversion
- Page-aware OCR for multi-page PDFs
- Mongo-backed OCR worker that recovers queued or interrupted jobs after server restart
- Configurable `MAX_PDF_PAGES` limit to keep local OCR fast and low cost
- Original file preview stored persistently in MongoDB GridFS
- Side-by-side original page and editable converted note
- Editable OCR blocks per page: title, heading, bullet, paragraph, definition, formula, Q&A, code
- Low-confidence review flow and retry OCR
- Manual correction workflow for repeated OCR mistakes
- Autosave and save-all-pages editing
- Search across converted notes
- Summary and flashcards using the free local NLP service
- Polished PDF, DOCX, Markdown, and TXT export from edited blocks
- Dashboard readiness checks for server, MongoDB/GridFS, AI OCR, and upload storage
- Admin OCR operations dashboard for job status, retries, duration, confidence, and storage
- Export PDF preview before download
- Automatic visual A4 pagination for long converted pages
- User settings for default export format, OCR mode, document template, max PDF pages, and data deletion
- OCR quality presets: Fast, Balanced, High accuracy
- Document templates: Study notes, Lab report, Exam revision, Formula sheet, Q&A worksheet
- Demo sample notes for quick testing

## OCR Stack

The AI service is layered so the project can run without paid APIs:

1. TrOCR/ViT handwriting recognition when `ENABLE_TROCR=true`
2. Local preprocessing: crop borders, deskew, remove shadows/noise, boost contrast
3. RapidOCR and Tesseract-style OCR passes
4. Optional external OCR only if `OCR_SPACE_API_KEY` is configured

The local `.env` is configured for free local-first OCR. The first TrOCR run downloads the Hugging Face model if it is not cached.

## Quick Start With Docker

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:5173
- Backend: http://localhost:4000
- AI service: http://localhost:8000

The Docker AI image installs Tesseract and can install the optional vision stack through the compose build argument.

## Local Development

Server:

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

AI service:

```bash
cd ai-service
cp .env.example .env
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-vision.txt
uvicorn app.main:app --reload --port 8000
```

Client:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Health Checks

- Backend: http://localhost:4000/health
- AI service: http://localhost:8000/health
- Full readiness: http://localhost:4000/api/system/readiness

## Testing

Server tests and production builds:
```bash
cd server
npm run test
npm run build
```

Client unit tests:
```bash
cd client
npm run test
npm run build
```

End-to-end browser test scaffold:
```bash
cd client
npm run e2e
```

Run E2E only after MongoDB, server, AI service, and client are running.

Real OCR sample benchmark:
```bash
python scripts/ocr_benchmark.py path/to/handwritten-samples --ocr-mode balanced
```

Verify local TrOCR/ViT setup:
```bash
ai-service\.venv\Scripts\python.exe scripts\verify_trocr.py
```

For launch readiness, collect 20-50 real notes: neat pages, bad handwriting, tilted photos, dark photos, multi-page PDFs, formulas, tables, and lab notes. The benchmark report labels each upload as `good_scan`, `needs_review`, or `low_confidence` so OCR improvements can be measured instead of guessed.

## Production Config

Use the production env templates before deploying:

- `server/.env.production.example`
- `client/.env.production.example`
- `ai-service/.env.production.example`

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SETUP.md`
- `docs/TROUBLESHOOTING.md`
