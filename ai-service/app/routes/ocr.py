from fastapi import APIRouter
from pydantic import BaseModel
from app.schemas.payloads import OCRPayload
from app.services.pipeline import build_blocks, detect_tags, to_latex, apply_user_corrections

router = APIRouter()

class CorrectionPayload(BaseModel):
    userId: str
    wrong: str
    corrected: str

_CORRECTIONS: dict[str, dict[str, str]] = {}

@router.post('/process')
def process_ocr(payload: OCRPayload):
    # Placeholder: in production, invoke TrOCR/Donut/LayoutLMv3 pipelines here.
    mocked_text = "Today we study Computer Networks\n- TCP reliable protocol\na² + b² = c²"
    corrected_text = apply_user_corrections(payload.userId, mocked_text, _CORRECTIONS)
    blocks = build_blocks(corrected_text)
    for block in blocks:
        if block["type"] == "formula":
            block["content"] = to_latex(block["content"])

    return {
        "noteId": payload.noteId,
        "extractedText": corrected_text,
        "structuredBlocks": blocks,
        "tags": detect_tags(corrected_text)
    }

@router.post('/learn-correction')
def learn_correction(payload: CorrectionPayload):
    user_map = _CORRECTIONS.setdefault(payload.userId, {})
    user_map[payload.wrong] = payload.corrected
    return {"message": "Correction learned", "total": len(user_map)}
