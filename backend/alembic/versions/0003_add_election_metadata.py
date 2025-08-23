from alembic import op
import sqlalchemy as sa

revision = '0003_add_election_metadata'
down_revision = '0002_add_min_quorum'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('elections', sa.Column('description', sa.String(), nullable=True))
    op.add_column(
        'elections',
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column('elections', sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True))
    op.alter_column('elections', 'created_at', server_default=None)


def downgrade():
    op.drop_column('elections', 'closed_at')
    op.drop_column('elections', 'created_at')
    op.drop_column('elections', 'description')
