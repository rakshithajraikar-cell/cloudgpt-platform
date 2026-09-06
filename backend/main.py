import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api import auth, chats, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    print(f"[{settings.PROJECT_NAME}] Initializing database tables...")
    try:
        await init_db()
        print(f"[{settings.PROJECT_NAME}] Database ready. Backend listening for requests.")
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] Error initializing database: {e}")
        traceback.print_exc()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Global error handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    err = traceback.format_exc()
    print(f"Unhandled exception on {request.url.path}: {err}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": err}
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
        "version": "3.0.1",
        "docs_url": "/docs"
    }

@app.get("/api/db-test")
async def db_test():
    import traceback
    from sqlalchemy import text
    try:
        from app.db.database import engine, init_db
        await init_db()
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            val = res.scalar()
        return {"status": "ok", "db_connected": True, "result": val}
    except Exception as e:
        return {"status": "error", "error": str(e), "traceback": traceback.format_exc()}


@app.get("/health")
async def health():
    return {"status": "healthy"}
