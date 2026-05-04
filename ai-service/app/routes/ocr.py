import io
from google.cloud import vision
import base64
import json
import os
import urllib.error
import urllib.request
import requests
from functools import lru_cache
from dotenv import load_dotenv
load_dotenv()
import fitz
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from app.services.pipeline import build_blocks, detect_tags, to_latex, apply_user_corrections

router = APIRouter()

print("OCR route loaded")
print("OpenAI API key:", "set" if os.getenv("OPENAI_API_KEY") else "not set")
print("Google creds:", os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
print("Google creds exists:", os.path.exists(os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")))
def enhanced_image_bytes(content: bytes) -> bytes:
    image = prepare_image(content)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()

def extract_with_google_vision(filename: str, content: bytes) -> str | None:
    try:
        lower_name = (filename or "").lower()

        if lower_name.endswith(".pdf"):
            # Google Vision direct local PDF bytes ke liye simple sync OCR nahi karta.
            # PDF ke first few pages ko image bana kar OCR karenge.
            texts = []

            with fitz.open(stream=content, filetype="pdf") as document:
                max_pages = min(document.page_count, 5)

                for page_index in range(max_pages):
                    page = document[page_index]
                    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                    image_bytes = pixmap.tobytes("png")

                    page_text = extract_google_vision_image(image_bytes)
                    if page_text:
                        texts.append(f"Page {page_index + 1}\n{page_text}")

            return "\n\n".join(texts).strip() or None

        # Image OCR
        image_bytes = content
        return extract_google_vision_image(image_bytes)

    except Exception as e:
        print("Google Vision OCR error:", repr(e))
        return None


def extract_google_vision_image(content: bytes) -> str | None:
    try:
        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)

        response = client.document_text_detection(image=image)

        if response.error.message:
            print("Google Vision response error:", response.error.message)
            return None

        text = response.full_text_annotation.text.strip()

        print("Google Vision text found:", bool(text))
        if text:
            print("Google Vision preview:", text[:200])

        return text or None

    except Exception as e:
        print("Google Vision image error:", repr(e))
        return None

def extract_with_ocr_space(filename: str, content: bytes) -> str | None:
    api_key = os.getenv("OCR_SPACE_API_KEY", "helloworld")
    lower_name = (filename or "").lower()

    try:
        # PDF ko direct bhejo, image ko enhance karke bhejo
        if lower_name.endswith(".pdf"):
            upload_name = filename or "upload.pdf"
            upload_content = content
            mime_type = "application/pdf"
        if lower_name.endswith((".jpg", ".jpeg", ".png")):
            upload_name = "enhanced.png"
            upload_content = compress_for_ocr_space(content)
            mime_type = "image/png"
        else:
            upload_name = "compressed.jpg"
            upload_content = compress_for_ocr_space(content)
            mime_type = "image/jpeg"

        if len(upload_content) > 1024 * 1024:
            print("Skipping OCR.space: compressed file still too large")
            return None

        response = requests.post(
            "https://api.ocr.space/parse/image",
            files={
                "file": (
                    upload_name,
                    upload_content,
                    mime_type,
                )
            },
            data={
                "apikey": api_key,
                "language": "eng",
                "OCREngine": "2",
                "isOverlayRequired": "false",
                "scale": "true",
                "detectOrientation": "true",
                "isTable": "true",
            },
            timeout=120,
        )

        result = response.json()

        if result.get("IsErroredOnProcessing"):
            print("OCR.space error:", result.get("ErrorMessage"))
            return None

        parsed = result.get("ParsedResults") or []
        text = "\n".join(
            item.get("ParsedText", "").strip()
            for item in parsed
            if item.get("ParsedText")
        ).strip()

        print("OCR.space text found:", bool(text))
        if text:
            print("OCR.space preview:", text[:200])

        return text or None

    except Exception as e:
        print("OCR.space exception:", repr(e))
        return None
    
class CorrectionPayload(BaseModel):
    userId: str
    wrong: str
    corrected: str


_CORRECTIONS: dict[str, dict[str, str]] = {}

NOTE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "rawText": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "number"},
        "blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": [
                            "title",
                            "heading",
                            "subheading",
                            "paragraph",
                            "bullet",
                            "definition",
                            "question",
                            "answer",
                            "table",
                            "code",
                            "formula",
                        ],
                    },
                    "content": {"type": "string"},
                    "confidence": {"type": "number"},
                    "page": {"type": "number"},
                },
                "required": ["type", "content", "confidence", "page"],
            },
        },
    },
    "required": ["title", "rawText", "tags", "confidence", "blocks"],
}


@lru_cache(maxsize=1)
def get_rapid_ocr():
    from rapidocr_onnxruntime import RapidOCR

    return RapidOCR()


