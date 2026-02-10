"""Add trigger_type to periodic_analyses

Revision ID: add_trigger_type_periodic
Revises: add_is_test_data
Create Date: 2026-02-10 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_trigger_type_periodic'
down_revision = 'add_is_test_data'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add trigger_type column with default 'scheduled' for existing rows
    op.add_column(
        'periodic_analyses',
        sa.Column('trigger_type', sa.String(20), nullable=False, server_default='scheduled')
    )


def downgrade() -> None:
    op.drop_column('periodic_analyses', 'trigger_type')
