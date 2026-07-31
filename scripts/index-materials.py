from __future__ import annotations

import json
import re
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "public" / "materials" / "study"
CLIENT_INDEX = ROOT / "app" / "materials-index.json"
SERVER_INDEX = ROOT / "data" / "material-content.json"

SUPPORTED = {".pdf", ".ppt", ".pptx", ".doc", ".docx"}
STOPWORDS = {
    "about", "after", "again", "also", "and", "are", "been", "before",
    "between", "can", "chapter", "class", "course", "data", "does", "each",
    "from", "have", "into", "introduction", "its", "method", "more", "not",
    "operations", "other", "our", "page", "part", "presentation", "question",
    "section", "should", "slide", "some", "that", "the", "their", "then",
    "there", "these", "this", "through", "unit", "using", "was", "were",
    "what", "when", "where", "which", "will", "with", "your",
}


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def xml_text(raw: bytes) -> str:
    try:
        root = ElementTree.fromstring(raw)
    except ElementTree.ParseError:
        return ""
    return " ".join(node.text or "" for node in root.iter() if node.tag.endswith("}t"))


def read_pdf(path: Path) -> str:
    try:
        reader = PdfReader(str(path))
        parts = []
        for page in reader.pages[:80]:
            parts.append(page.extract_text() or "")
            if sum(map(len, parts)) > 70000:
                break
        return " ".join(parts)
    except Exception:
        return ""


def read_openxml(path: Path, prefix: str) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            names = sorted(name for name in archive.namelist() if name.startswith(prefix) and name.endswith(".xml"))
            return " ".join(xml_text(archive.read(name)) for name in names)
    except Exception:
        return ""


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return read_pdf(path)
    if suffix == ".pptx":
        return read_openxml(path, "ppt/slides/slide")
    if suffix == ".docx":
        return read_openxml(path, "word/document")
    return ""


def keywords(text: str, limit: int = 16) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9+\-]{2,}", text.lower())
    counts = Counter(word for word in words if word not in STOPWORDS and not word.isdigit())
    return [word for word, _ in counts.most_common(limit)]


def main() -> None:
    CLIENT_INDEX.parent.mkdir(parents=True, exist_ok=True)
    SERVER_INDEX.parent.mkdir(parents=True, exist_ok=True)
    client_records = []
    server_records = []

    for index, path in enumerate(sorted(MATERIALS.rglob("*"))):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED:
            continue
        relative = path.relative_to(MATERIALS)
        subject = relative.parts[0] if len(relative.parts) > 1 else "General"
        content = normalize(extract_text(path))
        title_text = normalize(path.stem.replace("_", " ").replace("-", " "))
        record_id = f"material-{index + 1}"
        common = {
            "id": record_id,
            "name": path.name,
            "subject": subject,
            "path": "/materials/study/" + "/".join(relative.parts),
            "type": path.suffix.lower().lstrip("."),
            "size": path.stat().st_size,
            "keywords": keywords(f"{title_text} {content}"),
            "indexed": bool(content),
        }
        client_records.append(common)
        server_records.append({
            **common,
            "content": content[:70000],
        })

    CLIENT_INDEX.write_text(json.dumps(client_records, indent=2, ensure_ascii=False), encoding="utf-8")
    SERVER_INDEX.write_text(json.dumps(server_records, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Indexed {len(client_records)} study files; {sum(1 for item in client_records if item['indexed'])} include searchable text.")


if __name__ == "__main__":
    main()
