import io
import os
import urllib.parse
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any

import fitz
from dotenv import load_dotenv
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.pipeline import apply_user_corrections, build_blocks, detect_tags, to_latex

load_dotenv(Path(__file__).resolve().parents[2] / ".env")
router = APIRouter()


class CorrectionPayload(BaseModel):
    userId: str
    wrong: str
    corrected: str


_CORRECTIONS: dict[str, dict[str, str]] = {}


@lru_cache(maxsize=1)
def get_rapid_ocr():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


@lru_cache(maxsize=1)
def get_trocr_model():
    try:
        import torch
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel
    except Exception as exc:
        raise RuntimeError("TrOCR dependencies are not installed. Install ai-service/requirements-vision.txt.") from exc

    model_name = os.getenv("TROCR_MODEL", "microsoft/trocr-base-handwritten")
    processor = TrOCRProcessor.from_pretrained(model_name)
    model = VisionEncoderDecoderModel.from_pretrained(model_name)
    device = "cuda" if torch.cuda.is_available() and os.getenv("TROCR_DEVICE", "auto") != "cpu" else "cpu"
    model.to(device)
    model.eval()
    return processor, model, device


def trocr_installed() -> bool:
    try:
        import torch  # noqa: F401
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel  # noqa: F401

        return True
    except Exception:
        return False


def pil_from_cv2(gray):
    from PIL import Image

    return Image.fromarray(gray).convert("L")


