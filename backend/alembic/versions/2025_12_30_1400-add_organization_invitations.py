"""Add organization invitations table

Revision ID: 2025_12_30_1400
Revises: 2025_12_29_1800
Create Date: 2025-12-30 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_12_30_1400'
down_revision = 'r1s2t3u4v5w6'  # 2025_12_29_1800-add_recurring_conversation_fields
branch_labels = None
depends_on = None


def upgrade():
    # Create organization_invitations table
    op.create_table(
        'organization_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('invited_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('invited_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='member'),
        sa.Column('invitation_token', sa.String(length=100), nullable=False),
        sa.Column('is_accepted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['invited_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('invitation_token')
    )

    # Create indexes for performance
    op.create_index('idx_org_invitations_org_id', 'organization_invitations', ['organization_id'])
    op.create_index('idx_org_invitations_email', 'organization_invitations', ['email'])
    op.create_index('idx_org_invitations_token', 'organization_invitations', ['invitation_token'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_org_invitations_token', table_name='organization_invitations')
    op.drop_index('idx_org_invitations_email', table_name='organization_invitations')
    op.drop_index('idx_org_invitations_org_id', table_name='organization_invitations')

    # Drop table
    op.drop_table('organization_invitations')
