from alembic import op
import sqlalchemy as sa

revision = '0002_add_min_quorum'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('elections', sa.Column('min_quorum', sa.Float(), nullable=True))


def downgrade():
    op.drop_column('elections', 'min_quorum')
