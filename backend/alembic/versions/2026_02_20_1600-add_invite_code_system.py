"""Add invite code system tables (platform_settings, invite_codes, waitlist_requests).

Revision ID: add_invite_code_system
Revises: add_email_logs
Create Date: 2026-02-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "add_invite_code_system"
down_revision: Union[str, None] = "add_email_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Platform settings
    op.create_table(
        "platform_settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.String(500), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
    )

    # Waitlist requests (created before invite_codes because invite_codes references it)
    op.create_table(
        "waitlist_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("message", sa.String(1000), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("processed_by_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.Column("admin_note", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_waitlist_requests_email", "waitlist_requests", ["email"])
    op.create_index("ix_waitlist_requests_status", "waitlist_requests", ["status"])

    # Invite codes
    op.create_table(
        "invite_codes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(20), unique=True, nullable=False),
        sa.Column("code_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="available"),
        sa.Column("created_by_admin_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("used_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("waitlist_request_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("waitlist_requests.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_invite_codes_code", "invite_codes", ["code"], unique=True)
    op.create_index("ix_invite_codes_status", "invite_codes", ["status"])

    # Seed platform settings
    op.execute(
        "INSERT INTO platform_settings (key, value, description, updated_at) "
        "VALUES ('invite_code_required', 'false', 'Whether invite codes are required for registration', NOW())"
    )


def downgrade() -> None:
    op.drop_index("ix_invite_codes_status", table_name="invite_codes")
    op.drop_index("ix_invite_codes_code", table_name="invite_codes")
    op.drop_table("invite_codes")
    op.drop_index("ix_waitlist_requests_status", table_name="waitlist_requests")
    op.drop_index("ix_waitlist_requests_email", table_name="waitlist_requests")
    op.drop_table("waitlist_requests")
    op.drop_table("platform_settings")
