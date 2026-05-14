import importlib.util
import os
import shutil
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter()

@router.get('/health')
def health():
    trocr_enabled = os.getenv("ENABLE_TROCR", "false").lower() == "true"
    trocr_package = importlib.util.find_spec("transformers") is not None and importlib.util.find_spec("torch") is not None
    return {
        "ok": True,
        "app": "PenBot AI Service",
        "ocr": {
            "localPreprocessing": True,
            "tesseractBinary": bool(shutil.which("tesseract")),
            "rapidOcrPackage": importlib.util.find_spec("rapidocr_onnxruntime") is not None,
            "trocrEnabled": trocr_enabled,
            "trocrPackage": trocr_package,
            "trocrReady": trocr_enabled and trocr_package,
            "trocrModel": os.getenv("TROCR_MODEL", "microsoft/trocr-base-handwritten"),
            "trocrDevice": os.getenv("TROCR_DEVICE", "auto"),
            "externalFallbackConfigured": bool(os.getenv("OCR_SPACE_API_KEY"))
        }
    }
