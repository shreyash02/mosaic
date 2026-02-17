"""Add insight_annotations table.

Revision ID: add_insight_annotations
Revises: add_user_action_columns
Create Date: 2026-02-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_insight_annotations'
down_revision: Union[str, None] = 'add_user_action_columns'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'insight_annotations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('target_type', sa.String(length=30), nullable=False),
        sa.Column('target_key', postgresql.JSONB(), nullable=False),
        sa.Column('starred', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('analysis_id', 'user_id', 'target_type', 'target_key', name='uq_insight_annotation_target'),
    )
    op.create_index('idx_insight_annotations_analysis_user', 'insight_annotations', ['analysis_id', 'user_id'])
    op.create_index('idx_insight_annotations_user', 'insight_annotations', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_insight_annotations_user', table_name='insight_annotations')
    op.drop_index('idx_insight_annotations_analysis_user', table_name='insight_annotations')
    op.drop_table('insight_annotations')
