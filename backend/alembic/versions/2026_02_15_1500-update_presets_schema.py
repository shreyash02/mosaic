"""Update presets schema - rename emoji to icon, remove default_questions

Revision ID: update_presets_schema
Revises: add_conversation_presets
Create Date: 2026-02-15 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'update_presets_schema'
down_revision: Union[str, None] = 'add_conversation_presets'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = {c['name'] for c in inspector.get_columns('conversation_presets')}

    # Rename emoji to icon (skip if table was already created with 'icon')
    if 'emoji' in columns and 'icon' not in columns:
        op.alter_column('conversation_presets', 'emoji', new_column_name='icon')

    # Update default value (only if icon column exists)
    if 'icon' in columns or 'emoji' in columns:
        op.alter_column('conversation_presets', 'icon',
                        server_default='clipboard',
                        existing_type=sa.String(50),
                        existing_nullable=False)

    # Drop default_questions column if it exists
    if 'default_questions' in columns:
        op.drop_column('conversation_presets', 'default_questions')


def downgrade() -> None:
    # Add back default_questions
    op.add_column('conversation_presets',
                  sa.Column('default_questions', sa.JSON(), nullable=True))

    # Rename icon back to emoji
    op.alter_column('conversation_presets', 'icon', new_column_name='emoji')

    # Restore original default
    op.alter_column('conversation_presets', 'emoji',
                    server_default='📋',
                    existing_type=sa.String(10),
                    existing_nullable=False)