def prepare_image(content: bytes):
    return prepare_image_variants(content)[0][1]


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
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.35 or abs(angle) > 15:
        return gray
    height, width = gray.shape[:2]
    center = (width // 2, height // 2)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
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

    variants = [
        ("enhanced", sharp),
        ("adaptive", pil_from_cv2(adaptive)),
        ("otsu", pil_from_cv2(otsu)),
        ("gray", ImageOps.autocontrast(pil_from_cv2(gray)).filter(ImageFilter.SHARPEN)),
    ]
    return variants


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
        if lines:
            return "\n".join(lines)
    except Exception:
        pass

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

    if not candidates:
        return ""

    return max(candidates, key=text_score).strip()


def ocr_image_variants(content: bytes) -> tuple[str, str]:
    candidates = []
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
        suggestions.append("Text looks very small or faint. Crop closer to the page.")

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

    quality = 80
    while quality >= 35:
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=quality, optimize=True)
        data = output.getvalue()
        if len(data) <= 950 * 1024:
            return data
        quality -= 10

    return data

def ocr_pdf_pages(document: fitz.Document) -> str:
    page_text = []
    for page in document:
        pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
        image_bytes = pixmap.tobytes("png")
        text, _variant = ocr_image_variants(image_bytes)
        if text:
            page_text.append(text)
    return "\n".join(page_text).strip()


def extract_pdf_page_texts(document: fitz.Document) -> list[str]:
    pages: list[str] = []
    for page in document:
        text = page.get_text("text").strip()
        if not text:
            pixmap = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
            image_bytes = pixmap.tobytes("png")
            text, _variant = ocr_image_variants(image_bytes)
        pages.append(text.strip())
    return pages


def image_data_url(mime_type: str, content: bytes) -> str:
    encoded = base64.b64encode(content).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def upload_to_vision_images(filename: str, content: bytes) -> list[dict[str, str]]:
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        max_pages = int(os.getenv("OPENAI_MAX_PDF_PAGES", "3"))
        images = []
        with fitz.open(stream=content, filetype="pdf") as document:
            for page_index, page in enumerate(document):
                if page_index >= max_pages:
                    break
                pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                images.append({"type": "input_image", "image_url": image_data_url("image/png", pixmap.tobytes("png"))})
        return images

    mime_type = "image/png"
    if lower_name.endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    return [{"type": "input_image", "image_url": image_data_url(mime_type, content)}]


def extract_response_text(response_json: dict) -> str:
    if isinstance(response_json.get("output_text"), str):
        return response_json["output_text"]

    fragments = []
    for output in response_json.get("output", []):
        for content in output.get("content", []):
            text = content.get("text") or content.get("output_text")
            if text:
                fragments.append(text)
    return "\n".join(fragments)


def normalize_structured_note(note: dict) -> dict:
    blocks = note.get("blocks") or []
    title = (note.get("title") or "").strip()
    if title and not any(block.get("type") == "title" for block in blocks):
        blocks.insert(0, {"type": "title", "content": title, "confidence": note.get("confidence", 0.9)})

    cleaned_blocks = []
    for block in blocks:
        block_type = block.get("type", "paragraph")
        content = str(block.get("content", "")).strip()
        if not content:
            continue
        cleaned_blocks.append(
            {
                "type": block_type,
                "content": to_latex(content) if block_type == "formula" else content,
                "confidence": float(block.get("confidence", note.get("confidence", 0.9)) or 0.9),
                **({"page": int(block["page"])} if block.get("page") else {}),
            }
        )

    raw_text = note.get("rawText") or "\n".join(block["content"] for block in cleaned_blocks)
    tags = [str(tag).upper() for tag in note.get("tags", []) if str(tag).strip()] or detect_tags(raw_text)
    return {"rawText": raw_text, "blocks": cleaned_blocks, "tags": tags}


def apply_corrections_to_blocks(user_id: str, blocks: list[dict], corrections: dict[str, dict[str, str]]) -> list[dict]:
    corrected_blocks = []
    for block in blocks:
        corrected_block = dict(block)
        corrected_block["content"] = apply_user_corrections(user_id, corrected_block["content"], corrections)
        corrected_blocks.append(corrected_block)
    return corrected_blocks


def extract_with_openai_vision(filename: str, content: bytes) -> dict | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    image_inputs = upload_to_vision_images(filename, content)
    if not image_inputs:
        return None

    prompt = (
        "You are PenBot AI, a handwritten notes recognition and converter. "
        "Read the uploaded page image(s), correct obvious OCR mistakes, preserve formulas, and return organized study notes. "
        "Create semantic blocks: title, heading, subheading, paragraph, bullet, definition, question, answer, formula, code, or table. "
        "Set page to the 1-based source page number for every block. "
        "Prefer useful section headings and bullets when the page is visually organized. "
        "Do not invent content that is not present."
    )
    payload = {
        "model": os.getenv("OPENAI_VISION_MODEL", "gpt-5.4-mini"),
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": prompt}]},
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Convert these handwritten notes into structured JSON study notes."},
                    *image_inputs,
                ],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "penbot_structured_notes",
                "strict": True,
                "schema": NOTE_SCHEMA,
            }
        },
        "max_output_tokens": 4000,
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_json = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("OpenAI HTTP error:", e.code, e.read().decode("utf-8"))
        return None
    except Exception as e:
        print("OpenAI Vision error:", repr(e))
        return None

    text = extract_response_text(response_json)
    if not text:
        return None

    try:
        return normalize_structured_note(json.loads(text))
    except json.JSONDecodeError:
        return None

