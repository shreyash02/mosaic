"""Add context_notes to conversations and analyses tables.

Revision ID: add_context_notes
Revises: seed_feature_flags
Create Date: 2026-02-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_context_notes'
down_revision: Union[str, None] = 'seed_feature_flags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('conversations', sa.Column('context_notes', sa.Text(), nullable=True))
    op.add_column('conversations', sa.Column('context_notes_updated_at', sa.DateTime(), nullable=True))
    op.add_column('analyses', sa.Column('context_notes_snapshot', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('analyses', 'context_notes_snapshot')
    op.drop_column('conversations', 'context_notes_updated_at')
    op.drop_column('conversations', 'context_notes')
