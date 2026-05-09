import re
from typing import Any

SUBJECT_MAP = {
    "dsa": ["algorithm", "complexity", "tree", "graph", "stack", "queue"],
    "os": ["process", "thread", "deadlock", "kernel", "memory"],
    "dbms": ["sql", "normalization", "transaction", "database", "schema"],
    "cn": ["tcp", "udp", "network", "routing", "packet"],
    "ai": ["model", "neural", "transformer", "learning", "classification"],
    "math": ["theorem", "formula", "equation", "matrix", "probability"],
    "science": ["experiment", "observation", "result", "law", "principle"],
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
    "procedure",
    "solution",
    "observations",
    "result",
)

DEFINITION_HINTS = (" is ", " are ", " refers to ", " means ", " is defined as ", " can be defined as ")
QUESTION_PREFIXES = ("what", "why", "how", "when", "where", "which", "define", "explain", "describe")
THEOREM_PREFIXES = ("theorem", "law", "lemma", "rule", "principle", "postulate")
IMPORTANT_PREFIXES = ("important", "note", "remember", "warning", "caution", "key point")
EXAMPLE_PREFIXES = ("example", "eg", "e.g.", "for example")
OBJECTIVE_PREFIXES = ("objective", "aim", "goal", "purpose")
MATERIALS_PREFIXES = ("materials", "apparatus", "requirements", "tools required", "equipment")
OBSERVATION_PREFIXES = ("observation", "observations", "finding", "findings")
RESULT_PREFIXES = ("result", "results", "output")
CONCLUSION_PREFIXES = ("conclusion", "inference")
EXAM_TIP_PREFIXES = ("exam tip", "exam point", "viva", "imp question", "important question")


def detect_tags(text: str) -> list[str]:
    lower = text.lower()
    tags = []
    for tag, hints in SUBJECT_MAP.items():
        if any(h in lower for h in hints):
            tags.append(tag.upper())
    return tags or ["NOTES"]


def clean_line(line: str) -> str:
    line = line.strip()
    line = re.sub(r"\s+", " ", line)
    replacements = {
        "â€¢": "-",
        "â€“": "-",
        "â€”": "-",
        "•": "-",
        "–": "-",
        "—": "-",
        "Â²": "^2",
        "²": "^2",
    }
    for wrong, corrected in replacements.items():
        line = line.replace(wrong, corrected)
    return line


def is_formula(line: str) -> bool:
    return bool(re.search(r"=|\+|\^|√|∑|∫|<=|>=|->|≈|≠", line))


def is_code(line: str) -> bool:
    return bool(re.search(r"[{};]|^\s*(for|while|if|class|def|function|const|let|var)\b", line, re.I))


def is_table_line(line: str) -> bool:
    if "|" in line and line.count("|") >= 2:
        return True
    if "\t" in line:
        return True
    parts = re.split(r"\s{2,}", line)
    return len(parts) >= 3 and all(part.strip() for part in parts)


def is_table_candidate(line: str) -> bool:
    if is_table_line(line):
        return True
    if re.match(r"^(step\s*\d+|\d+[.)]|[-*])\s*[:.)-]?\s+", line, re.I):
        return False
    words = line.split()
    if not 3 <= len(words) <= 8:
        return False
    if line.endswith((".", "?", ":")) or is_formula(line) or is_question(line):
        return False
    has_number = any(re.search(r"\d", word) for word in words)
    compact_cells = all(len(word) <= 18 for word in words)
    return compact_cells and (has_number or all(word[:1].isupper() for word in words if word[:1].isalpha()))


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


def strip_prefix(line: str, prefixes: tuple[str, ...]) -> str:
    pattern = r"^(" + "|".join(re.escape(prefix) for prefix in prefixes) + r")\s*[:.)-]?\s*"
    return re.sub(pattern, "", line, flags=re.I).strip() or line


def build_blocks(text: str) -> list[dict[str, Any]]:
    lines = [clean_line(line) for line in text.splitlines() if clean_line(line)]
    blocks: list[dict[str, Any]] = []
    idx = 0

    while idx < len(lines):
        line = lines[idx]
        content = line
        lower = line.lower().strip()

        if idx > 0 and is_table_candidate(line) and idx + 1 < len(lines) and is_table_candidate(lines[idx + 1]):
            table_lines = [line]
            idx += 1
            while idx < len(lines) and is_table_candidate(lines[idx]):
                table_lines.append(lines[idx])
                idx += 1
            blocks.append({"type": "table", "content": "\n".join(table_lines), "confidence": 0.82})
            continue

        if idx == 0:
            block_type = "title"
        elif re.match(r"^step\s*\d+\s*[:.)-]\s+", line, re.I):
            block_type = "step"
            content = re.sub(r"^step\s*\d+\s*[:.)-]\s+", "", line, flags=re.I)
        elif re.match(r"^\d+[.)]\s+", line):
            block_type = "numbered"
            content = re.sub(r"^\d+[.)]\s+", "", line)
        elif re.match(r"^[-*]\s+", line):
            block_type = "bullet"
            content = re.sub(r"^[-*]\s+", "", line)
        elif re.match(r"^(q|question)\s*[:.)-]\s*", line, re.I) or is_question(line):
            block_type = "question"
            content = re.sub(r"^(q|question)\s*[:.)-]\s*", "", line, flags=re.I)
        elif re.match(r"^(a|ans|answer)\s*[:.)-]\s*", line, re.I):
            block_type = "answer"
            content = re.sub(r"^(a|ans|answer)\s*[:.)-]\s*", "", line, flags=re.I)
        elif any(lower.startswith(prefix) for prefix in THEOREM_PREFIXES):
            block_type = "theorem"
            content = strip_prefix(line, THEOREM_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in IMPORTANT_PREFIXES):
            block_type = "important"
            content = strip_prefix(line, IMPORTANT_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in EXAMPLE_PREFIXES):
            block_type = "example"
            content = strip_prefix(line, EXAMPLE_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in OBJECTIVE_PREFIXES):
            block_type = "objective"
            content = strip_prefix(line, OBJECTIVE_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in MATERIALS_PREFIXES):
            block_type = "materials"
            content = strip_prefix(line, MATERIALS_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in OBSERVATION_PREFIXES):
            block_type = "observation"
            content = strip_prefix(line, OBSERVATION_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in RESULT_PREFIXES):
            block_type = "result"
            content = strip_prefix(line, RESULT_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in CONCLUSION_PREFIXES):
            block_type = "conclusion"
            content = strip_prefix(line, CONCLUSION_PREFIXES)
        elif any(lower.startswith(prefix) for prefix in EXAM_TIP_PREFIXES):
            block_type = "exam_tip"
            content = strip_prefix(line, EXAM_TIP_PREFIXES)
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
        idx += 1

    return split_long_paragraphs(blocks)


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
    return expr.replace("Ãƒâ€šÃ‚Â²", "^2").replace("Ã‚Â²", "^2").replace("Â²", "^2").replace("²", "^2")


def apply_user_corrections(user_id: str, text: str, corrections: dict[str, dict[str, str]]) -> str:
    user_map = corrections.get(user_id, {})
    for wrong, corrected in user_map.items():
        text = text.replace(wrong, corrected)
    return text
