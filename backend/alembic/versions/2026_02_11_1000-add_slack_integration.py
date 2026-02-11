"""Add Slack integration tables

Revision ID: add_slack_integration
Revises: add_branding_fields
Create Date: 2026-02-11 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'add_slack_integration'
down_revision = 'add_branding_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create slack_workspace_connections table
    op.create_table(
        'slack_workspace_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('slack_team_id', sa.String(50), nullable=False, unique=True),
        sa.Column('slack_team_name', sa.String(255), nullable=True),
        sa.Column('bot_access_token_encrypted', sa.Text, nullable=False),
        sa.Column('bot_user_id', sa.String(50), nullable=True),
        sa.Column('installed_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('installed_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),
        sa.Column('last_verified_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create user_slack_connections table
    op.create_table(
        'user_slack_connections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('slack_user_id', sa.String(50), nullable=False),
        sa.Column('slack_team_id', sa.String(50), nullable=False),
        sa.Column('slack_display_name', sa.String(255), nullable=True),
        sa.Column('connected_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('is_active', sa.Boolean, nullable=False, default=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('user_id', 'slack_team_id', name='uq_user_slack_team'),
    )


def downgrade() -> None:
    op.drop_table('user_slack_connections')
    op.drop_table('slack_workspace_connections')
