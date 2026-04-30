import re
from typing import Any

SUBJECT_MAP = {
    "dsa": ["algorithm", "complexity", "tree", "graph"],
    "os": ["process", "thread", "deadlock", "kernel"],
    "dbms": ["sql", "normalization", "transaction"],
    "cn": ["tcp", "udp", "network", "routing"],
    "ai": ["model", "neural", "transformer", "learning"],
}


def detect_tags(text: str) -> list[str]:
    lower = text.lower()
    tags = []
    for tag, hints in SUBJECT_MAP.items():
        if any(h in lower for h in hints):
            tags.append(tag.upper())
    return tags or ["AI"]


def build_blocks(text: str) -> list[dict[str, Any]]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    blocks = []
    for idx, line in enumerate(lines):
        if idx == 0:
            block_type = "title"
        elif line.startswith(("-", "*")):
            block_type = "bullet"
        elif re.search(r"=|\+|\^|²", line):
            block_type = "formula"
        elif "{" in line and "}" in line:
            block_type = "code"
        else:
            block_type = "paragraph"

        confidence = 0.72 if len(line) < 10 else 0.93
        blocks.append({"type": block_type, "content": line, "confidence": confidence})

    return blocks


def to_latex(expr: str) -> str:
    return expr.replace("Â²", "^2").replace("²", "^2")


def apply_user_corrections(user_id: str, text: str, corrections: dict[str, dict[str, str]]) -> str:
    user_map = corrections.get(user_id, {})
    for wrong, corrected in user_map.items():
        text = text.replace(wrong, corrected)
    return text
