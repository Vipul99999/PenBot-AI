# PenBot AI

> Write by hand. Use digitally.

PenBot AI converts handwritten notes from images or PDFs into structured, editable, searchable digital study notes. It is built as a low-cost, local-first product: MongoDB stores documents and originals, the backend manages users and exports, and the AI service runs free OCR/NLP locally with optional TrOCR/ViT handwriting recognition.

## Apps

- `client`: React + TypeScript + Vite + Tailwind
- `server`: Node.js + Express + TypeScript + MongoDB + JWT
- `ai-service`: FastAPI + preprocessing + RapidOCR/Tesseract + optional TrOCR/ViT

## Product Features

- Register/login and protected user workspace
- Upload JPG, PNG, JPEG, or PDF notes
- Image preview with crop, rotate, and scan-quality guidance before conversion
- Page-aware OCR for multi-page PDFs
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

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SETUP.md`
- `docs/TROUBLESHOOTING.md`