def extract_text(filename: str, content: bytes) -> str:
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        try:
            with fitz.open(stream=content, filetype="pdf") as document:
                text = "\n".join(page.get_text("text").strip() for page in document)

                if text.strip():
                    return text.strip()

                scanned_text = ocr_pdf_pages(document)
                if scanned_text.strip():
                    return scanned_text.strip()

        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read the uploaded PDF") from exc

    text, _variant = ocr_image_variants(content)

    if text.strip():
        return text.strip()

    return "No readable text was found. Please retry with a clearer image."    


def build_page_blocks(text: str, page_number: int) -> list[dict]:
    text = str(text or "").strip()

    if not text:
        return [{
            "type": "paragraph",
            "content": "No readable text was found.",
            "confidence": 0.1,
            "page": page_number,
        }]

    blocks = build_blocks(text)

    cleaned = []
    for block in blocks:
        content = str(block.get("content", "")).strip()
        if not content:
            continue

        block_type = block.get("type", "paragraph")

        cleaned.append({
            "type": block_type,
            "content": to_latex(content) if block_type == "formula" else content,
            "confidence": float(block.get("confidence", 0.85) or 0.85),
            "page": page_number,
        })

    return cleaned or [{
        "type": "paragraph",
        "content": text,
        "confidence": 0.5,
        "page": page_number,
    }]

def extract_local_document(filename: str, content: bytes) -> dict:
    lower_name = filename.lower()

    if lower_name.endswith(".pdf"):
        try:
            with fitz.open(stream=content, filetype="pdf") as document:
                page_texts = extract_pdf_page_texts(document)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read the uploaded PDF") from exc

        readable_pages = [(index + 1, text) for index, text in enumerate(page_texts) if str(text).strip()]

        if not readable_pages:
            fallback_text = "No readable text was found. Please retry with a clearer scan."
            return {
                "text": fallback_text,
                "blocks": build_page_blocks(fallback_text, 1),
            }

        blocks: list[dict] = []
        text_parts: list[str] = []

        for page_number, page_text in readable_pages:
            corrected_page = str(page_text).strip()
            text_parts.append(f"Page {page_number}\n{corrected_page}")
            blocks.extend(build_page_blocks(corrected_page, page_number))

        raw_text = "\n\n".join(text_parts)

        return {
            "text": raw_text,
            "blocks": blocks,
        }

    text = extract_text(filename, content)

    return {
        "text": text,
        "blocks": build_page_blocks(text, 1),
    }

@router.post("/process")
async def process_ocr(
    noteId: str = Form(...),
    userId: str = Form(...),
    file: UploadFile = File(...)
):
    content = await file.read()
    filename = file.filename or "upload"

    # 1. OpenAI Vision
    vision_note = extract_with_openai_vision(filename, content)

    if vision_note:
        corrected_text = apply_user_corrections(userId, vision_note["rawText"], _CORRECTIONS)
        corrected_blocks = apply_corrections_to_blocks(userId, vision_note["blocks"], _CORRECTIONS)

        return {
            "noteId": noteId,
            "extractedText": corrected_text,
            "structuredBlocks": corrected_blocks,
            "tags": vision_note["tags"],
        }
    # 2. Google Vision fallback
    google_text = extract_with_google_vision(filename, content)

    if google_text:
        corrected_text = apply_user_corrections(userId, google_text, _CORRECTIONS)
        blocks = build_page_blocks(corrected_text, 1)

        return {
            "noteId": noteId,
            "extractedText": corrected_text,
            "structuredBlocks": blocks,
            "tags": detect_tags(corrected_text),
        }
    # 3. OCR.space fallback
    ocr_space_text = extract_with_ocr_space(filename, content)

    if ocr_space_text:
        corrected_text = apply_user_corrections(userId, ocr_space_text, _CORRECTIONS)
        blocks = build_page_blocks(corrected_text, 1)

        return {
            "noteId": noteId,
            "extractedText": corrected_text,
            "structuredBlocks": blocks,
            "tags": detect_tags(corrected_text),
        }

    # 4. Local OCR fallback
    local_note = extract_local_document(filename, content)
    corrected_text = apply_user_corrections(userId, local_note["text"], _CORRECTIONS)
    blocks = apply_corrections_to_blocks(userId, local_note["blocks"], _CORRECTIONS)

    return {
        "noteId": noteId,
        "extractedText": corrected_text,
        "structuredBlocks": blocks,
        "tags": detect_tags(corrected_text),
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
