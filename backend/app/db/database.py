import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

# Adjust database connection string for asyncpg / SQLite
db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
else:
    # Strip parameters that asyncpg doesn't support in query strings (e.g., sslmode, channel_binding)
    if "?" in db_url:
        parsed = urlparse(db_url)
        params = parse_qs(parsed.query)
        params.pop("sslmode", None)
        params.pop("channel_binding", None)
        new_query = urlencode(params, doseq=True)
        db_url = urlunparse(parsed._replace(query=new_query))
    connect_args = {"ssl": "require"}

engine = create_async_engine(
    db_url,
    echo=False,
    connect_args=connect_args,
    pool_pre_ping=True
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
