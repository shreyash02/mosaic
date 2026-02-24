"""Rename space member role 'member' to 'editor' and add 'viewer' role support.

Also adds a 'role' column to space_invitations so invitations can specify
whether the invitee should become an editor or viewer.

Revision ID: rename_member_to_editor
Revises: add_space_members
Create Date: 2026-02-23 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "rename_member_to_editor"
down_revision: Union[str, None] = "add_space_members"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename existing 'member' roles to 'editor'
    op.execute("UPDATE space_members SET role = 'editor' WHERE role = 'member'")

    # Add role column to space_invitations
    op.add_column(
        "space_invitations",
        sa.Column("role", sa.String(50), nullable=False, server_default="editor"),
    )


def downgrade() -> None:
    op.drop_column("space_invitations", "role")
    op.execute("UPDATE space_members SET role = 'member' WHERE role = 'editor'")
    op.execute("UPDATE space_members SET role = 'member' WHERE role = 'viewer'")
