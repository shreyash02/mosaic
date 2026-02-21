"""Add spaces, ideas, themes, idea_themes, and theme_connections tables.

Revision ID: add_spaces_tables
Revises: add_audit_logs
Create Date: 2026-02-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_spaces_tables"
down_revision: Union[str, None] = "add_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Spaces
    op.create_table(
        "spaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("settings", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_spaces_owner", "spaces", ["owner_id"])
    op.create_index("idx_spaces_organization", "spaces", ["organization_id"])

    # Ideas
    op.create_table(
        "ideas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_ideas_space", "ideas", ["space_id"])
    op.create_index("idx_ideas_author", "ideas", ["author_id"])
    op.create_index("idx_ideas_status", "ideas", ["status"])

    # Themes
    op.create_table(
        "themes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("color", sa.String(7), nullable=True),
        sa.Column("is_ai_generated", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_themes_space", "themes", ["space_id"])

    # Idea-Theme junction
    op.create_table(
        "idea_themes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("idea_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("themes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("1.0")),
        sa.Column("assigned_by", sa.String(10), nullable=False, server_default="ai"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("idea_id", "theme_id", name="uq_idea_theme"),
    )
    op.create_index("idx_idea_themes_idea", "idea_themes", ["idea_id"])
    op.create_index("idx_idea_themes_theme", "idea_themes", ["theme_id"])

    # Theme connections
    op.create_table(
        "theme_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_a_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("themes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_b_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("themes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("strength", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("theme_a_id < theme_b_id", name="ck_theme_connection_ordered"),
        sa.UniqueConstraint("theme_a_id", "theme_b_id", name="uq_theme_connection_pair"),
    )
    op.create_index("idx_theme_connections_space", "theme_connections", ["space_id"])


def downgrade() -> None:
    op.drop_index("idx_theme_connections_space", table_name="theme_connections")
    op.drop_table("theme_connections")
    op.drop_index("idx_idea_themes_theme", table_name="idea_themes")
    op.drop_index("idx_idea_themes_idea", table_name="idea_themes")
    op.drop_table("idea_themes")
    op.drop_index("idx_themes_space", table_name="themes")
    op.drop_table("themes")
    op.drop_index("idx_ideas_status", table_name="ideas")
    op.drop_index("idx_ideas_author", table_name="ideas")
    op.drop_index("idx_ideas_space", table_name="ideas")
    op.drop_table("ideas")
    op.drop_index("idx_spaces_organization", table_name="spaces")
    op.drop_index("idx_spaces_owner", table_name="spaces")
    op.drop_table("spaces")
