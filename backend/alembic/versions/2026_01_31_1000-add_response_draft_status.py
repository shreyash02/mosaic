"""Add draft status fields to responses table.

Revision ID: add_response_draft_status
Revises: add_question_image
Create Date: 2026-01-31 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_response_draft_status'
down_revision: Union[str, None] = 'add_question_image'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column with default 'submitted' for existing responses
    op.add_column(
        'responses',
        sa.Column('status', sa.String(20), nullable=False, server_default='submitted')
    )

    # Add last_saved_at column for tracking draft save times
    op.add_column(
        'responses',
        sa.Column('last_saved_at', sa.DateTime(), nullable=True)
    )

    # Make submitted_at nullable (drafts don't have a submission time)
    op.alter_column(
        'responses',
        'submitted_at',
        existing_type=sa.DateTime(),
        nullable=True
    )

    # Create indexes for efficient draft queries
    op.create_index('idx_responses_status', 'responses', ['status'])
    op.create_index(
        'idx_responses_draft_lookup',
        'responses',
        ['conversation_id', 'participant_code_used', 'status']
    )
    op.create_index(
        'idx_responses_draft_lookup_user',
        'responses',
        ['conversation_id', 'participant_id', 'status']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_responses_draft_lookup_user', 'responses')
    op.drop_index('idx_responses_draft_lookup', 'responses')
    op.drop_index('idx_responses_status', 'responses')

    # Restore submitted_at to non-nullable (set any NULL to now)
    op.execute("UPDATE responses SET submitted_at = NOW() WHERE submitted_at IS NULL")
    op.alter_column(
        'responses',
        'submitted_at',
        existing_type=sa.DateTime(),
        nullable=False
    )

    # Drop columns
    op.drop_column('responses', 'last_saved_at')
    op.drop_column('responses', 'status')
