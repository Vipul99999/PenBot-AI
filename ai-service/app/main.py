from fastapi import FastAPI
from app.routes import health, nlp, ocr

app = FastAPI(title="PenBot AI Service", version="1.0.0")
app.include_router(health.router)
app.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
app.include_router(nlp.router, prefix="/nlp", tags=["nlp"])