def trim_page_border(gray):
    import cv2
    import numpy as np

    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    contours, _hierarchy = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return gray

    height, width = gray.shape[:2]
    x, y, w, h = cv2.boundingRect(np.vstack(contours))
    pad = max(12, min(width, height) // 80)
    x = max(0, x - pad)
    y = max(0, y - pad)
    w = min(width - x, w + pad * 2)
    h = min(height - y, h + pad * 2)
    if w * h < width * height * 0.08:
        return gray
    return gray[y : y + h, x : x + w]


def deskew_image(gray):
    import cv2
    import numpy as np

    coords = np.column_stack(np.where(gray < 245))
    if coords.size == 0:
        return gray
    angle = cv2.minAreaRect(coords)[-1]
    angle = -(90 + angle) if angle < -45 else -angle
    if abs(angle) < 0.35 or abs(angle) > 15:
        return gray
    height, width = gray.shape[:2]
    matrix = cv2.getRotationMatrix2D((width // 2, height // 2), angle, 1.0)
    return cv2.warpAffine(gray, matrix, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def remove_shadow(gray):
    import cv2

    background = cv2.medianBlur(gray, 31)
    normalized = cv2.divide(gray, background, scale=255)
    return cv2.normalize(normalized, None, 0, 255, cv2.NORM_MINMAX)


def prepare_image_variants(content: bytes):
    import cv2
    import numpy as np
    from PIL import Image, ImageFilter, ImageOps

    image = Image.open(io.BytesIO(content)).convert("RGB")
    image = ImageOps.exif_transpose(image)
    width, height = image.size
    if max(width, height) < 1800:
        image = image.resize((width * 2, height * 2))

    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    gray = trim_page_border(gray)
    gray = deskew_image(gray)
    gray = remove_shadow(gray)

    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8)).apply(gray)
    denoised = cv2.fastNlMeansDenoising(clahe, None, 14, 7, 21)
    adaptive = cv2.adaptiveThreshold(denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 35, 11)
    otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    sharp = ImageOps.autocontrast(pil_from_cv2(denoised)).filter(ImageFilter.SHARPEN)
    return [
        ("enhanced", sharp.convert("RGB")),
        ("adaptive", pil_from_cv2(adaptive).convert("RGB")),
        ("otsu", pil_from_cv2(otsu).convert("RGB")),
        ("gray", ImageOps.autocontrast(pil_from_cv2(gray)).filter(ImageFilter.SHARPEN).convert("RGB")),
    ]


def text_score(text: str) -> float:
    import re

    cleaned = text.strip()
    if not cleaned:
        return 0
    letters = len(re.findall(r"[A-Za-z0-9]", cleaned))
    words = len(re.findall(r"\b[A-Za-z0-9]{2,}\b", cleaned))
    lines = len([line for line in cleaned.splitlines() if line.strip()])
    noise = len(re.findall(r"[^A-Za-z0-9\s.,:;!?()\-+=/%]", cleaned))
    return letters + words * 8 + lines * 12 - noise * 3


def run_tesseract(image, psm: int) -> str:
    try:
        import pytesseract

        return pytesseract.image_to_string(image, config=f"--oem 3 --psm {psm}").strip()
    except Exception:
        return ""


def run_rapidocr(image) -> str:
    try:
        import numpy as np

        result, _elapsed = get_rapid_ocr()(np.array(image.convert("RGB")))
        lines = [item[1].strip() for item in result or [] if len(item) > 1 and item[1].strip()]
        return "\n".join(lines)
    except Exception:
        return ""


def segment_text_lines(image):
    import cv2
    import numpy as np

    gray = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, gray.shape[1] // 35), 5))
    dilated = cv2.dilate(thresh, kernel, iterations=1)
    contours, _hierarchy = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes = []
    height, width = gray.shape[:2]
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        if w < width * 0.08 or h < 12:
            continue
        pad = max(8, h // 3)
        boxes.append((max(0, x - pad), max(0, y - pad), min(width, x + w + pad), min(height, y + h + pad)))

    boxes.sort(key=lambda box: (box[1], box[0]))
    return [image.crop(box) for box in boxes[: int(os.getenv("TROCR_MAX_LINES", "80"))]]


def run_trocr(content: bytes, enabled: bool = True) -> str:
    if not enabled:
        return ""

    try:
        import torch

        processor, model, device = get_trocr_model()
        image = prepare_image_variants(content)[0][1]
        line_images = segment_text_lines(image) or [image]
        lines = []
        for line_image in line_images:
            pixel_values = processor(images=line_image, return_tensors="pt").pixel_values.to(device)
            with torch.no_grad():
                generated_ids = model.generate(pixel_values, max_length=96)
            text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()
            if text:
                lines.append(text)
        return "\n".join(lines).strip()
    except Exception as exc:
        print("TrOCR unavailable or failed:", repr(exc))
        return ""


def ocr_image(image) -> str:
    candidates = []
    for psm in (6, 4, 11, 12):
        text = run_tesseract(image, psm)
        if text:
            candidates.append(text)

    rapid_text = run_rapidocr(image)
    if rapid_text:
        candidates.append(rapid_text)

    return max(candidates, key=text_score).strip() if candidates else ""


def ocr_image_variants(content: bytes, use_trocr: bool = True) -> tuple[str, str]:
    trocr_text = run_trocr(content, enabled=use_trocr)
    candidates = [(text_score(trocr_text) + 120, "trocr", trocr_text)] if trocr_text else []

    for name, image in prepare_image_variants(content):
        text = ocr_image(image)
        if text:
            candidates.append((text_score(text), name, text))
    if not candidates:
        return "", ""
    _score, name, text = max(candidates, key=lambda item: item[0])
    return text.strip(), name


def image_quality_report(content: bytes) -> dict:
    import cv2
    import numpy as np
    from PIL import Image, ImageOps

    image = Image.open(io.BytesIO(content)).convert("RGB")
    image = ImageOps.exif_transpose(image)
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    height, width = gray.shape[:2]
    brightness = float(np.mean(gray))
    contrast = float(np.std(gray))
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    dark_pixels = float(np.mean(gray < 120))
    suggestions = []
    if max(width, height) < 1400:
        suggestions.append("Move closer or upload a higher resolution scan.")
    if blur < 90:
        suggestions.append("The image looks blurry. Retake with steady focus.")
    if contrast < 42:
        suggestions.append("Increase contrast or use brighter, even lighting.")
    if brightness < 95:
        suggestions.append("The page is dark. Add light before scanning.")
    if dark_pixels < 0.015:
        suggestions.append("Text looks small or faint. Crop closer to the writing.")
    return {
        "width": width,
        "height": height,
        "brightness": round(brightness, 2),
        "contrast": round(contrast, 2),
        "blur": round(blur, 2),
        "score": max(0, min(100, round((min(blur, 250) / 250) * 35 + (min(contrast, 80) / 80) * 35 + (min(max(width, height), 2200) / 2200) * 30))),
        "suggestions": suggestions or ["Scan quality looks usable."],
    }


def compress_for_ocr_space(content: bytes) -> bytes:
    from PIL import Image

    image = Image.open(io.BytesIO(content)).convert("RGB")
    max_side = 1400
    if max(image.size) > max_side:
        ratio = max_side / max(image.size)
        image = image.resize((int(image.width * ratio), int(image.height * ratio)))

    output = io.BytesIO()
    image.save(output, format="JPEG", quality=78, optimize=True)
    return output.getvalue()


def extract_with_ocr_space(filename: str, content: bytes) -> str:
    api_key = os.getenv("OCR_SPACE_API_KEY", "").strip()
    if not api_key:
        return ""
    lower_name = filename.lower()
    upload_name = filename if lower_name.endswith(".pdf") else "enhanced.jpg"
    upload_content = content if lower_name.endswith(".pdf") else compress_for_ocr_space(content)
    mime_type = "application/pdf" if lower_name.endswith(".pdf") else "image/jpeg"
    boundary = "----PenBotBoundary"
    fields = {
        "apikey": api_key,
        "language": "eng",
        "OCREngine": "2",
        "isOverlayRequired": "false",
        "scale": "true",
        "detectOrientation": "true",
    }
    body = bytearray()
    for key, value in fields.items():
        body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{value}\r\n".encode())
    body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{urllib.parse.quote(upload_name)}\"\r\nContent-Type: {mime_type}\r\n\r\n".encode())
    body.extend(upload_content)
    body.extend(f"\r\n--{boundary}--\r\n".encode())

    try:
        request = urllib.request.Request(
            "https://api.ocr.space/parse/image",
            data=bytes(body),
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=120) as response:
            import json

            result = json.loads(response.read().decode("utf-8"))
        if result.get("IsErroredOnProcessing"):
            return ""
        parsed = result.get("ParsedResults") or []
        return "\n".join(item.get("ParsedText", "").strip() for item in parsed if item.get("ParsedText")).strip()
    except Exception as exc:
        print("OCR.space failed:", repr(exc))
        return ""


def max_pdf_pages(requested: int | None = None) -> int:
    if requested:
        return max(1, min(100, int(requested)))
    try:
        return max(1, int(os.getenv("MAX_PDF_PAGES", "25")))
    except ValueError:
        return 25


def extract_pdf_page_texts(document: fitz.Document, requested_max_pages: int | None = None, use_trocr: bool = True) -> tuple[list[str], bool]:
    pages: list[str] = []
    limit = max_pdf_pages(requested_max_pages)
    truncated = document.page_count > limit
    for page in list(document)[:limit]:
        text = page.get_text("text").strip()
        if not text:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
            image_bytes = pixmap.tobytes("png")
            text, _variant = ocr_image_variants(image_bytes, use_trocr=use_trocr)
        pages.append(text.strip())
    return pages, truncated


def build_page_blocks(text: str, page_number: int) -> list[dict[str, Any]]:
    text = str(text or "").strip()
    if not text:
        return [{"type": "paragraph", "content": "No readable text was found.", "confidence": 0.1, "page": page_number}]

    cleaned = []
    for block in build_blocks(text):
        content = str(block.get("content", "")).strip()
        if not content:
            continue
        block_type = block.get("type", "paragraph")
        cleaned.append(
            {
                "type": block_type,
                "content": to_latex(content) if block_type == "formula" else content,
                "confidence": float(block.get("confidence", 0.85) or 0.85),
                "page": page_number,
            }
        )
    return cleaned or [{"type": "paragraph", "content": text, "confidence": 0.5, "page": page_number}]


def extract_local_document(filename: str, content: bytes, requested_max_pages: int | None = None, use_trocr: bool = True) -> dict[str, Any]:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        try:
            with fitz.open(stream=content, filetype="pdf") as document:
                page_texts, truncated = extract_pdf_page_texts(document, requested_max_pages, use_trocr=use_trocr)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read the uploaded PDF") from exc

        readable_pages = [(index + 1, text) for index, text in enumerate(page_texts) if str(text).strip()]
        if not readable_pages:
            fallback_text = "No readable text was found. Please retry with a clearer scan."
            return {"text": fallback_text, "blocks": build_page_blocks(fallback_text, 1)}

        blocks: list[dict[str, Any]] = []
        text_parts: list[str] = []
        for page_number, page_text in readable_pages:
            corrected_page = str(page_text).strip()
            text_parts.append(f"Page {page_number}\n{corrected_page}")
            blocks.extend(build_page_blocks(corrected_page, page_number))
        if truncated:
            warning = f"Only the first {max_pdf_pages(requested_max_pages)} pages were converted to keep local OCR fast and low cost."
            text_parts.append(warning)
            blocks.append({"type": "important", "content": warning, "confidence": 1, "page": readable_pages[-1][0]})
        return {"text": "\n\n".join(text_parts), "blocks": blocks}

    text, _variant = ocr_image_variants(content, use_trocr=use_trocr)
    if not text.strip():
        text = extract_with_ocr_space(filename, content)
    if not text.strip():
        text = "No readable text was found. Please retry with a clearer image."
    return {"text": text, "blocks": build_page_blocks(text, 1)}


def apply_corrections_to_blocks(user_id: str, blocks: list[dict], corrections: dict[str, dict[str, str]]) -> list[dict]:
    corrected_blocks = []
    for block in blocks:
        corrected_block = dict(block)
        corrected_block["content"] = apply_user_corrections(user_id, corrected_block["content"], corrections)
        corrected_blocks.append(corrected_block)
    return corrected_blocks


@router.post("/process")
async def process_ocr(
    noteId: str = Form(...),
    userId: str = Form(...),
    ocrMode: str = Form("balanced"),
    documentTemplate: str = Form("study_notes"),
    maxPdfPages: int = Form(25),
    file: UploadFile = File(...),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = file.filename or "upload"
    trocr_enabled = os.getenv("ENABLE_TROCR", "false").lower() == "true"
    use_trocr = trocr_enabled and ocrMode == "high_accuracy"
    local_note = extract_local_document(filename, content, maxPdfPages, use_trocr=use_trocr)
    corrected_text = apply_user_corrections(userId, local_note["text"], _CORRECTIONS)
    blocks = apply_corrections_to_blocks(userId, local_note["blocks"], _CORRECTIONS)
    return {
        "noteId": noteId,
        "extractedText": corrected_text,
        "structuredBlocks": blocks,
        "tags": detect_tags(corrected_text),
        "engine": "trocr-vit" if use_trocr else f"local-{ocrMode}",
        "trocrAvailable": trocr_installed(),
        "documentTemplate": documentTemplate,
    }


@router.post("/quality-check")
async def quality_check(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    filename = (file.filename or "upload").lower()
    if filename.endswith(".pdf"):
        with fitz.open(stream=content, filetype="pdf") as document:
            if not document.page_count:
                raise HTTPException(status_code=400, detail="PDF has no pages")
            pixmap = document[0].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            content = pixmap.tobytes("png")
    return image_quality_report(content)


@router.post("/learn-correction")
def learn_correction(payload: CorrectionPayload):
    user_map = _CORRECTIONS.setdefault(payload.userId, {})
    user_map[payload.wrong] = payload.corrected
    return {"message": "Correction learned", "total": len(user_map)}
