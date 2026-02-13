"""Add scheduler_job_logs table for tracking scheduled job executions.

Revision ID: add_scheduler_job_logs
Revises: add_reminders_and_announcements
Create Date: 2026-02-13 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_scheduler_job_logs'
down_revision: Union[str, None] = 'add_reminders_and_announcements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create scheduler_job_logs table
    op.create_table(
        'scheduler_job_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_name', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('started_at', sa.DateTime, nullable=False),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('items_processed', sa.Integer, nullable=True, default=0),
        sa.Column('items_failed', sa.Integer, nullable=True, default=0),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),
    )

    # Create indexes for efficient querying
    op.create_index('idx_scheduler_job_logs_name', 'scheduler_job_logs', ['job_name'])
    op.create_index('idx_scheduler_job_logs_status', 'scheduler_job_logs', ['status'])
    op.create_index('idx_scheduler_job_logs_started_at', 'scheduler_job_logs', ['started_at'])
    op.create_index('idx_scheduler_job_logs_name_started', 'scheduler_job_logs', ['job_name', 'started_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_scheduler_job_logs_name_started', table_name='scheduler_job_logs')
    op.drop_index('idx_scheduler_job_logs_started_at', table_name='scheduler_job_logs')
    op.drop_index('idx_scheduler_job_logs_status', table_name='scheduler_job_logs')
    op.drop_index('idx_scheduler_job_logs_name', table_name='scheduler_job_logs')

    # Drop table
    op.drop_table('scheduler_job_logs')
