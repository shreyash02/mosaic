"""Add indexes to conversations table for common query patterns.

Indexes added:
- creator_id (every list endpoint filters by creator)
- organization_id (org-scoped queries)
- state (every query filters != deleted)
- (creator_id, state) composite (most common filter combo)
- (organization_id, state) composite (org list queries)

Revision ID: add_conversations_query_indexes
Revises: add_feature_flag_display_order
Create Date: 2026-02-20 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'add_conversations_query_indexes'
down_revision: Union[str, None] = 'add_feature_flag_display_order'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('idx_conversations_creator_id', 'conversations', ['creator_id'])
    op.create_index('idx_conversations_organization_id', 'conversations', ['organization_id'])
    op.create_index('idx_conversations_state', 'conversations', ['state'])
    op.create_index('idx_conversations_creator_state', 'conversations', ['creator_id', 'state'])
    op.create_index('idx_conversations_org_state', 'conversations', ['organization_id', 'state'])


def downgrade() -> None:
    op.drop_index('idx_conversations_org_state', 'conversations')
    op.drop_index('idx_conversations_creator_state', 'conversations')
    op.drop_index('idx_conversations_state', 'conversations')
    op.drop_index('idx_conversations_organization_id', 'conversations')
    op.drop_index('idx_conversations_creator_id', 'conversations')
