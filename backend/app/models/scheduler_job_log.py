"""Scheduler job log model for tracking scheduled job executions."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.core.database import Base


class SchedulerJobLog(Base):
    """Log entry for a scheduler job execution.

    Tracks when scheduled jobs run, their success/failure status,
    items processed, and any error information.
    """

    __tablename__ = "scheduler_job_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_name = Column(String(100), nullable=False)  # e.g., 'check_scheduled_activations'
    status = Column(String(20), nullable=False)  # 'started', 'completed', 'failed'
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    items_processed = Column(Integer, nullable=True, default=0)
    items_failed = Column(Integer, nullable=True, default=0)
    error_message = Column(Text, nullable=True)
    details = Column(JSONB, nullable=True)  # Flexible storage for job-specific data
    # Structure example:
    # {
    #   "conversations_found": 3,
    #   "conversation_ids": ["uuid1", "uuid2", "uuid3"]
    # }

    __table_args__ = (
        Index("idx_scheduler_job_logs_name", "job_name"),
        Index("idx_scheduler_job_logs_status", "status"),
        Index("idx_scheduler_job_logs_started_at", "started_at"),
        Index("idx_scheduler_job_logs_name_started", "job_name", "started_at"),
    )

    def __repr__(self):
        return f"<SchedulerJobLog(id={self.id}, job={self.job_name}, status={self.status})>"
