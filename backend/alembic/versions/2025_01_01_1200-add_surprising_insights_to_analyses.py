"""Add surprising_insights field to analyses

Revision ID: 2025_01_01_1200
Revises: 2025_12_31_0815
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2025_01_01_1200'
down_revision = '2025_12_31_0815'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add surprising_insights field to analyses table for AI-generated "What Surprised Us" section.
    Added as Text initially (will be changed to JSONB in next migration).
    """
    op.add_column('analyses', sa.Column('surprising_insights', sa.Text(), nullable=True))


def downgrade():
    """
    Remove surprising_insights field from analyses table.
    """
    op.drop_column('analyses', 'surprising_insights')
