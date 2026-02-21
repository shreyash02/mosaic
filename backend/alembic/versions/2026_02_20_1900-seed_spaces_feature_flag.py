"""Seed 'spaces' feature flag with tier-based limits.

Revision ID: seed_spaces_feature_flag
Revises: add_spaces_tables
Create Date: 2026-02-20 19:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'seed_spaces_feature_flag'
down_revision: Union[str, None] = 'add_spaces_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SPACES_FLAG = {
    "slug": "spaces",
    "name": "Spaces",
    "description": "Second-brain for ideas with AI-powered theme organization and network graph",
    "enabled": True,
    "config": {
        "max_spaces": -1,
        "max_ideas_per_space": -1,
    },
    "tier_overrides": {
        "free": {"max_spaces": 1, "max_ideas_per_space": 50},
        "basic": {"max_spaces": 3, "max_ideas_per_space": 200},
        "pro": {"max_spaces": 10, "max_ideas_per_space": 1000},
        "enterprise": {"max_spaces": -1, "max_ideas_per_space": -1},
    },
}


def upgrade() -> None:
    conn = op.get_bind()

    # Check if flag already exists (idempotent)
    existing = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": SPACES_FLAG["slug"]}
    ).fetchone()

    if existing:
        flag_id = existing[0]
        print(f"  Feature flag '{SPACES_FLAG['slug']}' already exists, updating config...")
        conn.execute(
            text("""
                UPDATE feature_flags
                SET config = CAST(:config AS jsonb),
                    description = :description,
                    updated_at = NOW()
                WHERE slug = :slug
            """),
            {
                "slug": SPACES_FLAG["slug"],
                "config": json.dumps(SPACES_FLAG["config"]),
                "description": SPACES_FLAG["description"],
            }
        )
    else:
        print(f"  Creating feature flag '{SPACES_FLAG['slug']}'...")
        result = conn.execute(
            text("""
                INSERT INTO feature_flags (id, name, slug, description, enabled, config, created_at, updated_at)
                VALUES (gen_random_uuid(), :name, :slug, :description, :enabled, CAST(:config AS jsonb), NOW(), NOW())
                RETURNING id
            """),
            {
                "name": SPACES_FLAG["name"],
                "slug": SPACES_FLAG["slug"],
                "description": SPACES_FLAG["description"],
                "enabled": SPACES_FLAG["enabled"],
                "config": json.dumps(SPACES_FLAG["config"]),
            }
        )
        flag_id = result.fetchone()[0]

    # Upsert tier overrides
    for tier, config_override in SPACES_FLAG["tier_overrides"].items():
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

    print("  Seeded 'spaces' feature flag with tier overrides")


def downgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = 'spaces'")
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

    print("  Removed 'spaces' feature flag")
