"""Add full-text search support

Revision ID: add_full_text_search
Revises: add_password_reset_fields
Create Date: 2026-02-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR


# revision identifiers, used by Alembic.
revision: str = 'add_full_text_search'
down_revision: Union[str, None] = 'add_password_reset_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ====================
    # CONVERSATIONS TABLE
    # ====================

    # Add search_vector column
    op.add_column('conversations',
        sa.Column('search_vector', TSVECTOR(), nullable=True)
    )

    # Create GIN index for fast searching
    op.create_index(
        'idx_conversations_search_vector',
        'conversations',
        ['search_vector'],
        postgresql_using='gin'
    )

    # Create trigger function for conversations
    op.execute("""
        CREATE OR REPLACE FUNCTION conversations_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger
    op.execute("""
        CREATE TRIGGER conversations_search_vector_trigger
        BEFORE INSERT OR UPDATE OF title, description
        ON conversations
        FOR EACH ROW
        EXECUTE FUNCTION conversations_search_vector_update();
    """)

    # Populate existing records
    op.execute("""
        UPDATE conversations
        SET search_vector =
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(description, '')), 'B');
    """)

    # ====================
    # SERIES TABLE
    # ====================

    # Add search_vector column
    op.add_column('series',
        sa.Column('search_vector', TSVECTOR(), nullable=True)
    )

    # Create GIN index
    op.create_index(
        'idx_series_search_vector',
        'series',
        ['search_vector'],
        postgresql_using='gin'
    )

    # Create trigger function for series
    op.execute("""
        CREATE OR REPLACE FUNCTION series_search_vector_update() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger
    op.execute("""
        CREATE TRIGGER series_search_vector_trigger
        BEFORE INSERT OR UPDATE OF name, description
        ON series
        FOR EACH ROW
        EXECUTE FUNCTION series_search_vector_update();
    """)

    # Populate existing records
    op.execute("""
        UPDATE series
        SET search_vector =
            setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(description, '')), 'B');
    """)

    # ====================
    # ANALYSES TABLE
    # ====================

    # Add search_vector column
    op.add_column('analyses',
        sa.Column('search_vector', TSVECTOR(), nullable=True)
    )

    # Create GIN index
    op.create_index(
        'idx_analyses_search_vector',
        'analyses',
        ['search_vector'],
        postgresql_using='gin'
    )

    # Create helper function to extract text from JSONB fields
    # Structure of question_analyses: [{"question_text": "...", "themes": [{"theme": "...", "summary": "..."}], "summary": "..."}]
    # Structure of surprising_insights: [{"title": "...", "description": "..."}]
    op.execute("""
        CREATE OR REPLACE FUNCTION extract_analysis_text(
            overall_summary TEXT,
            themes JSONB,
            question_analyses JSONB,
            surprising_insights JSONB
        ) RETURNS TEXT AS $$
        DECLARE
            result TEXT := '';
            theme_record JSONB;
            qa_record JSONB;
            insight_record JSONB;
            inner_theme JSONB;
        BEGIN
            -- Add overall summary
            result := COALESCE(overall_summary, '');

            -- Extract from themes array (deprecated but might have data)
            IF themes IS NOT NULL AND jsonb_typeof(themes) = 'array' THEN
                FOR theme_record IN SELECT * FROM jsonb_array_elements(themes)
                LOOP
                    result := result || ' ' || COALESCE(theme_record->>'theme', '');
                    result := result || ' ' || COALESCE(theme_record->>'summary', '');
                END LOOP;
            END IF;

            -- Extract from question_analyses array
            IF question_analyses IS NOT NULL AND jsonb_typeof(question_analyses) = 'array' THEN
                FOR qa_record IN SELECT * FROM jsonb_array_elements(question_analyses)
                LOOP
                    result := result || ' ' || COALESCE(qa_record->>'question_text', '');
                    result := result || ' ' || COALESCE(qa_record->>'summary', '');

                    -- Extract themes within question analysis
                    IF qa_record->'themes' IS NOT NULL AND jsonb_typeof(qa_record->'themes') = 'array' THEN
                        FOR inner_theme IN SELECT * FROM jsonb_array_elements(qa_record->'themes')
                        LOOP
                            result := result || ' ' || COALESCE(inner_theme->>'theme', '');
                            result := result || ' ' || COALESCE(inner_theme->>'summary', '');
                        END LOOP;
                    END IF;
                END LOOP;
            END IF;

            -- Extract from surprising_insights array
            IF surprising_insights IS NOT NULL AND jsonb_typeof(surprising_insights) = 'array' THEN
                FOR insight_record IN SELECT * FROM jsonb_array_elements(surprising_insights)
                LOOP
                    result := result || ' ' || COALESCE(insight_record->>'title', '');
                    result := result || ' ' || COALESCE(insight_record->>'description', '');
                END LOOP;
            END IF;

            RETURN result;
        END
        $$ LANGUAGE plpgsql IMMUTABLE;
    """)

    # Create trigger function for analyses
    op.execute("""
        CREATE OR REPLACE FUNCTION analyses_search_vector_update() RETURNS trigger AS $$
        DECLARE
            extracted_text TEXT;
        BEGIN
            extracted_text := extract_analysis_text(
                NEW.overall_summary,
                NEW.themes,
                NEW.question_analyses,
                NEW.surprising_insights
            );

            NEW.search_vector :=
                setweight(to_tsvector('english', COALESCE(NEW.overall_summary, '')), 'A') ||
                setweight(to_tsvector('english', extracted_text), 'B');
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger
    op.execute("""
        CREATE TRIGGER analyses_search_vector_trigger
        BEFORE INSERT OR UPDATE OF overall_summary, themes, question_analyses, surprising_insights
        ON analyses
        FOR EACH ROW
        EXECUTE FUNCTION analyses_search_vector_update();
    """)

    # Populate existing records
    op.execute("""
        UPDATE analyses
        SET search_vector =
            setweight(to_tsvector('english', COALESCE(overall_summary, '')), 'A') ||
            setweight(to_tsvector('english', extract_analysis_text(
                overall_summary, themes, question_analyses, surprising_insights
            )), 'B');
    """)


def downgrade() -> None:
    # Drop triggers and functions for analyses
    op.execute("DROP TRIGGER IF EXISTS analyses_search_vector_trigger ON analyses")
    op.execute("DROP FUNCTION IF EXISTS analyses_search_vector_update()")
    op.execute("DROP FUNCTION IF EXISTS extract_analysis_text(TEXT, JSONB, JSONB, JSONB)")
    op.drop_index('idx_analyses_search_vector', 'analyses')
    op.drop_column('analyses', 'search_vector')

    # Drop triggers and functions for series
    op.execute("DROP TRIGGER IF EXISTS series_search_vector_trigger ON series")
    op.execute("DROP FUNCTION IF EXISTS series_search_vector_update()")
    op.drop_index('idx_series_search_vector', 'series')
    op.drop_column('series', 'search_vector')

    # Drop triggers and functions for conversations
    op.execute("DROP TRIGGER IF EXISTS conversations_search_vector_trigger ON conversations")
    op.execute("DROP FUNCTION IF EXISTS conversations_search_vector_update()")
    op.drop_index('idx_conversations_search_vector', 'conversations')
    op.drop_column('conversations', 'search_vector')
