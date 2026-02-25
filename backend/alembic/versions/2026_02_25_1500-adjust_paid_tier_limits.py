"""Adjust basic and pro tier limits to maintain clear upgrade incentives.

After loosening free tier limits, basic and pro need to scale up
proportionally to preserve meaningful tier progression.

Changes (basic):
  conversations_limit: max_active 20->30, max_responses 200->500
  ai_analysis: analyses_per_month 20->50
  journals: max_journals 10->15, max_entries 500->1000, analyses 15->30
  spaces: max_spaces 3->10, max_ideas 200->500, max_collaborators 3->10
  templates: max_templates 25->50

Changes (pro):
  conversations_limit: max_active 100->unlimited, max_responses 1000->unlimited
  ai_analysis: analyses_per_month 100->500
  journals: max_journals 50->unlimited, max_entries unlimited, analyses unlimited
  spaces: max_spaces 10->50, max_ideas 1000->5000, max_collaborators 7->25
  templates: max_templates 100->500

Revision ID: adjust_paid_tier_limits
Revises: loosen_free_tier_limits
Create Date: 2026-02-25 15:00:00.000000

"""
from typing import Sequence, Union
import json

from alembic import op
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = "adjust_paid_tier_limits"
down_revision: Union[str, None] = "loosen_free_tier_limits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = {
    "basic": {
        "conversations_limit": {
            "max_active": 30,
            "max_responses_per_conversation": 500,
        },
        "ai_analysis": {
            "analyses_per_month": 50,
        },
        "journals": {
            "max_journals": 15,
            "max_entries_per_journal": 1000,
            "journal_analyses_per_month": 30,
        },
        "spaces": {
            "max_spaces": 10,
            "max_ideas_per_space": 500,
            "max_collaborators_per_space": 10,
        },
        "templates": {
            "max_templates": 50,
        },
    },
    "pro": {
        "conversations_limit": {
            "max_active": -1,
            "max_responses_per_conversation": -1,
        },
        "ai_analysis": {
            "analyses_per_month": 500,
        },
        "journals": {
            "max_journals": -1,
            "max_entries_per_journal": -1,
            "journal_analyses_per_month": -1,
        },
        "spaces": {
            "max_spaces": 50,
            "max_ideas_per_space": 5000,
            "max_collaborators_per_space": 25,
        },
        "templates": {
            "max_templates": 500,
        },
    },
}

OLD_VALUES = {
    "basic": {
        "conversations_limit": {
            "max_active": 20,
            "max_responses_per_conversation": 200,
        },
        "ai_analysis": {
            "analyses_per_month": 20,
        },
        "journals": {
            "max_journals": 10,
            "max_entries_per_journal": 500,
            "journal_analyses_per_month": 15,
        },
        "spaces": {
            "max_spaces": 3,
            "max_ideas_per_space": 200,
            "max_collaborators_per_space": 3,
        },
        "templates": {
            "max_templates": 25,
        },
    },
    "pro": {
        "conversations_limit": {
            "max_active": 100,
            "max_responses_per_conversation": 1000,
        },
        "ai_analysis": {
            "analyses_per_month": 100,
        },
        "journals": {
            "max_journals": 50,
            "max_entries_per_journal": -1,
            "journal_analyses_per_month": -1,
        },
        "spaces": {
            "max_spaces": 10,
            "max_ideas_per_space": 1000,
            "max_collaborators_per_space": 7,
        },
        "templates": {
            "max_templates": 100,
        },
    },
}


def _apply_tier_values(conn, tier_map: dict) -> None:
    for tier, flags in tier_map.items():
        for slug, config_updates in flags.items():
            row = conn.execute(
                text("SELECT id FROM feature_flags WHERE slug = :slug"),
                {"slug": slug},
            ).fetchone()

            if not row:
                print(f"  WARNING: Feature flag '{slug}' not found, skipping")
                continue

            flag_id = row[0]

            override_row = conn.execute(
                text("""
                    SELECT id, config_override FROM feature_flag_overrides
                    WHERE flag_id = :flag_id AND tier = :tier
                    AND organization_id IS NULL AND user_id IS NULL
                """),
                {"flag_id": flag_id, "tier": tier},
            ).fetchone()

            if override_row:
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
            else:
                conn.execute(
                    text("""
                        INSERT INTO feature_flag_overrides
                        (id, flag_id, tier, organization_id, user_id, enabled, config_override, created_at, updated_at)
                        VALUES (gen_random_uuid(), :flag_id, :tier, NULL, NULL, NULL, CAST(:config AS jsonb), NOW(), NOW())
                    """),
                    {"flag_id": flag_id, "tier": tier, "config": json.dumps(config_updates)},
                )

            print(f"  {tier} / {slug}: {config_updates}")


def upgrade() -> None:
    conn = op.get_bind()
    print("Adjusting basic and pro tier limits...")
    _apply_tier_values(conn, NEW_VALUES)
    print("Done.")


def downgrade() -> None:
    conn = op.get_bind()
    print("Reverting basic and pro tier limits...")
    _apply_tier_values(conn, OLD_VALUES)
    print("Done.")
