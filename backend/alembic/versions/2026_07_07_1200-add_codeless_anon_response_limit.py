"""Add require_participant_codes and max_responses to conversations

Revision ID: j2e0f5g6h7i8
Revises: i1d9e4f5g6h7
Create Date: 2026-07-07 12:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "j2e0f5g6h7i8"
down_revision = "i1d9e4f5g6h7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("require_participant_codes", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "conversations",
        sa.Column("max_responses", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversations", "max_responses")
    op.drop_column("conversations", "require_participant_codes")
