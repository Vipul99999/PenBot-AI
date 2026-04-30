from fastapi import APIRouter
from app.schemas.payloads import TextPayload

router = APIRouter()

@router.post('/summary')
def summary(payload: TextPayload):
    text = payload.text.strip()
    sentences = [p.strip() for p in text.replace("\n", ". ").split('.') if p.strip()]
    short = " ".join(sentences[:2])[:280] + ("..." if len(text) > 280 else "")
    points = sentences[:5]
    return {
        "summary": short or "No content available.",
        "keyPoints": points or ["No key points extracted"]
    }

@router.post('/flashcards')
def flashcards(payload: TextPayload):
    words = []
    seen = set()
    for raw_word in payload.text.replace(".", " ").replace(",", " ").split():
        word = raw_word.strip(":-;()[]{}").lower()
        if len(word) > 4 and word not in seen:
            seen.add(word)
            words.append(word)
        if len(words) == 5:
            break
    cards = [{"q": f"What is {w}?", "a": f"{w} is an important concept from your note."} for w in words]
    return {"flashcards": cards or [{"q": "What is this note about?", "a": "General study notes."}]}
