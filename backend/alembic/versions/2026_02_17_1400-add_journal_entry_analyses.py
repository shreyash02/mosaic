"""Add journal_entry_analyses table for per-entry AI analysis.

Revision ID: add_journal_entry_analyses
Revises: add_journal_templates
Create Date: 2026-02-17 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = "add_journal_entry_analyses"
down_revision: Union[str, None] = "add_journal_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "journal_entry_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "response_id",
            UUID(as_uuid=True),
            sa.ForeignKey("responses.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column(
            "conversation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("themes", JSONB, nullable=True),
        sa.Column("mood_score", sa.Float, nullable=True),
        sa.Column("mood_label", sa.String(50), nullable=True),
        sa.Column("key_takeaway", sa.Text, nullable=True),
        sa.Column("connections", sa.Text, nullable=True),
        sa.Column("suggested_followups", JSONB, nullable=True),
        sa.Column("llm_provider", sa.String(50), nullable=True),
        sa.Column("llm_model", sa.String(100), nullable=True),
        sa.Column("analysis_duration_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_index(
        "idx_entry_analyses_response",
        "journal_entry_analyses",
        ["response_id"],
        unique=True,
    )
    op.create_index(
        "idx_entry_analyses_conversation",
        "journal_entry_analyses",
        ["conversation_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_entry_analyses_conversation", table_name="journal_entry_analyses")
    op.drop_index("idx_entry_analyses_response", table_name="journal_entry_analyses")
    op.drop_table("journal_entry_analyses")
