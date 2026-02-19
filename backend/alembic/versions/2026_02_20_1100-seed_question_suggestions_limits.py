"""Seed usage limits for ai_question_suggestions feature.

Adds suggestions_per_month config with tier overrides so that
question suggestion calls are usage-tracked just like ai_analysis.

Revision ID: seed_question_suggestions_limits
Revises: add_analysis_schedule_fields
Create Date: 2026-02-20 11:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "seed_question_suggestions_limits"
down_revision: Union[str, None] = "update_presets_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SLUG = "ai_question_suggestions"

# Config keys to merge into the existing flag
CONFIG_ADDITIONS = {
    "suggestions_per_month": 10,
    "max_per_request": 5,
}

TIER_OVERRIDES = {
    "free": {"suggestions_per_month": 10, "max_per_request": 5},
    "basic": {"suggestions_per_month": 30, "max_per_request": 5},
    "pro": {"suggestions_per_month": 100, "max_per_request": 5},
    "enterprise": {"suggestions_per_month": -1, "max_per_request": 5},
}


def upgrade() -> None:
    conn = op.get_bind()

    # The flag already exists (seeded in seed_feature_flags); merge new config keys
    row = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": SLUG},
    ).fetchone()

    if not row:
        return

    flag_id = row[0]

    # Merge suggestions_per_month and max_per_request into existing config
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = COALESCE(config, '{}'::jsonb) || CAST(:config AS jsonb),
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": flag_id, "config": json.dumps(CONFIG_ADDITIONS)},
    )

    # Upsert tier overrides
    for tier, config_override in TIER_OVERRIDES.items():
        existing = conn.execute(
            text("""
                SELECT id FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier},
        ).fetchone()

        config_json = json.dumps(config_override)

        if existing:
            # Use CASE to handle JSON null (not SQL NULL) in config_override,
            # which would otherwise produce an array when concatenated
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CASE
                            WHEN config_override IS NULL OR jsonb_typeof(config_override) != 'object'
                            THEN CAST(:config AS jsonb)
                            ELSE config_override || CAST(:config AS jsonb)
                        END,
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing[0], "config": config_json},
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "tier": tier, "config": config_json},
            )


def downgrade() -> None:
    conn = op.get_bind()

    row = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": SLUG},
    ).fetchone()

    if not row:
        return

    flag_id = row[0]

    # Remove tier overrides added by this migration
    for tier in TIER_OVERRIDES:
        conn.execute(
            text("""
                DELETE FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier},
        )

    # Remove the config keys we added (restore to just model + max_per_request)
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = config - 'suggestions_per_month',
                updated_at = NOW()
            WHERE id = :id
        """),
        {"id": flag_id},
    )
