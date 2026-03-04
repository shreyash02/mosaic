"""Gate features for progressive launch rollout.

Disables Phase 2-4 features globally so they can be revealed incrementally
after launch based on platform-wide usage patterns.

Phase 1 (Launch): conversations, ai_analysis, anonymous_responses,
                   conversation_presets, ai_question_suggestions
Phase 2 (Week 2-3): ai_suggested_actions, templates, collections
Phase 3 (Week 4-6): recurring_conversations, continuous_conversations,
                     journals, pdf_export
Phase 4 (Week 8+): series_analysis, spaces, slack_integration,
                    custom_branding

To reveal a phase, flip enabled=true via admin API:
  PATCH /api/admin/feature-flags/{slug}  {"enabled": true}

Revision ID: gate_progressive_launch
Revises: relax_personal_ws_uniqueness
Create Date: 2026-02-27 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy.sql import text


revision: str = 'gate_progressive_launch'
down_revision: Union[str, None] = 'relax_personal_ws_uniqueness'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Features to gate at launch, grouped by reveal phase
GATED_FEATURES = {
    # Phase 2 (Week 2-3): Deepen the core loop
    "phase_2": [
        "ai_suggested_actions",
        "templates",
        "collections",
    ],
    # Phase 3 (Week 4-6): Power user patterns
    "phase_3": [
        "recurring_conversations",
        "continuous_conversations",
        "journals",
        "pdf_export",
    ],
    # Phase 4 (Week 8+): Full platform
    "phase_4": [
        "series_analysis",
        "spaces",
        "slack_integration",
        "custom_branding",
    ],
}

ALL_GATED_SLUGS = [
    slug
    for phase_slugs in GATED_FEATURES.values()
    for slug in phase_slugs
]


def upgrade() -> None:
    conn = op.get_bind()

    for slug in ALL_GATED_SLUGS:
        result = conn.execute(
            text("SELECT id, enabled FROM feature_flags WHERE slug = :slug"),
            {"slug": slug}
        ).fetchone()

        if result:
            conn.execute(
                text("""
                    UPDATE feature_flags
                    SET enabled = false, updated_at = NOW()
                    WHERE slug = :slug
                """),
                {"slug": slug}
            )
            print(f"  Gated feature '{slug}' (was enabled={result[1]})")
        else:
            print(f"  WARNING: Feature flag '{slug}' not found, skipping")

    print(f"  Gated {len(ALL_GATED_SLUGS)} features for progressive launch rollout")


def downgrade() -> None:
    conn = op.get_bind()

    for slug in ALL_GATED_SLUGS:
        conn.execute(
            text("""
                UPDATE feature_flags
                SET enabled = true, updated_at = NOW()
                WHERE slug = :slug
            """),
            {"slug": slug}
        )
        print(f"  Re-enabled feature '{slug}'")

    print(f"  Re-enabled {len(ALL_GATED_SLUGS)} features")
