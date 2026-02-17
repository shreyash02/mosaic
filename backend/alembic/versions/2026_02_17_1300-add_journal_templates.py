"""Add journal_templates table and seed 16 templates.

Creates the journal_templates table for admin-managed journal templates.
Seeds the 16 existing templates with corrected frequency defaults.

Revision ID: add_journal_templates
Revises: seed_journal_feature_flag
Create Date: 2026-02-17 13:00:00.000000

"""
from typing import Sequence, Union
import json
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = 'add_journal_templates'
down_revision: Union[str, None] = 'seed_journal_feature_flag'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Seed data: 16 templates matching the hardcoded ones in JournalCreatePage
SEED_TEMPLATES = [
    {
        "title": "Weekly Check-in",
        "emoji": "\U0001F4CB",
        "prompts": [
            {"text": "What went well this week?", "type": "text"},
            {"text": "What was challenging?", "type": "text"},
            {"text": "What do you want to focus on next week?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 0,
    },
    {
        "title": "Gratitude Log",
        "emoji": "\U0001F64F",
        "prompts": [
            {"text": "What are you grateful for today?", "type": "text"},
            {"text": "Who made a difference for you today?", "type": "text"},
        ],
        "entry_frequency": "daily",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 1,
    },
    {
        "title": "1:1 Reflections",
        "emoji": "\U0001F91D",
        "prompts": [
            {"text": "What do I want to discuss in my next 1:1?", "type": "text"},
            {"text": "What feedback do I want to share?", "type": "text"},
            {"text": "What support do I need?", "type": "text"},
            {"text": "What wins should I highlight?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 2,
    },
    {
        "title": "Mood Tracker",
        "emoji": "\U0001F60A",
        "prompts": [
            {"text": "How are you feeling right now?", "type": "rating"},
            {"text": "What's influencing your mood?", "type": "text"},
            {"text": "What would help you feel better?", "type": "text"},
        ],
        "entry_frequency": "daily",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 3,
    },
    {
        "title": "Career Growth",
        "emoji": "\U0001F680",
        "prompts": [
            {"text": "What skills am I developing?", "type": "text"},
            {"text": "What was my biggest professional win this period?", "type": "text"},
            {"text": "What would I do differently?", "type": "text"},
            {"text": "What's my next growth goal?", "type": "text"},
        ],
        "entry_frequency": "biweekly",
        "analysis_interval": "monthly",
        "strict_frequency": True,
        "display_order": 4,
    },
    {
        "title": "Learning Journal",
        "emoji": "\U0001F4DA",
        "prompts": [
            {"text": "What did I learn today?", "type": "text"},
            {"text": "How does this connect to what I already know?", "type": "text"},
            {"text": "How might I apply this?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 5,
    },
    {
        "title": "Decision Log",
        "emoji": "\U0001F914",
        "prompts": [
            {"text": "What decision did I make?", "type": "text"},
            {"text": "What factors did I consider?", "type": "text"},
            {"text": "What alternatives did I reject and why?", "type": "text"},
            {"text": "How do I feel about this decision?", "type": "text"},
        ],
        "entry_frequency": None,
        "analysis_interval": "monthly",
        "strict_frequency": True,
        "display_order": 6,
    },
    {
        "title": "Energy Audit",
        "emoji": "\u26A1",
        "prompts": [
            {"text": "What gave you energy today?", "type": "text"},
            {"text": "What drained your energy?", "type": "text"},
            {"text": "How would you rate your energy level?", "type": "rating"},
        ],
        "entry_frequency": "daily",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 7,
    },
    {
        "title": "Coaching Journal",
        "emoji": "\U0001F3AF",
        "prompts": [
            {"text": "What came up in my session?", "type": "text"},
            {"text": "What new insight did I gain?", "type": "text"},
            {"text": "What am I committing to before next session?", "type": "text"},
            {"text": "What resistance am I noticing?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "monthly",
        "strict_frequency": True,
        "display_order": 8,
    },
    {
        "title": "Project Retrospective",
        "emoji": "\U0001F504",
        "prompts": [
            {"text": "What progress was made?", "type": "text"},
            {"text": "What blocked progress?", "type": "text"},
            {"text": "What should change going forward?", "type": "text"},
            {"text": "What am I proud of?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 9,
    },
    {
        "title": "Mindfulness",
        "emoji": "\U0001F9D8",
        "prompts": [
            {"text": "What am I noticing right now?", "type": "text"},
            {"text": "What thoughts keep returning?", "type": "text"},
            {"text": "What am I choosing to let go of?", "type": "text"},
        ],
        "entry_frequency": "daily",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 10,
    },
    {
        "title": "Creative Practice",
        "emoji": "\U0001F3A8",
        "prompts": [
            {"text": "What did I create or work on?", "type": "text"},
            {"text": "What felt easy? What felt hard?", "type": "text"},
            {"text": "What do I want to try next?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "monthly",
        "strict_frequency": True,
        "display_order": 11,
    },
    {
        "title": "Reading Notes",
        "emoji": "\U0001F4D6",
        "prompts": [
            {"text": "What am I reading?", "type": "text"},
            {"text": "What passage or idea stood out?", "type": "text"},
            {"text": "How does this relate to my life or work?", "type": "text"},
        ],
        "entry_frequency": None,
        "analysis_interval": "monthly",
        "strict_frequency": True,
        "display_order": 12,
    },
    {
        "title": "Values Alignment",
        "emoji": "\U0001F9ED",
        "prompts": [
            {"text": "How did my actions align with my values today?", "type": "text"},
            {"text": "Where did I compromise?", "type": "text"},
            {"text": "What choice am I most proud of?", "type": "text"},
        ],
        "entry_frequency": "weekly",
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 13,
    },
    {
        "title": "Habit Tracker",
        "emoji": "\u2705",
        "prompts": [
            {"text": "Did you exercise today?", "type": "single_choice", "choices": ["Yes", "No"]},
            {"text": "Did you eat all your meals?", "type": "single_choice", "choices": ["Yes", "No"]},
            {"text": "Did you get enough sleep?", "type": "single_choice", "choices": ["Yes", "No"]},
            {"text": "How was your day?", "type": "text"},
        ],
        "entry_frequency": "daily",
        "analysis_interval": "daily",
        "strict_frequency": True,
        "display_order": 14,
    },
    {
        "title": "Free Writing",
        "emoji": "\u270D\uFE0F",
        "prompts": [
            {"text": "Write about anything. No rules, no structure.", "type": "text"},
        ],
        "entry_frequency": None,
        "analysis_interval": "weekly",
        "strict_frequency": True,
        "display_order": 15,
    },
]


def upgrade() -> None:
    # Create journal_templates table
    op.create_table(
        'journal_templates',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('emoji', sa.String(10), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('prompts', JSONB, nullable=False),
        sa.Column('entry_frequency', sa.String(50), nullable=True),
        sa.Column('analysis_interval', sa.String(50), nullable=False, server_default='weekly'),
        sa.Column('strict_frequency', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Seed templates
    conn = op.get_bind()
    for tmpl in SEED_TEMPLATES:
        conn.execute(
            text("""
                INSERT INTO journal_templates (id, title, emoji, prompts, entry_frequency,
                    analysis_interval, strict_frequency, display_order, is_active,
                    created_at, updated_at)
                VALUES (:id, :title, :emoji, CAST(:prompts AS jsonb), :entry_frequency,
                    :analysis_interval, :strict_frequency, :display_order, true,
                    now(), now())
            """),
            {
                "id": str(uuid.uuid4()),
                "title": tmpl["title"],
                "emoji": tmpl["emoji"],
                "prompts": json.dumps(tmpl["prompts"]),
                "entry_frequency": tmpl["entry_frequency"],
                "analysis_interval": tmpl["analysis_interval"],
                "strict_frequency": tmpl["strict_frequency"],
                "display_order": tmpl["display_order"],
            }
        )


def downgrade() -> None:
    op.drop_table('journal_templates')
