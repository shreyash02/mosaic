"""Add branding fields to organizations and conversations

Revision ID: add_branding_fields
Revises: add_trigger_type_periodic
Create Date: 2026-02-10 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_branding_fields'
down_revision = 'add_trigger_type_periodic'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add branding fields to organizations
    op.add_column(
        'organizations',
        sa.Column('brand_logo_url', sa.String(500), nullable=True)
    )
    op.add_column(
        'organizations',
        sa.Column('brand_name', sa.String(255), nullable=True)
    )

    # Add branding fields to conversations (as overrides)
    op.add_column(
        'conversations',
        sa.Column('brand_logo_url', sa.String(500), nullable=True)
    )
    op.add_column(
        'conversations',
        sa.Column('brand_name', sa.String(255), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('conversations', 'brand_name')
    op.drop_column('conversations', 'brand_logo_url')
    op.drop_column('organizations', 'brand_name')
    op.drop_column('organizations', 'brand_logo_url')
