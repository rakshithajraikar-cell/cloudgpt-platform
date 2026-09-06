import json
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.db.database import get_db, AsyncSessionLocal
from app.db.models import User, Conversation, Message
from app.api.deps import get_current_user
from app.schemas.chat import (
    ConversationOut,
    ConversationDetail,
    ConversationCreate,
    ConversationUpdate,
    SendMessageRequest,
    MessageOut
)
from app.services.llm_service import stream_hosted_llm, PROVIDERS_CONFIG
from app.services.rag_service import retrieve_user_context

router = APIRouter(prefix="/chats", tags=["Conversations"])

@router.get("/", response_model=List[ConversationOut])
async def list_chats(
    q: Optional[str] = Query(None, description="Search filter query"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    result = await db.execute(stmt)
    convs = result.scalars().all()

    items = []
    for c in convs:
        if q and q.strip():
            # Filter by title or message contents
            matches_title = q.strip().lower() in c.title.lower()
            matches_msg = any(q.strip().lower() in m.content.lower() for m in c.messages)
            if not (matches_title or matches_msg):
                continue

        last_preview = c.messages[-1].content[:60] if c.messages else None
        items.append(
            ConversationOut(
                id=c.id,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
                last_message_preview=last_preview,
                message_count=len(c.messages)
            )
        )
    return items


@router.post("/", response_model=ConversationOut)
async def create_chat(
    data: Optional[ConversationCreate] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    title = (data.title if data and data.title else "New Chat")
    conv = Conversation(user_id=current_user.id, title=title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationOut(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0
    )


@router.get("/{chat_id}", response_model=ConversationDetail)
async def get_chat(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Conversation)
        .where(Conversation.id == chat_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(stmt)
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    parsed_messages = []
    for m in conv.messages:
        citations = []
        if m.citations_json:
            try:
                citations = json.loads(m.citations_json)
            except Exception:
                citations = []
        parsed_messages.append(
            MessageOut(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                tokens=m.tokens,
                citations=citations,
                created_at=m.created_at
            )
        )

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=parsed_messages
    )


@router.put("/{chat_id}", response_model=ConversationOut)
async def rename_chat(
    chat_id: str,
    data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Conversation).where(Conversation.id == chat_id, Conversation.user_id == current_user.id)
    result = await db.execute(stmt)
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = data.title.strip()
    await db.commit()
    await db.refresh(conv)
    return ConversationOut(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at
    )


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Conversation).where(Conversation.id == chat_id, Conversation.user_id == current_user.id)
    result = await db.execute(stmt)
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"message": "Conversation deleted"}


@router.post("/{chat_id}/message")
async def send_message(
    chat_id: str,
    req: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Conversation)
        .where(Conversation.id == chat_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    result = await db.execute(stmt)
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # 1. Save User Message
    user_msg = Message(
        conversation_id=chat_id,
        role="user",
        content=req.content,
        tokens=len(req.content.split())
    )
    db.add(user_msg)

    # Auto-generate title if first user turn
    if len(conv.messages) == 0 or conv.title == "New Chat":
        words = req.content.strip().split()
        conv.title = " ".join(words[:5]) + ("..." if len(words) > 5 else "")

    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()

    # 2. Build Multi-Turn History
    llm_messages = []
    if req.system_prompt:
        llm_messages.append({"role": "system", "content": req.system_prompt})

    # Query all valid historical messages in chronological order (excluding the newly added user_msg)
    hist_stmt = (
        select(Message)
        .where(Message.conversation_id == chat_id, Message.id != user_msg.id)
        .order_by(Message.created_at.asc())
    )
    hist_res = await db.execute(hist_stmt)
    historical_msgs = hist_res.scalars().all()

    for m in historical_msgs:
        if m.content and m.content.strip():
            llm_messages.append({"role": m.role, "content": m.content.strip()})

    # 3. Check for Document RAG Context
    user_prompt = req.content.strip()
    citations = []
    if req.use_rag:
        rag_context, citations = retrieve_user_context(current_user.id, user_prompt, top_k=3)
        if rag_context:
            user_prompt = (
                f"You have access to the following relevant document excerpts from the user's uploaded files:\n\n"
                f"{rag_context}\n\n"
                f"Answer the user's query accurately using these excerpts. "
                f"If the information is not in the excerpts, state that clearly.\n\n"
                f"User Question: {req.content}"
            )

    llm_messages.append({"role": "user", "content": user_prompt})

    # 4. Stream response generator and save assistant message in DB on completion
    async def event_generator():
        accumulated_tokens = []
        
        # Send initial metadata event with citations
        if citations:
            yield f"data: {json.dumps({'citations': citations})}\n\n"

        async for chunk_str in stream_hosted_llm(
            messages=llm_messages,
            provider=req.provider,
            model=req.model,
            api_key=req.api_key,
            temperature=req.temperature or 0.7,
            top_p=req.top_p or 0.9,
            max_tokens=req.max_tokens or 1024
        ):
            if chunk_str.startswith("data: "):
                raw_json = chunk_str[6:].strip()
                if raw_json != "[DONE]":
                    try:
                        parsed = json.loads(raw_json)
                        if "token" in parsed:
                            accumulated_tokens.append(parsed["token"])
                    except Exception:
                        pass
            yield chunk_str

        # Save assistant message to DB after stream completes
        full_assistant_reply = "".join(accumulated_tokens).strip()
        if full_assistant_reply:
            async with AsyncSessionLocal() as save_session:
                asst_msg = Message(
                    conversation_id=chat_id,
                    role="assistant",
                    content=full_assistant_reply,
                    tokens=len(full_assistant_reply.split()),
                    citations_json=json.dumps(citations) if citations else None
                )
                save_session.add(asst_msg)
                # update conversation updated_at
                c_stmt = select(Conversation).where(Conversation.id == chat_id)
                c_res = await save_session.execute(c_stmt)
                c_obj = c_res.scalars().first()
                if c_obj:
                    c_obj.updated_at = datetime.now(timezone.utc)
                await save_session.commit()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/models/available")
async def list_available_models():
    """
    Returns available hosted models across Groq, OpenRouter, and OpenAI
    """
    all_models = []
    for prov_name, prov_data in PROVIDERS_CONFIG.items():
        all_models.extend(prov_data["models"])
    return {"models": all_models, "default_provider": "groq", "default_model": "llama-3.3-70b-versatile"}
