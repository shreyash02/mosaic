"""Insight annotation routes."""

import logging
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.analysis import Analysis
from app.models.conversation import Conversation
from app.models.insight_annotation import InsightAnnotation
from app.models.user import User
from app.schemas.insight_annotation import (
    AnnotationResponse,
    AnnotationsListResponse,
    UpsertAnnotationRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _check_creator_access(
    conversation_id: UUID,
    analysis_id: UUID,
    current_user: User,
    db: Session,
) -> tuple[Conversation, Analysis]:
    """Verify user is the conversation creator and return (conversation, analysis)."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if conversation.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the conversation creator can manage annotations")

    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.conversation_id == conversation_id,
    ).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return conversation, analysis


@router.get(
    "/conversations/{conversation_id}/analyses/{analysis_id}/annotations",
    response_model=AnnotationsListResponse,
)
async def get_annotations(
    conversation_id: UUID,
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all annotations for the current user on this analysis. Creator-only."""
    _check_creator_access(conversation_id, analysis_id, current_user, db)

    annotations = db.query(InsightAnnotation).filter(
        InsightAnnotation.analysis_id == analysis_id,
        InsightAnnotation.user_id == current_user.id,
    ).order_by(InsightAnnotation.created_at).all()

    return AnnotationsListResponse(
        analysis_id=analysis_id,
        annotations=annotations,
        total=len(annotations),
    )


@router.put(
    "/conversations/{conversation_id}/analyses/{analysis_id}/annotations",
    response_model=AnnotationResponse,
)
@limiter.limit("30/minute")
async def upsert_annotation(
    request: Request,
    conversation_id: UUID,
    analysis_id: UUID,
    body: UpsertAnnotationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update an annotation. Creator-only."""
    _check_creator_access(conversation_id, analysis_id, current_user, db)

    # Find existing annotation by composite key
    existing = db.query(InsightAnnotation).filter(
        InsightAnnotation.analysis_id == analysis_id,
        InsightAnnotation.user_id == current_user.id,
        InsightAnnotation.target_type == body.target_type.value,
        InsightAnnotation.target_key == body.target_key,
    ).first()

    if existing:
        # Update existing
        if body.starred is not None:
            existing.starred = body.starred
        if body.note is not None:
            existing.note = body.note if body.note.strip() else None

        # Auto-delete if both starred=false and note is empty
        if not existing.starred and not existing.note:
            db.delete(existing)
            db.commit()
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Determine values for new annotation
        starred = body.starred if body.starred is not None else False
        note = body.note.strip() if body.note and body.note.strip() else None

        # Don't create an empty annotation
        if not starred and not note:
            raise HTTPException(status_code=status.HTTP_204_NO_CONTENT)

        annotation = InsightAnnotation(
            id=uuid4(),
            analysis_id=analysis_id,
            user_id=current_user.id,
            target_type=body.target_type.value,
            target_key=body.target_key,
            starred=starred,
            note=note,
            created_at=datetime.utcnow(),
        )
        db.add(annotation)
        db.commit()
        db.refresh(annotation)
        return annotation


@router.delete(
    "/conversations/{conversation_id}/analyses/{analysis_id}/annotations/{annotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_annotation(
    conversation_id: UUID,
    analysis_id: UUID,
    annotation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an annotation. Creator-only."""
    _check_creator_access(conversation_id, analysis_id, current_user, db)

    annotation = db.query(InsightAnnotation).filter(
        InsightAnnotation.id == annotation_id,
        InsightAnnotation.analysis_id == analysis_id,
        InsightAnnotation.user_id == current_user.id,
    ).first()
    if not annotation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Annotation not found")

    db.delete(annotation)
    db.commit()
