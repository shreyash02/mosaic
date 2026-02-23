"""Add space_members and space_invitations tables for collaborative spaces.

Revision ID: add_space_members
Revises: add_synthesis_actions
Create Date: 2026-02-23 11:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_space_members"
down_revision: Union[str, None] = "add_synthesis_actions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create space_members table
    op.create_table(
        "space_members",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("space_id", "user_id", name="uq_space_user"),
    )
    op.create_index("idx_space_members_space", "space_members", ["space_id"])
    op.create_index("idx_space_members_user", "space_members", ["user_id"])

    # Create space_invitations table
    op.create_table(
        "space_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("invited_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invited_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("invitation_token", sa.String(100), unique=True, nullable=True),
        sa.Column("is_accepted", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("accepted_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime, nullable=True),
    )
    op.create_index("idx_space_invitations_space", "space_invitations", ["space_id"])
    op.create_index("idx_space_invitations_email", "space_invitations", ["email"])
    op.create_index("idx_space_invitations_token", "space_invitations", ["invitation_token"])
    op.create_index("idx_space_invitations_invited_user", "space_invitations", ["invited_user_id"])

    # Backfill: create an "owner" membership row for every existing space
    op.execute(
        """
        INSERT INTO space_members (id, space_id, user_id, role, joined_at)
        SELECT gen_random_uuid(), id, owner_id, 'owner', created_at
        FROM spaces
        """
    )


def downgrade() -> None:
    op.drop_index("idx_space_invitations_invited_user", table_name="space_invitations")
    op.drop_index("idx_space_invitations_token", table_name="space_invitations")
    op.drop_index("idx_space_invitations_email", table_name="space_invitations")
    op.drop_index("idx_space_invitations_space", table_name="space_invitations")
    op.drop_table("space_invitations")
    op.drop_index("idx_space_members_user", table_name="space_members")
    op.drop_index("idx_space_members_space", table_name="space_members")
    op.drop_table("space_members")
