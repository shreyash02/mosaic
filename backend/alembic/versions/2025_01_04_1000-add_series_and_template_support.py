"""Add series table and template support

Revision ID: 2025_01_04_1000
Revises: 2025_12_31_0815
Create Date: 2025-01-04 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '2025_01_04_1000'
down_revision = '2025_12_31_0815'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add Series table and update Conversation model to support templates and series.
    
    Steps:
    1. Create series table
    2. Add is_template column to conversations
    3. Add template_series_id column to conversations
    4. Migrate existing template-based series to new Series table
    5. Update series_id foreign key to point to series table
    """
    # Step 1: Create series table
    op.create_table(
        'series',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('creator_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True), sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Step 2: Drop old foreign key and index for series_id BEFORE updating values
    # This is necessary because we'll be updating series_id to point to Series IDs,
    # but the old constraint still references conversations table
    op.drop_constraint('fk_conversations_series_id', 'conversations', type_='foreignkey')
    op.drop_index('idx_conversations_series_id', 'conversations')
    
    # Step 3: Add is_template column
    op.add_column('conversations', sa.Column('is_template', sa.Boolean(), nullable=False, server_default='false'))
    
    # Step 4: Add template_series_id column (nullable for now)
    op.add_column('conversations', sa.Column('template_series_id', UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'fk_conversations_template_series_id',
        'conversations', 'series',
        ['template_series_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_conversations_template_series_id', 'conversations', ['template_series_id'])

    # Step 5: Migrate existing templates to Series
    # Find templates: conversations with series_id = NULL and recurrence_pattern set
    # For each template, create a Series and set template_series_id
    connection = op.get_bind()
    
    # Get all templates (conversations that are templates based on old logic)
    templates_result = connection.execute(sa.text("""
        SELECT id, title, creator_id, organization_id, recurrence_pattern
        FROM conversations
        WHERE series_id IS NULL AND recurrence_pattern IS NOT NULL
    """))
    
    templates = templates_result.fetchall()
    
    for template in templates:
        template_id, title, creator_id, org_id, recurrence_pattern = template
        
        # Create a Series for this template
        series_id_result = connection.execute(sa.text("""
            INSERT INTO series (id, name, description, creator_id, organization_id, created_at, updated_at)
            VALUES (gen_random_uuid(), :title, :description, :creator_id, :org_id, now(), now())
            RETURNING id
        """), {
            'title': title,
            'description': f'Series for {title}',
            'creator_id': creator_id,
            'org_id': org_id
        })
        series_id = series_id_result.fetchone()[0]
        
        # Mark conversation as template and set template_series_id
        connection.execute(sa.text("""
            UPDATE conversations
            SET is_template = true, template_series_id = :series_id
            WHERE id = :template_id
        """), {
            'series_id': series_id,
            'template_id': template_id
        })
        
        # Update all instances of this template to point to the new Series
        # Instances are conversations with series_id pointing to the template
        connection.execute(sa.text("""
            UPDATE conversations
            SET series_id = :series_id
            WHERE series_id = :template_id
        """), {
            'series_id': series_id,
            'template_id': template_id
        })
    
    # Step 6: Clean up any remaining series_id values that don't have a corresponding Series
    # Any remaining series_id values that don't have a corresponding Series should be set to NULL
    connection.execute(sa.text("""
        UPDATE conversations
        SET series_id = NULL
        WHERE series_id IS NOT NULL
        AND series_id NOT IN (SELECT id FROM series)
    """))
    
    # Step 7: Create new foreign key to series table
    op.create_foreign_key(
        'fk_conversations_series_id',
        'conversations', 'series',
        ['series_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_conversations_series_id', 'conversations', ['series_id'])


def downgrade():
    """
    Revert changes: remove Series table and restore old series_id behavior.
    
    Note: This is a destructive downgrade that will lose Series data.
    """
    # Drop new foreign keys and indexes
    op.drop_constraint('fk_conversations_series_id', 'conversations', type_='foreignkey')
    op.drop_index('idx_conversations_series_id', 'conversations')
    op.drop_constraint('fk_conversations_template_series_id', 'conversations', type_='foreignkey')
    op.drop_index('idx_conversations_template_series_id', 'conversations')
    
    # Migrate Series back to old model (templates as series roots)
    connection = op.get_bind()
    
    # For each Series, find the template that references it
    # Set that template's series_id to NULL (it's the root)
    # Set all instances' series_id to point to the template
    series_result = connection.execute(sa.text("""
        SELECT s.id, s.name, c.id as template_id
        FROM series s
        JOIN conversations c ON c.template_series_id = s.id
    """))
    
    for series_row in series_result.fetchall():
        series_id, series_name, template_id = series_row
        
        # Update instances to point to template instead of series
        connection.execute(sa.text("""
            UPDATE conversations
            SET series_id = :template_id
            WHERE series_id = :series_id
        """), {
            'template_id': template_id,
            'series_id': series_id
        })
    
    # Drop columns
    op.drop_column('conversations', 'template_series_id')
    op.drop_column('conversations', 'is_template')
    
    # Drop series table
    op.drop_table('series')
    
    # Restore old foreign key (conversations.id -> conversations.id)
    op.create_foreign_key(
        'fk_conversations_series_id',
        'conversations', 'conversations',
        ['series_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_index('idx_conversations_series_id', 'conversations', ['series_id'])

