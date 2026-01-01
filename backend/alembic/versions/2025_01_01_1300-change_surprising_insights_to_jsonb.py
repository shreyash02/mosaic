"""Change surprising_insights from Text to JSONB

Revision ID: 2025_01_01_1300
Revises: 2025_01_01_1200
Create Date: 2025-01-01 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = '2025_01_01_1300'
down_revision = '2025_01_01_1200'
branch_labels = None
depends_on = None


def upgrade():
    """
    Change surprising_insights column from Text to JSONB for structured storage.
    Existing text data will be lost (set to NULL).
    """
    # Set all existing text values to NULL (old markdown format won't be preserved)
    op.execute("UPDATE analyses SET surprising_insights = NULL WHERE surprising_insights IS NOT NULL")
    
    # Drop the old Text column
    op.drop_column('analyses', 'surprising_insights')
    
    # Add new JSONB column
    op.add_column('analyses', sa.Column('surprising_insights', JSONB, nullable=True))


def downgrade():
    """
    Change surprising_insights column back from JSONB to Text.
    JSON data will be lost (set to NULL).
    """
    # Set all existing JSONB values to NULL
    op.execute("UPDATE analyses SET surprising_insights = NULL WHERE surprising_insights IS NOT NULL")
    
    # Drop the JSONB column
    op.drop_column('analyses', 'surprising_insights')
    
    # Add back Text column
    op.add_column('analyses', sa.Column('surprising_insights', sa.Text(), nullable=True))

