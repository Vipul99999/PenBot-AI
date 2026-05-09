# PenBot AI Architecture

```mermaid
flowchart LR
A[React Client] --> B[Express API]
B --> C[(MongoDB Atlas)]
B --> G[(GridFS Uploads)]
B --> D[Background OCR Runner]
D --> E[FastAPI AI Service]
E --> F[PDF extraction / TrOCR ViT / Tesseract / RapidOCR / NLP]
```

## Processing flow
Upload -> Save original in GridFS -> Background OCR -> Structure detection -> Store editable blocks -> Edit -> Search/Export

Original PDFs/images are stored in MongoDB GridFS, so preview and retry OCR continue to work after server restart or redeploy.

The OCR engine is layered for real-world reliability:
1. Optional TrOCR/ViT handwriting recognition when `ENABLE_TROCR=true`.
2. Local Tesseract/RapidOCR fallback with preprocessing.
3. Optional OCR.space fallback only when `OCR_SPACE_API_KEY` is configured.
