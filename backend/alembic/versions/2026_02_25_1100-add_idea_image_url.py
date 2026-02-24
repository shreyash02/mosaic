"""Add image_url column to ideas table.

Revision ID: add_idea_image_url
Revises: add_suggester_role_review
Create Date: 2026-02-25 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_idea_image_url"
down_revision = "add_suggester_role_review"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ideas",
        sa.Column("image_url", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("ideas", "image_url")
