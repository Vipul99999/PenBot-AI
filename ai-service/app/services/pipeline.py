import re
from typing import Any

SUBJECT_MAP = {
    "dsa": ["algorithm", "complexity", "tree", "graph"],
    "os": ["process", "thread", "deadlock", "kernel"],
    "dbms": ["sql", "normalization", "transaction"],
    "cn": ["tcp", "udp", "network", "routing"],
    "ai": ["model", "neural", "transformer", "learning"],
}

HEADING_HINTS = (
    "definition",
    "features",
    "advantages",
    "disadvantages",
    "types",
    "steps",
    "example",
    "examples",
    "properties",
    "uses",
    "notes",
    "summary",
)


DEFINITION_HINTS = (" is ", " are ", " refers to ", " means ", " is defined as ", " can be defined as ")
QUESTION_PREFIXES = ("what", "why", "how", "when", "where", "which", "define", "explain", "describe")


def detect_tags(text: str) -> list[str]:
    lower = text.lower()
    tags = []
    for tag, hints in SUBJECT_MAP.items():
        if any(h in lower for h in hints):
            tags.append(tag.upper())
    return tags or ["AI"]


def clean_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"\s+", " ", line)
    line = line.replace("•", "-")
    line = line.replace("–", "-")
    return line


def is_formula(line: str) -> bool:
    return bool(re.search(r"=|\+|\^|²|√|∑|∫|<=|>=", line))


def is_code(line: str) -> bool:
    return bool(re.search(r"[{};]|^\s*(for|while|if|class|def|function|const|let|var)\b", line, re.I))


def is_question(line: str) -> bool:
    lower = line.lower().strip()
    return line.endswith("?") or any(lower.startswith(prefix + " ") for prefix in QUESTION_PREFIXES)


def is_definition(line: str) -> bool:
    lower = f" {line.lower()} "
    if ":" in line and len(line.split(":", 1)[0].split()) <= 5 and len(line.split()) >= 4:
        return True
    return len(line.split()) >= 4 and any(hint in lower for hint in DEFINITION_HINTS)


def is_heading(line: str, idx: int) -> bool:
    words = line.split()
    lower = line.lower().rstrip(":")
    if idx == 0:
        return False
    if line.endswith(":") and len(words) <= 8:
        return True
    if len(words) <= 5 and lower in HEADING_HINTS:
        return True
    title_like_words = [word for word in words if word[:1].isalpha()]
    if len(words) <= 6 and title_like_words and all(word[:1].isupper() for word in title_like_words) and not is_formula(line):
        return True
    return False


def build_blocks(text: str) -> list[dict[str, Any]]:
    lines = [clean_line(line) for line in text.splitlines() if clean_line(line)]
    blocks: list[dict[str, Any]] = []

    for idx, line in enumerate(lines):
        content = line
        if idx == 0:
            block_type = "title"
        elif re.match(r"^([-*•]|\d+[.)])\s+", line):
            block_type = "bullet"
            content = re.sub(r"^([-*•]|\d+[.)])\s+", "", line)
        elif re.match(r"^(q|question)\s*[:.)-]\s*", line, re.I) or is_question(line):
            block_type = "question"
            content = re.sub(r"^(q|question)\s*[:.)-]\s*", "", line, flags=re.I)
        elif re.match(r"^(a|ans|answer)\s*[:.)-]\s*", line, re.I):
            block_type = "answer"
            content = re.sub(r"^(a|ans|answer)\s*[:.)-]\s*", "", line, flags=re.I)
        elif is_formula(line):
            block_type = "formula"
        elif is_code(line):
            block_type = "code"
        elif is_heading(line, idx):
            block_type = "heading"
            content = line.rstrip(":")
        elif is_definition(line):
            block_type = "definition"
        elif len(line.split()) <= 3:
            block_type = "subheading"
        else:
            block_type = "paragraph"

        confidence = 0.72 if len(line) < 10 else 0.93
        blocks.append({"type": block_type, "content": content, "confidence": confidence})

    blocks = split_long_paragraphs(blocks)
    return blocks


def split_long_paragraphs(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    refined: list[dict[str, Any]] = []
    for block in blocks:
        if block["type"] != "paragraph" or len(block["content"].split()) < 36:
            refined.append(block)
            continue

        sentences = re.split(r"(?<=[.!?])\s+", block["content"])
        chunk: list[str] = []
        for sentence in sentences:
            chunk.append(sentence)
            if sum(len(part.split()) for part in chunk) >= 22:
                refined.append({**block, "content": " ".join(chunk).strip()})
                chunk = []
        if chunk:
            refined.append({**block, "content": " ".join(chunk).strip()})
    return refined


def to_latex(expr: str) -> str:
    return expr.replace("Ã‚Â²", "^2").replace("Â²", "^2").replace("²", "^2")


def apply_user_corrections(user_id: str, text: str, corrections: dict[str, dict[str, str]]) -> str:
    user_map = corrections.get(user_id, {})
    for wrong, corrected in user_map.items():
        text = text.replace(wrong, corrected)
    return text
