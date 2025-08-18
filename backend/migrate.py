import os
from alembic import command
from alembic.config import Config

def run_migrations():
    cfg = Config()
    cfg.set_main_option("script_location", "alembic")
    cfg.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL", "sqlite:///./app.db"))
    command.upgrade(cfg, "head")

if __name__ == "__main__":
    run_migrations()
