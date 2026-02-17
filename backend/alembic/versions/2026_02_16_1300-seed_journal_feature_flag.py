"""Seed journal feature flag

Adds the 'journals' feature flag with tier-specific limits for
journal count, entries per journal, and analyses per month.

Revision ID: seed_journal_feature_flag
Revises: add_individual_mode
Create Date: 2026-02-16 13:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'seed_journal_feature_flag'
down_revision: Union[str, None] = 'add_individual_mode'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


JOURNAL_FLAG = {
    "slug": "journals",
    "name": "Individual Journals",
    "description": "Personal journal mode with AI-powered temporal analysis",
    "enabled": True,
    "config": {
        "max_journals": -1,
        "max_entries_per_journal": -1,
        "journal_analyses_per_month": -1,
    },
    "tier_overrides": {
        "free": {"max_journals": 1, "max_entries_per_journal": 50, "journal_analyses_per_month": 2},
        "basic": {"max_journals": 3, "max_entries_per_journal": 200, "journal_analyses_per_month": 5},
        "pro": {"max_journals": 10, "max_entries_per_journal": -1, "journal_analyses_per_month": 20},
        "enterprise": {"max_journals": -1, "max_entries_per_journal": -1, "journal_analyses_per_month": -1},
    },
}


def upgrade() -> None:
    conn = op.get_bind()

    # Check if flag already exists (idempotent)
    existing = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": JOURNAL_FLAG["slug"]}
    ).fetchone()

    if existing:
        flag_id = existing[0]
        print(f"  Feature flag '{JOURNAL_FLAG['slug']}' already exists, updating config...")
        conn.execute(
            text("""
                UPDATE feature_flags
                SET config = CAST(:config AS jsonb),
                    description = :description,
                    updated_at = NOW()
                WHERE slug = :slug
            """),
            {
                "slug": JOURNAL_FLAG["slug"],
                "config": json.dumps(JOURNAL_FLAG["config"]),
                "description": JOURNAL_FLAG["description"],
            }
        )
    else:
        print(f"  Creating feature flag '{JOURNAL_FLAG['slug']}'...")
        result = conn.execute(
            text("""
                INSERT INTO feature_flags (id, name, slug, description, enabled, config, created_at, updated_at)
                VALUES (gen_random_uuid(), :name, :slug, :description, :enabled, CAST(:config AS jsonb), NOW(), NOW())
                RETURNING id
            """),
            {
                "name": JOURNAL_FLAG["name"],
                "slug": JOURNAL_FLAG["slug"],
                "description": JOURNAL_FLAG["description"],
                "enabled": JOURNAL_FLAG["enabled"],
                "config": json.dumps(JOURNAL_FLAG["config"]),
            }
        )
        flag_id = result.fetchone()[0]

    # Upsert tier overrides
    for tier, config_override in JOURNAL_FLAG["tier_overrides"].items():
        existing_override = conn.execute(
            text("""
                SELECT id FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier}
        ).fetchone()

        config_value = json.dumps(config_override)

        if existing_override:
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing_override[0], "config": config_value}
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "tier": tier, "config": config_value}
            )

    print("  Seeded 'journals' feature flag with tier overrides")


def downgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = 'journals'")
    ).fetchone()

    if result:
        flag_id = result[0]
        conn.execute(
            text("DELETE FROM feature_flag_overrides WHERE flag_id = :flag_id"),
            {"flag_id": flag_id}
        )
        conn.execute(
            text("DELETE FROM feature_flags WHERE id = :flag_id"),
            {"flag_id": flag_id}
        )

    print("  Removed 'journals' feature flag")
