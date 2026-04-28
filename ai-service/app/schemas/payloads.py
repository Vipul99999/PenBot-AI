from pydantic import BaseModel

class OCRPayload(BaseModel):
    filePath: str
    noteId: str
    userId: str

class TextPayload(BaseModel):
    text: str
