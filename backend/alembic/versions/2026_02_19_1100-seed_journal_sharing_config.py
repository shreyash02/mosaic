"""Seed journal sharing config into existing journals feature flag.

Adds sharing-related config keys to the 'journals' feature flag:
- max_shares_per_journal: free=0, basic=2, pro=5, enterprise=-1
- allowed_share_types: free=[], basic=["analysis_only"], pro/enterprise=["analysis_only","full"]
- share_expiration_enabled: free=false, basic=false, pro/enterprise=true

Revision ID: seed_journal_sharing_config
Revises: add_journal_shares
Create Date: 2026-02-19 11:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = "seed_journal_sharing_config"
down_revision: Union[str, None] = "add_journal_shares"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# New config keys to merge into the existing journals flag
SHARING_DEFAULTS = {
    "max_shares_per_journal": 0,
    "allowed_share_types": [],
    "share_expiration_enabled": False,
}

TIER_SHARING_CONFIG = {
    "free": {
        "max_shares_per_journal": 0,
        "allowed_share_types": [],
        "share_expiration_enabled": False,
    },
    "basic": {
        "max_shares_per_journal": 2,
        "allowed_share_types": ["analysis_only"],
        "share_expiration_enabled": False,
    },
    "pro": {
        "max_shares_per_journal": 5,
        "allowed_share_types": ["analysis_only", "full"],
        "share_expiration_enabled": True,
    },
    "enterprise": {
        "max_shares_per_journal": -1,
        "allowed_share_types": ["analysis_only", "full"],
        "share_expiration_enabled": True,
    },
}


def upgrade() -> None:
    conn = op.get_bind()

    # Get existing flag
    result = conn.execute(
        text("SELECT id, config FROM feature_flags WHERE slug = 'journals'")
    ).fetchone()

    if not result:
        print("  WARNING: 'journals' feature flag not found, skipping sharing config seed")
        return

    flag_id = result[0]
    existing_config = result[1] or {}

    # Merge sharing defaults into global config
    updated_config = {**existing_config, **SHARING_DEFAULTS}
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = CAST(:config AS jsonb),
                updated_at = NOW()
            WHERE id = :flag_id
        """),
        {"flag_id": flag_id, "config": json.dumps(updated_config)}
    )

    # Merge sharing config into each tier override
    for tier, sharing_config in TIER_SHARING_CONFIG.items():
        existing_override = conn.execute(
            text("""
                SELECT id, config_override FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier}
        ).fetchone()

        if existing_override:
            existing_tier_config = existing_override[1] or {}
            merged = {**existing_tier_config, **sharing_config}
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": existing_override[0], "config": json.dumps(merged)}
            )
        else:
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "tier": tier, "config": json.dumps(sharing_config)}
            )

    print("  Seeded journal sharing config into 'journals' feature flag")


def downgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        text("SELECT id, config FROM feature_flags WHERE slug = 'journals'")
    ).fetchone()

    if not result:
        return

    flag_id = result[0]
    existing_config = result[1] or {}

    # Remove sharing keys from global config
    for key in SHARING_DEFAULTS:
        existing_config.pop(key, None)

    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = CAST(:config AS jsonb), updated_at = NOW()
            WHERE id = :flag_id
        """),
        {"flag_id": flag_id, "config": json.dumps(existing_config)}
    )

    # Remove sharing keys from tier overrides
    for tier in TIER_SHARING_CONFIG:
        override = conn.execute(
            text("""
                SELECT id, config_override FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = :tier
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier}
        ).fetchone()

        if override:
            tier_config = override[1] or {}
            for key in TIER_SHARING_CONFIG[tier]:
                tier_config.pop(key, None)
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": override[0], "config": json.dumps(tier_config)}
            )

    print("  Removed journal sharing config from 'journals' feature flag")
