"""Add max_collaborators_per_space to spaces feature flag.

Revision ID: add_space_collaborator_limits
Revises: add_space_sharing_snapshots
Create Date: 2026-02-25 13:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = "add_space_collaborator_limits"
down_revision: Union[str, None] = "add_space_sharing_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TIER_LIMITS = {
    "free": 0,
    "basic": 3,
    "pro": 7,
    "enterprise": 15,
}


def upgrade() -> None:
    conn = op.get_bind()

    # Get the spaces feature flag
    row = conn.execute(
        text("SELECT id, config FROM feature_flags WHERE slug = 'spaces'")
    ).fetchone()

    if not row:
        print("  WARNING: 'spaces' feature flag not found, skipping")
        return

    flag_id = row[0]
    current_config = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}

    # Add max_collaborators_per_space to global config (unlimited default)
    current_config["max_collaborators_per_space"] = -1
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = CAST(:config AS jsonb), updated_at = NOW()
            WHERE id = :flag_id
        """),
        {"flag_id": flag_id, "config": json.dumps(current_config)},
    )

    # Upsert tier overrides to include max_collaborators_per_space
    for tier, limit in TIER_LIMITS.items():
        existing = conn.execute(
            text("""
                SELECT id, config_override FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier},
        ).fetchone()

        if existing:
            override_config = existing[1] if isinstance(existing[1], dict) else json.loads(existing[1]) if existing[1] else {}
            override_config["max_collaborators_per_space"] = limit
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing[0], "config": json.dumps(override_config)},
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "tier": tier, "config": json.dumps({"max_collaborators_per_space": limit})},
            )

    print("  Added max_collaborators_per_space to spaces feature flag")


def downgrade() -> None:
    conn = op.get_bind()

    row = conn.execute(
        text("SELECT id, config FROM feature_flags WHERE slug = 'spaces'")
    ).fetchone()

    if not row:
        return

    flag_id = row[0]
    current_config = row[1] if isinstance(row[1], dict) else json.loads(row[1]) if row[1] else {}

    # Remove max_collaborators_per_space from global config
    current_config.pop("max_collaborators_per_space", None)
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = CAST(:config AS jsonb), updated_at = NOW()
            WHERE id = :flag_id
        """),
        {"flag_id": flag_id, "config": json.dumps(current_config)},
    )

    # Remove from tier overrides
    for tier in TIER_LIMITS:
        existing = conn.execute(
            text("""
                SELECT id, config_override FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier},
        ).fetchone()

        if existing:
            override_config = existing[1] if isinstance(existing[1], dict) else json.loads(existing[1]) if existing[1] else {}
            override_config.pop("max_collaborators_per_space", None)
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing[0], "config": json.dumps(override_config)},
            )

    print("  Removed max_collaborators_per_space from spaces feature flag")
