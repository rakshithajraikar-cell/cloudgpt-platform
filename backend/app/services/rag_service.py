import io
import os
import csv
import json
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from docx import Document as DocxDocument

# In-memory document chunk store per user: {user_id: [chunks...]}
USER_DOCUMENT_STORES: Dict[str, List[Dict[str, Any]]] = {}

def extract_text_from_upload(content_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
    """
    Extracts text passages with metadata from PDF, DOCX, TXT, CSV, or JSON.
    Returns list of {'text': '...', 'page': int, 'source': filename}
    """
    ext = os.path.splitext(filename)[1].lower()
    pages_data = []

    if ext == ".pdf":
        reader = PdfReader(io.BytesIO(content_bytes))
        for page_idx, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if text.strip():
                pages_data.append({"text": text.strip(), "page": page_idx, "source": filename})

    elif ext in [".docx", ".doc"]:
        doc = DocxDocument(io.BytesIO(content_bytes))
        full_text = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_txt = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_txt:
                    full_text.append(row_txt)
        if full_text:
            pages_data.append({"text": "\n\n".join(full_text), "page": 1, "source": filename})

    elif ext == ".csv":
        text_stream = io.StringIO(content_bytes.decode("utf-8", errors="replace"))
        reader = csv.reader(text_stream)
        rows = list(reader)
        if rows:
            header = rows[0]
            for r_idx, row in enumerate(rows[1:], start=2):
                row_str = ", ".join(f"{h}: {val}" for h, val in zip(header, row) if val)
                if row_str:
                    pages_data.append({"text": row_str, "page": r_idx, "source": filename})

    elif ext == ".json":
        data = json.loads(content_bytes.decode("utf-8", errors="replace"))
        formatted = json.dumps(data, indent=2)
        pages_data.append({"text": formatted, "page": 1, "source": filename})

    else:  # .txt, .md, code, etc.
        text = content_bytes.decode("utf-8", errors="replace")
        if text.strip():
            pages_data.append({"text": text.strip(), "page": 1, "source": filename})

    return pages_data


def chunk_document_data(pages_data: List[Dict[str, Any]], chunk_size=500, chunk_overlap=100) -> List[Dict[str, Any]]:
    chunks = []
    chunk_counter = 0

    for page_item in pages_data:
        text = page_item["text"]
        page_num = page_item.get("page", 1)
        source = page_item.get("source", "Document")

        start = 0
        text_len = len(text)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            if end < text_len:
                boundary = text.rfind("\n", start + chunk_size // 2, end)
                if boundary == -1:
                    boundary = text.rfind(". ", start + chunk_size // 2, end)
                if boundary != -1:
                    end = boundary + 1

            snippet = text[start:end].strip()
            if len(snippet) > 25:
                chunks.append({
                    "chunk_id": chunk_counter,
                    "text": snippet,
                    "source": source,
                    "page": page_num,
                    "words": set(snippet.lower().split())
                })
                chunk_counter += 1
            start += max(chunk_size - chunk_overlap, 100)

    return chunks


def index_user_document(user_id: str, content_bytes: bytes, filename: str) -> int:
    """
    Parses and chunks document, appending to user's active knowledge base.
    """
    pages_data = extract_text_from_upload(content_bytes, filename)
    chunks = chunk_document_data(pages_data)

    if user_id not in USER_DOCUMENT_STORES:
        USER_DOCUMENT_STORES[user_id] = []

    # Remove existing chunks for this file if re-uploaded
    USER_DOCUMENT_STORES[user_id] = [
        c for c in USER_DOCUMENT_STORES[user_id] if c["source"] != filename
    ]
    USER_DOCUMENT_STORES[user_id].extend(chunks)
    return len(chunks)


def retrieve_user_context(user_id: str, query: str, top_k: int = 3) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Keyword and token-overlap semantic retrieval from user's indexed documents.
    Returns (augmented_context_string, citations_list)
    """
    chunks = USER_DOCUMENT_STORES.get(user_id, [])
    if not chunks:
        return "", []

    query_words = set(query.lower().split())
    if not query_words:
        return "", []

    scored_chunks = []
    for chunk in chunks:
        overlap = len(query_words.intersection(chunk["words"]))
        if overlap > 0:
            score = overlap / (len(query_words) + 1e-5)
            scored_chunks.append((score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    top_matches = scored_chunks[:top_k]

    if not top_matches:
        # Fallback to recent top chunks if no exact keywords match
        top_matches = [(0.5, c) for c in chunks[:min(2, len(chunks))]]

    context_snippets = []
    citations = []

    for i, (score, chunk) in enumerate(top_matches, start=1):
        context_snippets.append(
            f"[Source {i}: {chunk['source']} (Page/Section {chunk['page']})]\n{chunk['text']}"
        )
        citations.append({
            "source": chunk["source"],
            "page": chunk["page"],
            "similarity_score": round(float(score), 2),
            "snippet": chunk["text"][:180] + ("..." if len(chunk["text"]) > 180 else "")
        })

    augmented_context = "\n\n---\n\n".join(context_snippets)
    return augmented_context, citations


def clear_user_documents(user_id: str):
    if user_id in USER_DOCUMENT_STORES:
        USER_DOCUMENT_STORES[user_id] = []
