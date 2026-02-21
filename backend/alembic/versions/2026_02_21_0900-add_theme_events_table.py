"""Add theme_events table for tracking theme evolution.

Revision ID: add_theme_events
Revises: seed_spaces_feature_flag
Create Date: 2026-02-21 09:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'add_theme_events'
down_revision: Union[str, None] = 'seed_spaces_feature_flag'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'theme_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('space_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('spaces.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organize_run_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('event_type', sa.String(20), nullable=False),
        sa.Column('theme_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('themes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('theme_name', sa.String(200), nullable=False),
        sa.Column('theme_color', sa.String(7), nullable=True),
        sa.Column('details', postgresql.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_theme_events_space_created', 'theme_events', ['space_id', 'created_at'])
    op.create_index('ix_theme_events_run', 'theme_events', ['organize_run_id'])


def downgrade() -> None:
    op.drop_index('ix_theme_events_run', table_name='theme_events')
    op.drop_index('ix_theme_events_space_created', table_name='theme_events')
    op.drop_table('theme_events')
