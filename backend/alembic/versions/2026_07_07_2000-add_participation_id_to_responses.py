"""Add participation_id to responses and backfill

Revision ID: k3f1g6h7i8j9
Revises: j2e0f5g6h7i8
Create Date: 2026-07-07 20:00:00

Adds a shared participation_id across all response rows of a single
submission. Backfills existing rows by grouping on
(conversation_id, participant_id or participant_code_used).
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "k3f1g6h7i8j9"
down_revision = "j2e0f5g6h7i8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "responses",
        sa.Column("participation_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_responses_participation_id", "responses", ["participation_id"]
    )

    # Backfill: one shared UUID per (conversation, participant) group. A
    # participant is identified by participant_id when present, else by
    # participant_code_used. Rows with neither are left NULL.
    op.execute(
        """
        UPDATE responses r
        SET participation_id = grouped.pid
        FROM (
            SELECT
                conversation_id,
                COALESCE(participant_id::text, participant_code_used) AS participant_key,
                gen_random_uuid() AS pid
            FROM responses
            WHERE COALESCE(participant_id::text, participant_code_used) IS NOT NULL
            GROUP BY conversation_id, COALESCE(participant_id::text, participant_code_used)
        ) grouped
        WHERE r.conversation_id = grouped.conversation_id
          AND COALESCE(r.participant_id::text, r.participant_code_used) = grouped.participant_key
        """
    )


def downgrade() -> None:
    op.drop_index("ix_responses_participation_id", table_name="responses")
    op.drop_column("responses", "participation_id")
