import sys
import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app import models, database  # noqa

config = context.config

# Alembic can run without a config file; configure logging only if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = models.Base.metadata


def get_url():
    """Retrieve database URL from environment or default to local SQLite."""
    return os.getenv("DATABASE_URL", "sqlite:///./app.db")

def run_migrations_offline():
    url = get_url()
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(get_url(), poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
