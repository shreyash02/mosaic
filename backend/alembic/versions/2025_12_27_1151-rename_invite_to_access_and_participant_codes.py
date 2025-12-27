"""rename_invite_to_access_and_participant_codes

Revision ID: a1b2c3d4e5f6
Revises: 848d2f4ffd27
Create Date: 2025-12-27 11:51:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '848d2f4ffd27'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rename invite_code column to access_code in conversations table
    op.alter_column('conversations', 'invite_code',
                    new_column_name='access_code',
                    existing_type=sa.String(length=50),
                    existing_nullable=False)
    
    # Rename index
    op.drop_index('ix_conversations_invite_code', table_name='conversations')
    op.create_index(op.f('ix_conversations_access_code'), 'conversations', ['access_code'], unique=True)
    
    # Rename invite_codes table to participant_codes
    op.rename_table('invite_codes', 'participant_codes')
    
    # Rename code column to participant_code in participant_codes table
    op.alter_column('participant_codes', 'code',
                    new_column_name='participant_code',
                    existing_type=sa.String(length=100),
                    existing_nullable=False)
    
    # Rename indexes for participant_codes table
    op.drop_index('idx_invite_codes_conversation', table_name='participant_codes')
    op.drop_index('idx_invite_codes_code', table_name='participant_codes')
    op.drop_index('ix_invite_codes_code', table_name='participant_codes')
    op.create_index('idx_participant_codes_conversation', 'participant_codes', ['conversation_id'])
    op.create_index('idx_participant_codes_code', 'participant_codes', ['participant_code'])
    op.create_index(op.f('ix_participant_codes_participant_code'), 'participant_codes', ['participant_code'], unique=True)
    
    # Rename invite_code_used column to participant_code_used in responses table
    op.alter_column('responses', 'invite_code_used',
                    new_column_name='participant_code_used',
                    existing_type=sa.String(length=100),
                    existing_nullable=True)
    
    # Rename index
    op.drop_index('idx_responses_invite_code', table_name='responses')
    op.create_index('idx_responses_participant_code', 'responses', ['participant_code_used'])


def downgrade() -> None:
    # Revert responses table
    op.drop_index('idx_responses_participant_code', table_name='responses')
    op.alter_column('responses', 'participant_code_used',
                    new_column_name='invite_code_used',
                    existing_type=sa.String(length=100),
                    existing_nullable=True)
    op.create_index('idx_responses_invite_code', 'responses', ['invite_code_used'])
    
    # Revert participant_codes table
    op.drop_index('ix_participant_codes_participant_code', table_name='participant_codes')
    op.drop_index('idx_participant_codes_code', table_name='participant_codes')
    op.drop_index('idx_participant_codes_conversation', table_name='participant_codes')
    op.alter_column('participant_codes', 'participant_code',
                    new_column_name='code',
                    existing_type=sa.String(length=100),
                    existing_nullable=False)
    op.create_index('idx_invite_codes_code', 'participant_codes', ['code'])
    op.create_index('idx_invite_codes_conversation', 'participant_codes', ['conversation_id'])
    op.create_index(op.f('ix_invite_codes_code'), 'participant_codes', ['code'], unique=True)
    op.rename_table('participant_codes', 'invite_codes')
    
    # Revert conversations table
    op.drop_index('ix_conversations_access_code', table_name='conversations')
    op.alter_column('conversations', 'access_code',
                    new_column_name='invite_code',
                    existing_type=sa.String(length=50),
                    existing_nullable=False)
    op.create_index('ix_conversations_invite_code', 'conversations', ['invite_code'], unique=True)

