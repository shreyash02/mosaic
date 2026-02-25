"""Add share_token column to conversations for shareable analysis links.

Enables public/restricted sharing of analysis results via unique token URLs.
When share_token is set, the conversation's analysis is accessible at
/shared/analysis/{share_token} with access control based on results_access.

Revision ID: add_conversation_share_token
Revises: add_response_threshold
Create Date: 2026-02-25 17:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "add_conversation_share_token"
down_revision: Union[str, None] = "add_response_threshold"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("share_token", UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "idx_conversations_share_token",
        "conversations",
        ["share_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("idx_conversations_share_token", table_name="conversations")
    op.drop_column("conversations", "share_token")
