import importlib.util
import os
import shutil

from fastapi import APIRouter

router = APIRouter()

@router.get('/health')
def health():
    trocr_enabled = os.getenv("ENABLE_TROCR", "false").lower() == "true"
    return {
        "ok": True,
        "app": "PenBot AI Service",
        "ocr": {
            "localPreprocessing": True,
            "tesseractBinary": bool(shutil.which("tesseract")),
            "rapidOcrPackage": importlib.util.find_spec("rapidocr_onnxruntime") is not None,
            "trocrEnabled": trocr_enabled,
            "trocrPackage": importlib.util.find_spec("transformers") is not None and importlib.util.find_spec("torch") is not None,
            "trocrModel": os.getenv("TROCR_MODEL", "microsoft/trocr-base-handwritten"),
            "externalFallbackConfigured": bool(os.getenv("OCR_SPACE_API_KEY"))
        }
    }
