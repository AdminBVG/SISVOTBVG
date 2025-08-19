import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

try:  # optional dependency
    from dotenv import load_dotenv
except Exception:  # pragma: no cover - fallback if python-dotenv is missing
    def load_dotenv(path: str = ".env") -> None:
        if os.path.exists(path):
            with open(path) as f:
                for line in f:
                    if line.strip() and not line.startswith("#"):
                        key, _, value = line.strip().partition("=")
                        os.environ.setdefault(key, value)

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bvg"
)

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
