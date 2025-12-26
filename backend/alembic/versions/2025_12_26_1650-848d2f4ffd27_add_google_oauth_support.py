"""add_google_oauth_support

Revision ID: 848d2f4ffd27
Revises: e68144370c1a
Create Date: 2025-12-26 16:50:57.828241

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '848d2f4ffd27'
down_revision = 'e68144370c1a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make password_hash nullable to support OAuth users
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(length=255),
                    nullable=True)
    
    # Add google_id column
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)


def downgrade() -> None:
    # Remove google_id column and index
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'google_id')
    
    # Make password_hash non-nullable again
    # Note: This will fail if there are OAuth users without passwords
    # In production, you'd want to handle this more carefully
    op.alter_column('users', 'password_hash',
                    existing_type=sa.String(length=255),
                    nullable=False)
