"""Conversation model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Conversation(Base):
    """Conversation model for collecting anonymous opinions or responses to questions/polls."""

    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=False, index=True)

    # Follow-up relationship
    parent_conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)

    # Template flag
    is_template = Column(Boolean, default=False, nullable=False)
    # True if this conversation is a template (can be used to create other conversations)

    # Series relationship (points to Series entity)
    series_id = Column(UUID(as_uuid=True), ForeignKey("series.id", ondelete="SET NULL"), nullable=True, index=True)
    # If set, this conversation belongs to a series

    # Template series relationship (only set on templates)
    template_series_id = Column(UUID(as_uuid=True), ForeignKey("series.id", ondelete="SET NULL"), nullable=True)
    # If set on a template, instances created from this template will join this series

    # Recurring conversation fields
    is_recurring_instance = Column(Boolean, default=False, nullable=False)
    # True if this was auto-created as part of a recurring series
    recurrence_pattern = Column(String(50), nullable=True)
    # 'weekly', 'biweekly', 'monthly', 'quarterly' - only set on template
    next_instance_date = Column(DateTime, nullable=True)
    # When to create the next instance - only set on template
    recurrence_end_date = Column(DateTime, nullable=True)
    # Optional end date for recurring series - only set on template
    recurrence_paused = Column(Boolean, default=False, nullable=False)
    # If True, automatic instance creation is paused (only set on template)

    # Basic info
    title = Column(String(500), nullable=False)
    participant_title = Column(String(500), nullable=True)
    # Optional participant-facing title. If not set, title will be used when participants view the conversation
    description = Column(Text, nullable=True)
    header_image_url = Column(String(500), nullable=True)
    # Optional header image URL displayed when users are responding

    # Context for AI analysis (visible to all result viewers for transparency)
    context_notes = Column(Text, nullable=True)
    # Free-form context from creator to help AI generate better insights
    # e.g., "Remote team of 12 engineers. New manager joined in January."
    context_notes_updated_at = Column(DateTime, nullable=True)

    # Branding (overrides organization branding if set)
    brand_logo_url = Column(String(500), nullable=True)
    brand_name = Column(String(255), nullable=True)

    # Access
    access_code = Column(String(50), unique=True, nullable=False, index=True)
    share_token = Column(UUID(as_uuid=True), unique=True, nullable=True, index=True)

    # Configuration
    anonymity_level = Column(String(50), nullable=False)
    # 'fully_anonymous', 'platform_tracked', 'revealable'

    max_response_length = Column(Integer, default=10000, nullable=False)

    results_access = Column(String(50), nullable=False)
    # 'creator_only', 'participants', 'public_link'

    show_verbatim_responses = Column(Boolean, default=False, nullable=False)
    # if true, raw responses are visible (along with analysis); if false, only AI summaries/themes shown

    invite_only = Column(Boolean, default=False, nullable=False)
    # if true, only invited users can access the conversation

    require_participant_codes = Column(Boolean, default=True, nullable=False)
    # Only meaningful for fully_anonymous conversations. If False, anyone with
    # the join link can respond without a participant code ("open link" mode).
    # Codeless conversations must have max_responses set.

    max_responses = Column(Integer, nullable=True)
    # Maximum number of submissions accepted (1-10000). Null = unlimited.
    # Required when fully_anonymous with require_participant_codes=False,
    # since there is no per-person anchor to bound abuse.

    allow_response_editing = Column(Boolean, default=False, nullable=False)
    # if true, participants can edit their submitted responses while conversation is active

    response_threshold = Column(Integer, nullable=True)
    # Minimum number of responses required before analysis can run.
    # Protects participant anonymity for anonymous/semi-anonymous conversations.
    # Auto-defaults to 3 for non-open conversations; None for open.

    auto_analyze = Column(Boolean, default=False, nullable=False)
    # if true, trigger analysis automatically when conversation closes
    auto_analyze_skipped = Column(Boolean, default=False, nullable=False)
    # if true, auto-analyze was skipped due to usage limit

    # Continuous conversation mode
    is_continuous = Column(Boolean, default=False, nullable=False)
    # True if this conversation stays open indefinitely for ongoing feedback collection

    # Periodic analysis configuration (only for continuous conversations)
    analysis_interval = Column(String(50), nullable=True)
    # 'daily', 'weekly', 'biweekly', 'monthly' - how often to run periodic analysis

    next_analysis_at = Column(DateTime, nullable=True)
    # When to run the next periodic analysis (stored in UTC)

    analysis_time_of_day = Column(String(5), nullable=True)
    # "HH:MM" 24h format. Null = default 09:00. When within each interval the analysis runs.

    analysis_day_of_week = Column(Integer, nullable=True)
    # 0=Mon..6=Sun. Used for weekly/biweekly intervals.

    analysis_day_of_month = Column(Integer, nullable=True)
    # 1-28. Used for monthly interval.

    analysis_timezone = Column(String(100), nullable=True)
    # Timezone for analysis window boundaries (e.g., "America/New_York")
    # If not set, falls back to conversation.timezone

    # Timing
    duration_minutes = Column(Integer, nullable=True)
    # Duration in minutes for which the conversation should remain open after activation
    scheduled_activate_at = Column(DateTime, nullable=True)
    # Scheduled activation time - conversation will be activated automatically at this time
    auto_close_at = Column(DateTime, nullable=True)
    manual_close_enabled = Column(Boolean, default=True, nullable=False)
    time_extension_enabled = Column(Boolean, default=True, nullable=False)
    
    # Timezone for datetime fields (IANA timezone name, e.g., "UTC", "America/New_York", "Asia/Kolkata")
    timezone = Column(String(100), nullable=True, default="UTC")

    # State
    state = Column(String(50), default="draft", nullable=False)
    # 'draft', 'active', 'closed', 'analyzing', 'analyzed', 'deleted'

    activated_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    analyzed_at = Column(DateTime, nullable=True)

    # Archiving
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime, nullable=True)

    # Slack channel notifications
    slack_channel_id = Column(String(50), nullable=True)
    # Slack channel ID to post notifications to (e.g., "C01234567")
    slack_channel_name = Column(String(255), nullable=True)
    # Display name of the channel (e.g., "#general")
    slack_notify_on_activate = Column(Boolean, default=False, nullable=False)
    # If True, post to channel when conversation is activated
    slack_notify_on_close = Column(Boolean, default=False, nullable=False)
    # If True, post to channel when conversation is closed
    slack_notify_on_analysis = Column(Boolean, default=False, nullable=False)
    # If True, post to channel when analysis is complete

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Full-text search vector (auto-populated by database trigger)
    search_vector = Column(TSVECTOR, nullable=True)

    # Relationships
    creator = relationship("User", back_populates="conversations", foreign_keys=[creator_id])
    organization = relationship("Organization", back_populates="conversations")
    workspace = relationship("Workspace")
    questions = relationship("Question", back_populates="conversation", cascade="all, delete-orphan", order_by="Question.question_order")
    responses = relationship("Response", back_populates="conversation", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="conversation", cascade="all, delete-orphan")
    participant_codes = relationship("ParticipantCode", back_populates="conversation", cascade="all, delete-orphan")
    invitations = relationship("ConversationInvitation", back_populates="conversation", cascade="all, delete-orphan")

    # Follow-up conversation relationships
    parent_conversation = relationship("Conversation", remote_side=[id], back_populates="follow_up_conversations", foreign_keys=[parent_conversation_id])
    follow_up_conversations = relationship("Conversation", back_populates="parent_conversation", foreign_keys="Conversation.parent_conversation_id")

    # Series relationships
    series = relationship("Series", back_populates="conversations", foreign_keys=[series_id])
    series_template_rel = relationship("Series", back_populates="templates", foreign_keys=[template_series_id])

    # Continuous conversation relationships
    periodic_analyses = relationship("PeriodicAnalysis", back_populates="conversation", cascade="all, delete-orphan", order_by="PeriodicAnalysis.period_start.desc()")
    continuous_trends = relationship("ContinuousTrends", back_populates="conversation", uselist=False, cascade="all, delete-orphan")

    # Journal relationships
    journal = relationship("Journal", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    journal_analyses = relationship("JournalAnalysis", back_populates="conversation", cascade="all, delete-orphan", order_by="JournalAnalysis.created_at.desc()")

    def __repr__(self):
        return f"<Conversation(id={self.id}, title={self.title}, state={self.state})>"
