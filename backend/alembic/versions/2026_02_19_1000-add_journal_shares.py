"""Add journal_shares table for sharing journals with other users.

Revision ID: add_journal_shares
Revises: add_journal_entry_analyses
Create Date: 2026-02-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "add_journal_shares"
down_revision: Union[str, None] = "add_journal_entry_analyses"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "journal_shares",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "journal_id",
            UUID(as_uuid=True),
            sa.ForeignKey("journals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column(
            "shared_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "shared_user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("share_type", sa.String(20), nullable=False, server_default="analysis_only"),
        sa.Column("invitation_token", sa.String(100), unique=True, nullable=False),
        sa.Column("is_accepted", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("accepted_at", sa.DateTime, nullable=True),
        sa.Column("is_revoked", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("revoked_at", sa.DateTime, nullable=True),
        sa.Column("expires_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_journal_shares_journal", "journal_shares", ["journal_id"])
    op.create_index("idx_journal_shares_email", "journal_shares", ["email"])
    op.create_index("idx_journal_shares_token", "journal_shares", ["invitation_token"], unique=True)
    op.create_index("idx_journal_shares_shared_user", "journal_shares", ["shared_user_id"])


def downgrade() -> None:
    op.drop_index("idx_journal_shares_shared_user", table_name="journal_shares")
    op.drop_index("idx_journal_shares_token", table_name="journal_shares")
    op.drop_index("idx_journal_shares_email", table_name="journal_shares")
    op.drop_index("idx_journal_shares_journal", table_name="journal_shares")
    op.drop_table("journal_shares")
