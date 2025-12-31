"""Add show_verbatim_responses field to conversations

Revision ID: 2025_12_31_0815
Revises: 2025_12_31_0800
Create Date: 2025-12-31 08:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_12_31_0815'
down_revision = '2025_12_31_0800'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add show_verbatim_responses field to control whether raw responses are visible.
    If False, only AI summaries/themes are shown. If True, both raw responses and analysis visible.
    """
    op.add_column('conversations', sa.Column('show_verbatim_responses', sa.Boolean(), nullable=False, server_default='false'))


def downgrade():
    """
    Remove show_verbatim_responses field.
    """
    op.drop_column('conversations', 'show_verbatim_responses')
