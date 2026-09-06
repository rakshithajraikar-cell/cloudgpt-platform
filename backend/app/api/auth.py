import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.database import get_db
from app.db.models import User
from app.core.security import get_password_hash, verify_password, create_access_token
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, GoogleAuthRequest
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )
        
    hashed_pwd = get_password_hash(data.password)
    user_name = data.name or data.email.split("@")[0].capitalize()
    
    new_user = User(
        email=data.email.lower(),
        name=user_name,
        hashed_password=hashed_pwd,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={data.email}"
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalars().first()
    
    if not user or not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
        
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.post("/google", response_model=TokenResponse)
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    # Verify Google token using Google API or decode payload
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={data.credential}")
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google token")
            google_data = resp.json()
            
        email = google_data.get("email", "").lower()
        name = google_data.get("name", email.split("@")[0])
        avatar = google_data.get("picture")
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user:
            user = User(
                email=email,
                name=name,
                avatar_url=avatar or f"https://api.dicebear.com/7.x/bottts/svg?seed={email}",
                hashed_password=None
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserOut.model_validate(user)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}
