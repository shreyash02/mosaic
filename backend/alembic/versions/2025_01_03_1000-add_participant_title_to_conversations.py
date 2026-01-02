"""Add participant_title field to conversations

Revision ID: 2025_01_03_1000
Revises: 2025_01_02_1000
Create Date: 2025-01-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_01_03_1000'
down_revision = '2025_01_02_1000'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add participant_title field to store optional participant-facing title for conversations.
    If not set, the regular title will be used when participants view the conversation.
    """
    op.add_column('conversations', sa.Column('participant_title', sa.String(500), nullable=True))


def downgrade():
    """
    Remove participant_title field.
    """
    op.drop_column('conversations', 'participant_title')

