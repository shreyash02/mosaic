"""Seed core feature flags

This migration creates all the standard feature flags for Mosaic.
It is idempotent - running it multiple times will not create duplicates.

Revision ID: seed_feature_flags
Revises: add_profile_image_url
Create Date: 2026-02-16 11:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'seed_feature_flags'
down_revision: Union[str, None] = 'add_profile_image_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# =============================================================================
# FEATURE FLAG DEFINITIONS
# =============================================================================
# Add new feature flags here. Each flag needs:
#   - slug: URL-friendly identifier (must be unique)
#   - name: Human-readable name
#   - description: What the feature does
#   - enabled: Default enabled state (usually True for core features)
#   - config: Default configuration (dict)
#   - tier_overrides: Optional tier-specific config overrides
#
# Tier hierarchy: free < basic < pro < enterprise
# Config values cascade - higher tiers inherit from lower unless overridden
# =============================================================================

FEATURE_FLAGS = [
    {
        "slug": "organizations",
        "name": "Organizations",
        "description": "Allow users to create and manage organizations with shared workspaces",
        "enabled": True,
        "config": {
            "max_orgs_per_user": -1,  # -1 = unlimited
            "max_members_per_org": -1,
        },
        "tier_overrides": {
            "free": {"max_orgs_per_user": 1, "max_members_per_org": 5},
            "basic": {"max_orgs_per_user": 3, "max_members_per_org": 20},
            "pro": {"max_orgs_per_user": 10, "max_members_per_org": 100},
            "enterprise": {"max_orgs_per_user": -1, "max_members_per_org": -1},
        },
    },
    {
        "slug": "templates",
        "name": "Templates",
        "description": "Allow users to create and use conversation templates",
        "enabled": True,
        "config": {
            "max_templates": -1,
        },
        "tier_overrides": {
            "free": {"max_templates": 5},
            "basic": {"max_templates": 25},
            "pro": {"max_templates": 100},
            "enterprise": {"max_templates": -1},
        },
    },
    {
        "slug": "collections",
        "name": "Collections",
        "description": "Allow users to organize conversations into collections",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "ai_analysis",
        "name": "AI Analysis",
        "description": "AI-powered analysis of conversation responses",
        "enabled": True,
        "config": {
            "model": "claude-sonnet",
            "include_themes": True,
            "include_surprising_insights": True,
            "analyses_per_month": 5,
        },
        "tier_overrides": {
            "free": {"analyses_per_month": 5},
            "basic": {"analyses_per_month": 20},
            "pro": {"analyses_per_month": 100},
            "enterprise": {"analyses_per_month": 1000},
        },
    },
    {
        "slug": "ai_question_suggestions",
        "name": "AI Question Suggestions",
        "description": "AI-powered suggestions for conversation questions",
        "enabled": True,
        "config": {
            "model": "claude-sonnet",
            "max_per_request": 5,
        },
    },
    {
        "slug": "conversations_limit",
        "name": "Conversations Limit",
        "description": "Limits on active conversations and responses",
        "enabled": True,
        "config": {
            "max_active": -1,
            "max_responses_per_conversation": -1,
        },
        "tier_overrides": {
            "free": {"max_active": 3, "max_responses_per_conversation": 50},
            "basic": {"max_active": 20, "max_responses_per_conversation": 200},
            "pro": {"max_active": 100, "max_responses_per_conversation": 1000},
            "enterprise": {"max_active": -1, "max_responses_per_conversation": -1},
        },
    },
    {
        "slug": "recurring_conversations",
        "name": "Recurring Conversations",
        "description": "Allow conversations to recur on a schedule",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "continuous_conversations",
        "name": "Continuous Conversations",
        "description": "Allow conversations without a closing date",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "anonymous_responses",
        "name": "Anonymous Responses",
        "description": "Allow conversations to accept anonymous responses",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "conversation_presets",
        "name": "Conversation Presets",
        "description": "Quick-start presets for common conversation types",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "series_analysis",
        "name": "Series Analysis",
        "description": "Analysis across multiple instances of recurring conversations",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "pdf_export",
        "name": "PDF Export",
        "description": "Export conversation results to PDF",
        "enabled": True,
        "config": {},
    },
    {
        "slug": "custom_branding",
        "name": "Custom Branding",
        "description": "Custom logo and branding for conversations",
        "enabled": True,
        "config": {
            "logo": True,
            "brand_name": True,
        },
        "tier_overrides": {
            "free": {"logo": False, "brand_name": False},
            "basic": {"logo": False, "brand_name": True},
            "pro": {"logo": True, "brand_name": True},
            "enterprise": {"logo": True, "brand_name": True},
        },
    },
    {
        "slug": "slack_integration",
        "name": "Slack Integration",
        "description": "Send notifications and updates to Slack channels",
        "enabled": True,
        "config": {},
        "tier_overrides": {
            "free": None,  # None = disabled for this tier
            "basic": {},
            "pro": {},
            "enterprise": {},
        },
    },
]


def upgrade() -> None:
    conn = op.get_bind()

    for flag in FEATURE_FLAGS:
        # Check if flag already exists
        existing = conn.execute(
            text("SELECT id FROM feature_flags WHERE slug = :slug"),
            {"slug": flag["slug"]}
        ).fetchone()

        if existing:
            flag_id = existing[0]
            print(f"  Feature flag '{flag['slug']}' already exists, updating config...")

            # Update the existing flag's config (merge with existing)
            conn.execute(
                text("""
                    UPDATE feature_flags
                    SET config = COALESCE(config, '{}'::jsonb) || CAST(:config AS jsonb),
                        description = COALESCE(:description, description),
                        updated_at = NOW()
                    WHERE slug = :slug
                """),
                {
                    "slug": flag["slug"],
                    "config": json.dumps(flag["config"]),
                    "description": flag.get("description"),
                }
            )
        else:
            print(f"  Creating feature flag '{flag['slug']}'...")

            # Insert new flag
            result = conn.execute(
                text("""
                    INSERT INTO feature_flags (id, name, slug, description, enabled, config, created_at, updated_at)
                    VALUES (gen_random_uuid(), :name, :slug, :description, :enabled, CAST(:config AS jsonb), NOW(), NOW())
                    RETURNING id
                """),
                {
                    "name": flag["name"],
                    "slug": flag["slug"],
                    "description": flag.get("description"),
                    "enabled": flag["enabled"],
                    "config": json.dumps(flag["config"]),
                }
            )
            flag_id = result.fetchone()[0]

        # Handle tier overrides
        tier_overrides = flag.get("tier_overrides", {})
        for tier, config_override in tier_overrides.items():
            # Check if tier override already exists
            existing_override = conn.execute(
                text("""
                    SELECT id FROM feature_flag_overrides
                    WHERE flag_id = :flag_id
                    AND tier = :tier
                    AND organization_id IS NULL
                    AND user_id IS NULL
                """),
                {"flag_id": flag_id, "tier": tier}
            ).fetchone()

            if config_override is None:
                # None means disable for this tier
                enabled_value = False
                config_value = None
            else:
                enabled_value = None  # Inherit from parent
                config_value = json.dumps(config_override) if config_override else None

            if existing_override:
                # Update existing override
                if config_override is None:
                    conn.execute(
                        text("""
                            UPDATE feature_flag_overrides
                            SET enabled = FALSE, config_override = NULL, updated_at = NOW()
                            WHERE id = :id
                        """),
                        {"id": existing_override[0]}
                    )
                elif config_override:
                    conn.execute(
                        text("""
                            UPDATE feature_flag_overrides
                            SET config_override = COALESCE(config_override, '{}'::jsonb) || CAST(:config AS jsonb),
                                updated_at = NOW()
                            WHERE id = :id
                        """),
                        {"id": existing_override[0], "config": config_value}
                    )
            else:
                # Create new override
                conn.execute(
                    text("""
                        INSERT INTO feature_flag_overrides
                        (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                        VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, :enabled, CAST(:config AS jsonb), NOW(), NOW())
                    """),
                    {
                        "flag_id": flag_id,
                        "tier": tier,
                        "enabled": enabled_value,
                        "config": config_value,
                    }
                )

    print(f"\nSeeded {len(FEATURE_FLAGS)} feature flags with tier overrides")


def downgrade() -> None:
    conn = op.get_bind()

    # Remove tier overrides for all our flags
    for flag in FEATURE_FLAGS:
        result = conn.execute(
            text("SELECT id FROM feature_flags WHERE slug = :slug"),
            {"slug": flag["slug"]}
        ).fetchone()

        if result:
            flag_id = result[0]

            # Remove tier overrides
            conn.execute(
                text("""
                    DELETE FROM feature_flag_overrides
                    WHERE flag_id = :flag_id
                    AND tier IS NOT NULL
                    AND organization_id IS NULL
                    AND user_id IS NULL
                """),
                {"flag_id": flag_id}
            )

    # Note: We don't delete the feature flags themselves on downgrade
    # as they may have been modified or have user/org overrides
    print("Removed tier overrides (feature flags retained)")
