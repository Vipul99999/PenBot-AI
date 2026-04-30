import io

import fitz
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from app.services.pipeline import build_blocks, detect_tags, to_latex, apply_user_corrections

router = APIRouter()


class CorrectionPayload(BaseModel):
    userId: str
    wrong: str
    corrected: str


_CORRECTIONS: dict[str, dict[str, str]] = {}


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
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Could not read the uploaded PDF") from exc

    try:
        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(image)
        if text.strip():
            return text.strip()
    except Exception:
        pass

    return (
        "No readable text was found in this upload. "
        "Use a clearer scan, install Tesseract locally, or connect an OCR engine such as TrOCR, Donut, or a hosted vision model."
    )


@router.post("/process")
async def process_ocr(noteId: str = Form(...), userId: str = Form(...), file: UploadFile = File(...)):
    content = await file.read()
    extracted_text = extract_text(file.filename or "upload", content)
    corrected_text = apply_user_corrections(userId, extracted_text, _CORRECTIONS)
    blocks = build_blocks(corrected_text)
    for block in blocks:
        if block["type"] == "formula":
            block["content"] = to_latex(block["content"])

    return {
        "noteId": noteId,
        "extractedText": corrected_text,
        "structuredBlocks": blocks,
        "tags": detect_tags(corrected_text),
    }


@router.post("/learn-correction")
def learn_correction(payload: CorrectionPayload):
    user_map = _CORRECTIONS.setdefault(payload.userId, {})
    user_map[payload.wrong] = payload.corrected
    return {"message": "Correction learned", "total": len(user_map)}
