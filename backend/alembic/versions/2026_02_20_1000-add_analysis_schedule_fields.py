"""Add analysis schedule fields to conversations.

Adds columns for controlling when within each analysis interval the analysis runs:
- analysis_time_of_day: HH:MM 24h format (default null = 09:00)
- analysis_day_of_week: 0=Mon..6=Sun (for weekly/biweekly)
- analysis_day_of_month: 1-28 (for monthly)

Revision ID: add_analysis_schedule_fields
Revises: seed_journal_sharing_config
Create Date: 2026-02-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_analysis_schedule_fields"
down_revision: Union[str, None] = "seed_journal_sharing_config"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("analysis_time_of_day", sa.String(5), nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("analysis_day_of_week", sa.Integer, nullable=True),
    )
    op.add_column(
        "conversations",
        sa.Column("analysis_day_of_month", sa.Integer, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversations", "analysis_day_of_month")
    op.drop_column("conversations", "analysis_day_of_week")
    op.drop_column("conversations", "analysis_time_of_day")
