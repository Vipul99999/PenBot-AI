from fastapi import APIRouter
from app.schemas.payloads import TextPayload

router = APIRouter()

@router.post('/summary')
def summary(payload: TextPayload):
    text = payload.text.strip()
    short = text[:220] + ("..." if len(text) > 220 else "")
    points = [p.strip() for p in text.split('.') if p.strip()][:5]
    return {
        "summary": short or "No content available.",
        "keyPoints": points or ["No key points extracted"]
    }

@router.post('/flashcards')
def flashcards(payload: TextPayload):
    words = [w for w in payload.text.split() if len(w) > 4][:5]
    cards = [{"q": f"What is {w}?", "a": f"{w} is an important concept from your note."} for w in words]
    return {"flashcards": cards or [{"q": "What is this note about?", "a": "General study notes."}]}
