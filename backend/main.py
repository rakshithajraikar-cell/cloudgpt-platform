from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api import auth, chats, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    print(f"[{settings.PROJECT_NAME}] Initializing database tables...")
    await init_db()
    print(f"[{settings.PROJECT_NAME}] Database ready. Backend listening for requests.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS middleware for Next.js frontend and cloud deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(chats.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": settings.PROJECT_NAME,
        "version": "3.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
