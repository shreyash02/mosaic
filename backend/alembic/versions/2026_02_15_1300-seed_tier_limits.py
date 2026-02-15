"""Seed tier limits for ai_analysis feature flag

Revision ID: seed_tier_limits
Revises: add_feature_tiers
Create Date: 2026-02-15 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'seed_tier_limits'
down_revision: Union[str, None] = 'add_feature_tiers'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Get the ai_analysis feature flag ID
    result = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = 'ai_analysis'")
    ).fetchone()

    if not result:
        # ai_analysis flag doesn't exist, skip
        print("ai_analysis feature flag not found, skipping tier limits setup")
        return

    flag_id = result[0]

    # Update global config with free tier limit (5 per month)
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = jsonb_set(
                COALESCE(config, '{}'::jsonb),
                '{analyses_per_month}',
                '5'::jsonb
            )
            WHERE slug = 'ai_analysis'
        """)
    )

    # Create tier-level overrides
    tier_limits = [
        ('basic', 20),
        ('pro', 100),
        ('enterprise', 1000),
    ]

    for tier, limit in tier_limits:
        # Check if override already exists
        existing = conn.execute(
            text("""
                SELECT id FROM feature_flag_overrides
                WHERE flag_id = :flag_id
                AND tier = :tier
                AND organization_id IS NULL
                AND user_id IS NULL
            """),
            {"flag_id": flag_id, "tier": tier}
        ).fetchone()

        if existing:
            # Update existing override
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = jsonb_set(
                        COALESCE(config_override, '{}'::jsonb),
                        '{analyses_per_month}',
                        :limit::jsonb
                    )
                    WHERE id = :id
                """),
                {"id": existing[0], "limit": str(limit)}
            )
        else:
            # Create new override
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (
                        gen_random_uuid(),
                        :flag_id,
                        :tier,
                        NULL,
                        NULL,
                        NULL,
                        jsonb_build_object('analyses_per_month', :limit),
                        NOW(),
                        NOW()
                    )
                """),
                {"flag_id": flag_id, "tier": tier, "limit": limit}
            )

    print("Tier limits configured:")
    print("  free (global default): 5 analyses/month")
    print("  basic: 20 analyses/month")
    print("  pro: 100 analyses/month")
    print("  enterprise: 1000 analyses/month")


def downgrade() -> None:
    conn = op.get_bind()

    # Get the ai_analysis feature flag ID
    result = conn.execute(
        text("SELECT id FROM feature_flags WHERE slug = 'ai_analysis'")
    ).fetchone()

    if not result:
        return

    flag_id = result[0]

    # Remove tier overrides
    conn.execute(
        text("""
            DELETE FROM feature_flag_overrides
            WHERE flag_id = :flag_id
            AND tier IN ('basic', 'pro', 'enterprise')
            AND organization_id IS NULL
            AND user_id IS NULL
        """),
        {"flag_id": flag_id}
    )

    # Remove analyses_per_month from global config
    conn.execute(
        text("""
            UPDATE feature_flags
            SET config = config - 'analyses_per_month'
            WHERE slug = 'ai_analysis'
        """)
    )
