import os
from alembic import command
from alembic.config import Config

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

def run_migrations():
    cfg = Config()
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option(
        "sqlalchemy.url",
        os.getenv(
            "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bvg"
        ),
    )
    command.upgrade(cfg, "head")

if __name__ == "__main__":
    run_migrations()
