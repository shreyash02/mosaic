"""add_conversation_invitations

Revision ID: f7g8h9i0j1k2
Revises: a1b2c3d4e5f6
Create Date: 2025-12-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f7g8h9i0j1k2'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('conversation_invitations',
    sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('invited_by_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('invited_user_id', postgresql.UUID(as_uuid=True), nullable=True),
    sa.Column('invitation_token', sa.String(length=100), nullable=True),
    sa.Column('is_accepted', sa.Boolean(), nullable=False),
    sa.Column('accepted_at', sa.DateTime(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['invited_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['invited_user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_invitations_email'), 'conversation_invitations', ['email'], unique=False)
    op.create_index(op.f('ix_conversation_invitations_invitation_token'), 'conversation_invitations', ['invitation_token'], unique=True)
    op.create_index('idx_conversation_invitations_conversation', 'conversation_invitations', ['conversation_id'])
    op.create_index('idx_conversation_invitations_email', 'conversation_invitations', ['email'])
    op.create_index('idx_conversation_invitations_token', 'conversation_invitations', ['invitation_token'])


def downgrade() -> None:
    op.drop_index('idx_conversation_invitations_token', table_name='conversation_invitations')
    op.drop_index('idx_conversation_invitations_email', table_name='conversation_invitations')
    op.drop_index('idx_conversation_invitations_conversation', table_name='conversation_invitations')
    op.drop_index(op.f('ix_conversation_invitations_invitation_token'), table_name='conversation_invitations')
    op.drop_index(op.f('ix_conversation_invitations_email'), table_name='conversation_invitations')
    op.drop_table('conversation_invitations')

