"""Add expanded synthesis fields to space_syntheses.

Revision ID: add_expanded_synthesis
Revises: 2026_03_11_1500-add_workspace_activity_logs
Create Date: 2026-03-15 10:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = "e7f5a8b9c0d1"
down_revision = "d6e4f5a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("space_syntheses", sa.Column("expanded_summary", sa.Text(), nullable=True))
    op.add_column("space_syntheses", sa.Column("expanded_theme_notes", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("space_syntheses", "expanded_theme_notes")
    op.drop_column("space_syntheses", "expanded_summary")
