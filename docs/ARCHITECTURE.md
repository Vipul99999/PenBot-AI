# PenBot AI Architecture

```mermaid
flowchart LR
A[React Client] --> B[Express API]
B --> C[(MongoDB Atlas)]
B --> G[(GridFS Uploads)]
B --> D[Background OCR Runner]
D --> E[FastAPI AI Service]
E --> F[PDF extraction / Tesseract OCR / NLP]
```

## Processing flow
Upload -> Save original in GridFS -> Background OCR -> Structure detection -> Store editable blocks -> Edit -> Search/Export

Original PDFs/images are stored in MongoDB GridFS, so preview and retry OCR continue to work after server restart or redeploy.
