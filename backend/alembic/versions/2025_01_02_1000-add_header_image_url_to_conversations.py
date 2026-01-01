"""Add header_image_url field to conversations

Revision ID: 2025_01_02_1000
Revises: 2025_01_01_1300
Create Date: 2025-01-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_01_02_1000'
down_revision = '2025_01_01_1300'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add header_image_url field to store optional header image for conversations.
    """
    op.add_column('conversations', sa.Column('header_image_url', sa.String(500), nullable=True))


def downgrade():
    """
    Remove header_image_url field.
    """
    op.drop_column('conversations', 'header_image_url')

