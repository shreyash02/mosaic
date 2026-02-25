"""Loosen free tier limits for pre-payment adoption phase.

Before payment integration is live, we want generous free tier limits to
maximize adoption. These can be tightened once Stripe/Razorpay is integrated.

Changes:
  conversations_limit: max_active 3->10, max_responses 50->100
  ai_analysis: analyses_per_month 5->15
  journals: max_journals 3->5, max_entries 100->200, analyses 4->10
  spaces: max_spaces 1->3, max_ideas 50->100, max_collaborators 0->2
  templates: max_templates 5->10

Revision ID: loosen_free_tier_limits
Revises: add_space_collaborator_limits
Create Date: 2026-02-25 14:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = "loosen_free_tier_limits"
down_revision: Union[str, None] = "add_space_collaborator_limits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# New generous free-tier values (old -> new)
FREE_TIER_UPDATES = {
    "conversations_limit": {
        "max_active": 10,                       # was 3
        "max_responses_per_conversation": 100,   # was 50
    },
    "ai_analysis": {
        "analyses_per_month": 15,                # was 5
    },
    "journals": {
        "max_journals": 5,                       # was 3
        "max_entries_per_journal": 200,           # was 100
        "journal_analyses_per_month": 10,         # was 4
    },
    "spaces": {
        "max_spaces": 3,                         # was 1
        "max_ideas_per_space": 100,              # was 50
        "max_collaborators_per_space": 2,         # was 0
    },
    "templates": {
        "max_templates": 10,                     # was 5
    },
}

# Previous values for downgrade
OLD_FREE_TIER_VALUES = {
    "conversations_limit": {
        "max_active": 3,
        "max_responses_per_conversation": 50,
    },
    "ai_analysis": {
        "analyses_per_month": 5,
    },
    "journals": {
        "max_journals": 3,
        "max_entries_per_journal": 100,
        "journal_analyses_per_month": 4,
    },
    "spaces": {
        "max_spaces": 1,
        "max_ideas_per_space": 50,
        "max_collaborators_per_space": 0,
    },
    "templates": {
        "max_templates": 5,
    },
}


def _apply_free_tier_values(conn, values: dict) -> None:
    """Update the free tier override for each feature flag with the given values."""
    for slug, config_updates in values.items():
        # Get the flag ID
        row = conn.execute(
            text("SELECT id FROM feature_flags WHERE slug = :slug"),
            {"slug": slug},
        ).fetchone()

        if not row:
            print(f"  WARNING: Feature flag '{slug}' not found, skipping")
            continue

        flag_id = row[0]

        # Also update the global default config for ai_analysis since it sets
        # analyses_per_month at the global level too
        if slug == "ai_analysis":
            conn.execute(
                text("""
                    UPDATE feature_flags
                    SET config = jsonb_set(
                        COALESCE(config, '{}'::jsonb),
                        '{analyses_per_month}',
                        CAST(:val AS jsonb)
                    ),
                    updated_at = NOW()
                    WHERE slug = 'ai_analysis'
                """),
                {"val": str(config_updates["analyses_per_month"])},
            )

        # Find the free tier override
        override_row = conn.execute(
            text("""
                SELECT id, config_override FROM feature_flag_overrides
                WHERE flag_id = :flag_id AND tier = 'free'
                AND organization_id IS NULL AND user_id IS NULL
            """),
            {"flag_id": flag_id},
        ).fetchone()

        if override_row:
            # Merge new values into existing override config
            existing_config = (
                override_row[1]
                if isinstance(override_row[1], dict)
                else json.loads(override_row[1])
                if override_row[1]
                else {}
            )
            existing_config.update(config_updates)
            conn.execute(
                text("""
                    UPDATE feature_flag_overrides
                    SET config_override = CAST(:config AS jsonb), updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": override_row[0], "config": json.dumps(existing_config)},
            )
            print(f"  Updated free tier for '{slug}': {config_updates}")
        else:
            # Create new free tier override
            conn.execute(
                text("""
                    INSERT INTO feature_flag_overrides
                    (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                    VALUES (gen_random_uuid(), :flag_id, 'free', NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                """),
                {"flag_id": flag_id, "config": json.dumps(config_updates)},
            )
            print(f"  Created free tier override for '{slug}': {config_updates}")


def upgrade() -> None:
    conn = op.get_bind()
    print("Loosening free tier limits for adoption phase...")
    _apply_free_tier_values(conn, FREE_TIER_UPDATES)
    print("Done. Free tier limits updated.")


def downgrade() -> None:
    conn = op.get_bind()
    print("Reverting free tier limits to previous values...")
    _apply_free_tier_values(conn, OLD_FREE_TIER_VALUES)
    print("Done. Free tier limits reverted.")
