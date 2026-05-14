import argparse
import json
import mimetypes
import time
import urllib.error
import urllib.request
from pathlib import Path


SUPPORTED = {".jpg", ".jpeg", ".png", ".pdf"}


def multipart_body(path: Path, fields: dict[str, str], boundary: str) -> bytes:
    lines: list[bytes] = []
    for name, value in fields.items():
        lines.extend(
            [
                f"--{boundary}".encode(),
                f'Content-Disposition: form-data; name="{name}"'.encode(),
                b"",
                value.encode(),
            ]
        )

    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    lines.extend(
        [
            f"--{boundary}".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{path.name}"'.encode(),
            f"Content-Type: {mime}".encode(),
            b"",
            path.read_bytes(),
            f"--{boundary}--".encode(),
            b"",
        ]
    )
    return b"\r\n".join(lines)


def score_result(payload: dict) -> dict:
    blocks = payload.get("blocks") or []
    text = payload.get("text") or ""
    confidences = [float(block.get("confidence", 0)) for block in blocks if isinstance(block, dict)]
    avg = sum(confidences) / len(confidences) if confidences else 0
    weak = sum(1 for confidence in confidences if confidence < 0.8)
    label = "good_scan"
    if avg < 0.55 or not text.strip():
        label = "low_confidence"
    elif avg < 0.8 or weak:
        label = "needs_review"
    return {
        "label": label,
        "confidence": round(avg, 3),
        "weakBlocks": weak,
        "blockCount": len(blocks),
        "pageCount": len({block.get("page", 1) for block in blocks if isinstance(block, dict)}) or 1,
        "textChars": len(text.strip()),
        "engine": payload.get("engine"),
        "warnings": payload.get("warnings", []),
    }


def process_file(path: Path, endpoint: str, ocr_mode: str, template: str, max_pages: int) -> dict:
    boundary = f"----PenBotBenchmark{time.time_ns()}"
    body = multipart_body(
        path,
        {
            "ocrMode": ocr_mode,
            "documentTemplate": template,
            "maxPdfPages": str(max_pages),
        },
        boundary,
    )
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    started = time.time()
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            payload = json.loads(response.read().decode("utf-8"))
        result = score_result(payload)
        result.update({"file": str(path), "ok": True, "durationMs": round((time.time() - started) * 1000)})
        return result
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as exc:
        return {"file": str(path), "ok": False, "error": str(exc), "durationMs": round((time.time() - started) * 1000)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark PenBot OCR against a folder of real handwritten samples.")
    parser.add_argument("samples", help="Folder containing JPG, PNG, or PDF notes.")
    parser.add_argument("--endpoint", default="http://127.0.0.1:8000/ocr/process")
    parser.add_argument("--ocr-mode", default="balanced", choices=["fast", "balanced", "high_accuracy"])
    parser.add_argument("--template", default="study_notes", choices=["study_notes", "lab_report", "exam_revision", "formula_sheet", "qa_worksheet"])
    parser.add_argument("--max-pages", type=int, default=25)
    parser.add_argument("--out", default="ocr-benchmark-report.json")
    args = parser.parse_args()

    root = Path(args.samples)
    files = sorted(path for path in root.rglob("*") if path.suffix.lower() in SUPPORTED)
    if not files:
        raise SystemExit(f"No supported samples found in {root}")

    results = [process_file(path, args.endpoint, args.ocr_mode, args.template, args.max_pages) for path in files]
    summary = {
        "sampleCount": len(results),
        "okCount": sum(1 for result in results if result["ok"]),
        "goodScans": sum(1 for result in results if result.get("label") == "good_scan"),
        "needsReview": sum(1 for result in results if result.get("label") == "needs_review"),
        "lowConfidence": sum(1 for result in results if result.get("label") == "low_confidence"),
        "averageConfidence": round(
            sum(result.get("confidence", 0) for result in results if result["ok"]) / max(1, sum(1 for result in results if result["ok"])),
            3,
        ),
    }
    report = {"summary": summary, "results": results}
    Path(args.out).write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
