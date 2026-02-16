"""Seed ai_suggested_actions feature flag.

Revision ID: seed_ai_suggested_actions
Revises: add_suggested_actions
Create Date: 2026-02-16 15:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'seed_ai_suggested_actions'
down_revision: Union[str, None] = 'add_suggested_actions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FLAG = {
    "slug": "ai_suggested_actions",
    "name": "AI Suggested Actions",
    "description": "AI-generated action suggestions from analysis results",
    "enabled": True,
    "config": {
        "generations_per_month": 10,
    },
    "tier_overrides": {
        "free": {"generations_per_month": 5},
        "basic": {"generations_per_month": 20},
        "pro": {"generations_per_month": 100},
        "enterprise": {"generations_per_month": 1000},
    },
}


def upgrade() -> None:
    conn = op.get_bind()

    existing = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": FLAG["slug"]},
    ).fetchone()

    if existing:
        flag_id = existing[0]
        conn.execute(
            text("""
                UPDATE feature_flags
                SET config = COALESCE(config, '{}'::jsonb) || CAST(:config AS jsonb),
                    description = COALESCE(:description, description),
                    updated_at = NOW()
                WHERE slug = :slug
            """),
            {
                "slug": FLAG["slug"],
                "config": json.dumps(FLAG["config"]),
                "description": FLAG["description"],
            },
        )
    else:
        result = conn.execute(
            text("""
                INSERT INTO feature_flags (id, name, slug, description, enabled, config, created_at, updated_at)
                VALUES (gen_random_uuid(), :name, :slug, :description, :enabled, CAST(:config AS jsonb), NOW(), NOW())
                RETURNING id
            """),
            {
                "name": FLAG["name"],
                "slug": FLAG["slug"],
                "description": FLAG["description"],
                "enabled": FLAG["enabled"],
                "config": json.dumps(FLAG["config"]),
            },
        )
        flag_id = result.fetchone()[0]

    for tier, config_override in FLAG["tier_overrides"].items():
        existing_override = conn.execute(
            text("""
                SELECT id FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier},
        ).fetchone()

        config_value = json.dumps(config_override) if config_override else None

        if existing_override:
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = COALESCE(config_override, '{}'::jsonb) || CAST(:config AS jsonb),
                        updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing_override[0], "config": config_value},
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "tier": tier, "config": config_value},
            )


def downgrade() -> None:
    conn = op.get_bind()
    flag = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = :slug"),
        {"slug": FLAG["slug"]},
    ).fetchone()
    if flag:
        conn.execute(
            text("DELETE FROM feature_flag_overrides WHERE flag_id = :flag_id"),
            {"flag_id": flag[0]},
        )
        conn.execute(
            text("DELETE FROM feature_flags WHERE id = :id"),
            {"id": flag[0]},
        )
