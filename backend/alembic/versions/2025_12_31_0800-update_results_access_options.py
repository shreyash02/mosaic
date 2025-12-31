"""Update results_access options to support creator_only mode

Revision ID: 2025_12_31_0800
Revises: 2025_12_30_1400
Create Date: 2025-12-31 08:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '2025_12_31_0800'
down_revision = '2025_12_30_1400'
branch_labels = None
depends_on = None


def upgrade():
    """
    Update results_access values:
    - Rename 'invite_code_holders' to 'participants'
    - Add support for new 'creator_only' option
    """
    # Rename existing 'invite_code_holders' to 'participants'
    op.execute(
        "UPDATE conversations SET results_access = 'participants' "
        "WHERE results_access = 'invite_code_holders'"
    )


def downgrade():
    """
    Revert results_access values:
    - Rename 'participants' back to 'invite_code_holders'
    - Convert 'creator_only' to 'participants' (best effort)
    """
    # Revert 'participants' back to 'invite_code_holders'
    op.execute(
        "UPDATE conversations SET results_access = 'invite_code_holders' "
        "WHERE results_access = 'participants'"
    )

    # Convert 'creator_only' to 'invite_code_holders' (best effort downgrade)
    op.execute(
        "UPDATE conversations SET results_access = 'invite_code_holders' "
        "WHERE results_access = 'creator_only'"
    )
