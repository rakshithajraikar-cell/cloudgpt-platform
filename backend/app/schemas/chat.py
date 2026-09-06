from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    tokens: int
    citations: Optional[List[Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationUpdate(BaseModel):
    title: str

class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    last_message_preview: Optional[str] = None
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ConversationDetail(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageOut]

    class Config:
        from_attributes = True

class SendMessageRequest(BaseModel):
    content: str
    provider: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 0.9
    max_tokens: Optional[int] = 1024
    system_prompt: Optional[str] = None
    api_key: Optional[str] = None
    use_rag: Optional[bool] = True
