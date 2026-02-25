"""Add space_syntheses table for dedicated synthesis storage.

Moves purpose_synthesis out of the spaces.settings JSONB into a proper
table so every synthesis is retained as a row and note states / dismiss
reasons / completion outcomes live on the synthesis row itself.

Existing data in spaces.settings['purpose_synthesis'] is migrated into
the new table.  The settings keys are intentionally NOT removed here —
cleanup happens in a later migration after verification.

Revision ID: add_space_syntheses_table
Revises: add_conversation_share_token
Create Date: 2026-02-25 18:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = "add_space_syntheses_table"
down_revision: Union[str, None] = "add_conversation_share_token"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create space_syntheses table
    op.create_table(
        "space_syntheses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("space_id", UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("space_summary", sa.Text, nullable=True),
        sa.Column("theme_notes", JSONB, nullable=True),
        sa.Column("note_states", JSONB, nullable=True),
        sa.Column("dismiss_reasons", JSONB, nullable=True),
        sa.Column("completion_outcomes", JSONB, nullable=True),
        sa.Column("completion_outcome_images", JSONB, nullable=True),
        sa.Column("is_current", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("generated_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_index("idx_space_syntheses_space_purpose", "space_syntheses", ["space_id", "purpose"])
    op.create_index("idx_space_syntheses_current", "space_syntheses", ["space_id", "purpose", "is_current"])

    # Migrate existing data from spaces.settings JSONB
    op.execute("""
        INSERT INTO space_syntheses (id, space_id, purpose, space_summary, theme_notes,
                                     note_states, dismiss_reasons, completion_outcomes,
                                     completion_outcome_images, is_current, generated_at, created_at)
        SELECT
            gen_random_uuid(),
            s.id,
            COALESCE(s.settings->>'synthesis_purpose', 'explore'),
            s.settings->'purpose_synthesis'->>'space_summary',
            s.settings->'purpose_synthesis'->'theme_notes',
            s.settings->'purpose_synthesis'->'note_states',
            s.settings->'purpose_synthesis'->'dismiss_reasons',
            s.settings->'purpose_synthesis'->'completion_outcomes',
            s.settings->'purpose_synthesis'->'completion_outcome_images',
            true,
            CASE
                WHEN s.settings->'purpose_synthesis'->>'generated_at' IS NOT NULL
                THEN (s.settings->'purpose_synthesis'->>'generated_at')::timestamp
                ELSE NULL
            END,
            NOW()
        FROM spaces s
        WHERE s.settings->'purpose_synthesis' IS NOT NULL
          AND s.settings->>'purpose_synthesis' != 'null'
    """)


def downgrade() -> None:
    op.drop_index("idx_space_syntheses_current", table_name="space_syntheses")
    op.drop_index("idx_space_syntheses_space_purpose", table_name="space_syntheses")
    op.drop_table("space_syntheses")
