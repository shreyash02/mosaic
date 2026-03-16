"""SpaceArtifact model — stores generated artifacts for a space."""

from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.core.database import Base


class SpaceArtifact(Base):
    """A generated artifact (summary, checklist, plan, etc.) for a space.

    Each artifact is tied to a synthesis checkpoint so it can be
    viewed in the context of the space's state at generation time.
    """

    __tablename__ = "space_artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    synthesis_id = Column(
        UUID(as_uuid=True),
        ForeignKey("space_syntheses.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    organize_run_id = Column(String(50), nullable=True)  # Which organize run this artifact belongs to
    artifact_type = Column(String(30), nullable=False)  # summary, checklist, plan, decision_brief, etc.
    title = Column(String(200), nullable=True)
    content = Column(JSONB, nullable=True, default=dict)
    user_context = Column(Text, nullable=True)  # Optional user-provided context for generation
    parent_id = Column(UUID(as_uuid=True), ForeignKey("space_artifacts.id", ondelete="CASCADE"), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    refinement = Column(Text, nullable=True)  # Refinement instructions used to generate this version
    refinement_summary = Column(String(60), nullable=True)  # LLM-generated short label
    status = Column(String(20), nullable=False, default="generating")  # generating, ready, failed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_space_artifacts_space", "space_id"),
        Index("idx_space_artifacts_synthesis", "synthesis_id"),
        Index("idx_space_artifacts_parent", "parent_id"),
    )

    def __repr__(self):
        return (
            f"<SpaceArtifact(id={self.id}, space_id={self.space_id}, "
            f"type={self.artifact_type}, status={self.status})>"
        )
