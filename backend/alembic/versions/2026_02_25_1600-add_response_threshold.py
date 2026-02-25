"""Add response_threshold column to conversations.

Minimum number of responses required before analysis can run.
Protects participant anonymity for anonymous/semi-anonymous conversations.
Auto-defaults to 3 for non-open conversations at the application layer.

Revision ID: add_response_threshold
Revises: adjust_paid_tier_limits
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_response_threshold"
down_revision: Union[str, None] = "adjust_paid_tier_limits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("response_threshold", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversations", "response_threshold")
