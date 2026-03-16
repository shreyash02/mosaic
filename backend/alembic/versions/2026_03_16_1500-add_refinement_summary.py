"""Add refinement_summary to space_artifacts.

Revision ID: h0c8d3e4f5g6
Revises: g9b7c2d3e4f5
Create Date: 2026-03-16 15:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "h0c8d3e4f5g6"
down_revision = "g9b7c2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("space_artifacts", sa.Column("refinement_summary", sa.String(60), nullable=True))


def downgrade() -> None:
    op.drop_column("space_artifacts", "refinement_summary")
