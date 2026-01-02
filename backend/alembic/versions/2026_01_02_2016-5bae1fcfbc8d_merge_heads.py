"""merge_heads

Revision ID: 5bae1fcfbc8d
Revises: 2025_01_03_1000, 2025_01_04_1000
Create Date: 2026-01-02 20:16:19.852483

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5bae1fcfbc8d'
down_revision = ('2025_01_03_1000', '2025_01_04_1000')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
