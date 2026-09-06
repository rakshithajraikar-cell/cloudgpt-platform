import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import User, Document
from app.api.deps import get_current_user
from app.services.rag_service import index_user_document, USER_DOCUMENT_STORES

router = APIRouter(prefix="/documents", tags=["Documents RAG"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    allowed_exts = [".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".json"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_exts)}"
        )

    content = await file.read()
    if len(content) > 15 * 1024 * 1024:  # 15MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 15MB limit.")

    num_chunks = index_user_document(current_user.id, content, file.filename)

    # Save to database
    doc = Document(
        user_id=current_user.id,
        filename=file.filename,
        file_type=ext.replace(".", ""),
        file_size=len(content),
        num_chunks=num_chunks
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "id": doc.id,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "num_chunks": doc.num_chunks,
        "total_active_chunks": len(USER_DOCUMENT_STORES.get(current_user.id, []))
    }


@router.get("/")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()
    total_chunks = len(USER_DOCUMENT_STORES.get(current_user.id, []))
    return {
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "file_type": d.file_type,
                "file_size": d.file_size,
                "num_chunks": d.num_chunks,
                "created_at": d.created_at
            }
            for d in docs
        ],
        "total_active_chunks": total_chunks
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from in-memory chunks
    if current_user.id in USER_DOCUMENT_STORES:
        USER_DOCUMENT_STORES[current_user.id] = [
            c for c in USER_DOCUMENT_STORES[current_user.id] if c["source"] != doc.filename
        ]

    await db.delete(doc)
    await db.commit()
    return {"message": f"Document '{doc.filename}' deleted successfully"}
