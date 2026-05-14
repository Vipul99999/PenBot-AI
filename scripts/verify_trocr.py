import importlib.util
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AI_SERVICE = ROOT / "ai-service"
sys.path.insert(0, str(AI_SERVICE))


def installed(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def main() -> None:
    from dotenv import load_dotenv

    load_dotenv(AI_SERVICE / ".env")

    report = {
        "enableTrocr": os.getenv("ENABLE_TROCR", "false").lower() == "true",
        "model": os.getenv("TROCR_MODEL", "microsoft/trocr-base-handwritten"),
        "packages": {
            "torch": installed("torch"),
            "transformers": installed("transformers"),
            "rapidocr": installed("rapidocr_onnxruntime"),
            "pytesseract": installed("pytesseract"),
        },
    }

    if report["packages"]["torch"]:
        import torch

        report["torch"] = {
            "version": torch.__version__,
            "cuda": torch.cuda.is_available(),
        }

    if report["packages"]["transformers"]:
        import transformers
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel  # noqa: F401

        report["transformers"] = {
            "version": transformers.__version__,
            "trocrImports": True,
        }

    report["ready"] = report["enableTrocr"] and report["packages"]["torch"] and report["packages"]["transformers"]
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
