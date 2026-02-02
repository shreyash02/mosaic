"""Add is_test_data flag to responses table.

Revision ID: add_is_test_data
Revises: add_response_draft_status
Create Date: 2026-02-02 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_is_test_data'
down_revision: Union[str, None] = 'add_response_draft_status'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('responses', sa.Column('is_test_data', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index('idx_responses_is_test_data', 'responses', ['is_test_data'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_responses_is_test_data', table_name='responses')
    op.drop_column('responses', 'is_test_data')
