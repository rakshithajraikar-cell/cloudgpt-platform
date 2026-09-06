from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

TokenResponse.model_rebuild()
