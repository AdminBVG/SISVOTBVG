from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'shareholders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('code', sa.String(), nullable=False, unique=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('document', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('actions', sa.Numeric(), nullable=False, default=0),
        sa.Column('status', sa.String(), nullable=False, default='ACTIVE')
    )
    op.create_table(
        'attendances',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('election_id', sa.Integer(), nullable=False),
        sa.Column('shareholder_id', sa.Integer(), sa.ForeignKey('shareholders.id'), nullable=False),
        sa.Column('mode', sa.Enum('PRESENCIAL', 'VIRTUAL', 'AUSENTE', name='attendancemode'), nullable=False, default='AUSENTE'),
        sa.Column('present', sa.Boolean(), default=False),
        sa.Column('marked_by', sa.String(), nullable=True),
        sa.Column('marked_at', sa.DateTime(), nullable=True),
        sa.Column('evidence_json', postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )
    op.create_table(
        'attendance_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('attendance_id', sa.Integer(), sa.ForeignKey('attendances.id'), nullable=False),
        sa.Column('from_mode', sa.Enum('PRESENCIAL', 'VIRTUAL', 'AUSENTE', name='attendancemode'), nullable=True),
        sa.Column('to_mode', sa.Enum('PRESENCIAL', 'VIRTUAL', 'AUSENTE', name='attendancemode'), nullable=True),
        sa.Column('from_present', sa.Boolean(), nullable=True),
        sa.Column('to_present', sa.Boolean(), nullable=True),
        sa.Column('changed_by', sa.String(), nullable=False),
        sa.Column('changed_at', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.String(), nullable=True)
    )
    op.create_table(
        'persons',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('type', sa.Enum('ACCIONISTA', 'TERCERO', name='persontype'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('document', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True)
    )
    op.create_table(
        'proxies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('election_id', sa.Integer(), nullable=False),
        sa.Column('proxy_person_id', sa.Integer(), sa.ForeignKey('persons.id'), nullable=False),
        sa.Column('tipo_doc', sa.String(), nullable=False),
        sa.Column('num_doc', sa.String(), nullable=False),
        sa.Column('fecha_otorg', sa.Date(), nullable=False),
        sa.Column('fecha_vigencia', sa.Date(), nullable=True),
        sa.Column('pdf_url', sa.String(), nullable=False),
        sa.Column('status', sa.Enum('VALID', 'INVALID', 'EXPIRED', name='proxystatus'), nullable=False, default='VALID')
    )
    op.create_table(
        'proxy_assignments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('proxy_id', sa.Integer(), sa.ForeignKey('proxies.id'), nullable=False),
        sa.Column('shareholder_id', sa.Integer(), sa.ForeignKey('shareholders.id'), nullable=False),
        sa.Column('weight_actions_snapshot', sa.Numeric(), nullable=False),
        sa.Column('valid_from', sa.Date(), nullable=True),
        sa.Column('valid_until', sa.Date(), nullable=True)
    )

def downgrade():
    op.drop_table('proxy_assignments')
    op.drop_table('proxies')
    op.drop_table('persons')
    op.drop_table('attendance_history')
    op.drop_table('attendances')
    op.drop_table('shareholders')
    sa.Enum(name='attendancemode').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='persontype').drop(op.get_bind(), checkfirst=False)
    sa.Enum(name='proxystatus').drop(op.get_bind(), checkfirst=False)
