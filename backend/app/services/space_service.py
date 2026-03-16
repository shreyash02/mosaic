"""Service layer for Spaces: embedding, classification, clustering, and graph data."""

import json
import logging
import time
from itertools import combinations
from typing import List, Dict, Any, Optional, Set
from uuid import UUID, uuid4

import numpy as np
from openai import OpenAI
from anthropic import Anthropic
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import settings
from app.models.space import Space
from app.models.idea import Idea
from app.models.theme import Theme
from app.models.idea_theme import IdeaTheme
from app.models.theme_connection import ThemeConnection
from app.models.theme_event import ThemeEvent
from app.services.llm_usage_service import log_llm_usage

logger = logging.getLogger(__name__)

# Default theme colors palette
THEME_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#E11D48", "#7C3AED", "#0EA5E9", "#D946EF",
]


class SpaceService:
    """Service for managing space ideas, themes, and graph data."""

    SIMILARITY_THRESHOLD = 0.75
    SECONDARY_THRESHOLD = 0.65
    RESCUE_THRESHOLD = 0.45
    CONNECTION_THRESHOLD = 0.3

    # Auto-organize tunable parameters
    FIRST_ORGANIZE_THRESHOLD = 5
    COOLDOWN_MINUTES = 30
    NEW_IDEA_WEIGHT = 2
    UNTHEMED_WEIGHT = 3
    STALENESS_WEIGHT = 1
    STALENESS_CAP_HOURS = 48
    NOTE_FEEDBACK_WEIGHT = 4
    AUTO_ORGANIZE_SCORE_THRESHOLD = 15

    def __init__(self, model: str = "claude-sonnet-4-5-20250929"):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.embedding_model = "text-embedding-3-large"
        self.llm_model = model

    @staticmethod
    def save_synthesis_actions(db: Session, space: "Space"):
        """Persist completed/dismissed synthesis notes before synthesis replacement.

        Reads current SpaceSynthesis row, finds notes with completed or
        dismissed states, resolves theme names from current Theme rows, and
        inserts SynthesisAction rows. Deduplicates by checking for identical
        note_text + action + theme_name created within the last minute.
        """
        from datetime import datetime, timedelta
        from app.models.synthesis_action import SynthesisAction
        from app.models.space_synthesis import SpaceSynthesis

        synthesis_row = (
            db.query(SpaceSynthesis)
            .filter(
                SpaceSynthesis.space_id == space.id,
                SpaceSynthesis.is_current == True,
            )
            .first()
        )
        if not synthesis_row:
            return

        theme_notes = synthesis_row.theme_notes or {}
        note_states = synthesis_row.note_states or {}
        dismiss_reasons = synthesis_row.dismiss_reasons or {}
        completion_outcomes = synthesis_row.completion_outcomes or {}

        if not note_states:
            return

        # Build theme_id -> name lookup from current Theme rows
        themes = db.query(Theme).filter(Theme.space_id == space.id).all()
        theme_id_to_name = {str(t.id): t.name for t in themes}

        now = datetime.utcnow()
        one_minute_ago = now - timedelta(minutes=1)
        rows_to_add = []

        for key, state in note_states.items():
            if state not in ("completed", "dismissed"):
                continue

            parts = key.rsplit(":", 1)
            if len(parts) != 2:
                continue
            theme_id_str, idx_str = parts

            try:
                idx = int(idx_str)
                notes_list = theme_notes.get(theme_id_str, [])
                if idx >= len(notes_list):
                    continue
                note_text = notes_list[idx]
            except (ValueError, IndexError):
                continue

            theme_name = theme_id_to_name.get(theme_id_str, "Unknown")
            detail = None
            if state == "completed":
                detail = completion_outcomes.get(key)
            elif state == "dismissed":
                detail = dismiss_reasons.get(key)

            # Dedup: skip if identical row created within last minute
            existing = (
                db.query(SynthesisAction.id)
                .filter(
                    SynthesisAction.space_id == space.id,
                    SynthesisAction.theme_name == theme_name,
                    SynthesisAction.note_text == note_text,
                    SynthesisAction.action == state,
                    SynthesisAction.created_at >= one_minute_ago,
                )
                .first()
            )
            if existing:
                continue

            rows_to_add.append(SynthesisAction(
                space_id=space.id,
                theme_name=theme_name,
                note_text=note_text,
                action=state,
                detail=detail,
                created_at=now,
            ))

        if rows_to_add:
            db.add_all(rows_to_add)
            db.flush()

    def should_auto_organize(self, db: Session, space_id: UUID) -> bool:
        """Check if a space should be auto-organized based on scoring heuristics."""
        from datetime import datetime, timedelta

        space = db.query(Space).filter(Space.id == space_id).first()
        if not space or not space.auto_organize:
            return False

        active_idea_count = (
            db.query(func.count(Idea.id))
            .filter(Idea.space_id == space_id, Idea.status == "active")
            .scalar() or 0
        )

        # First organize: need minimum ideas
        if space.last_organized_at is None:
            return active_idea_count >= self.FIRST_ORGANIZE_THRESHOLD

        # Cooldown check
        now = datetime.utcnow()
        if now - space.last_organized_at < timedelta(minutes=self.COOLDOWN_MINUTES):
            return False

        # Compute score
        new_ideas = active_idea_count - (space.ideas_at_last_organize or 0)
        new_ideas = max(new_ideas, 0)

        # Count unthemed ideas
        all_themed_ids = (
            db.query(IdeaTheme.idea_id)
            .join(Theme, IdeaTheme.theme_id == Theme.id)
            .filter(Theme.space_id == space_id)
            .distinct()
            .subquery()
        )
        unthemed = (
            db.query(func.count(Idea.id))
            .filter(
                Idea.space_id == space_id,
                Idea.status == "active",
                ~Idea.id.in_(db.query(all_themed_ids)),
            )
            .scalar() or 0
        )

        hours_since = (now - space.last_organized_at).total_seconds() / 3600
        staleness_hours = min(hours_since, self.STALENESS_CAP_HOURS)

        # Count synthesis notes with actionable feedback (dismissed-with-reason
        # or completed-with-outcome) — signals the user engaged with suggestions
        # and the AI should regenerate with that context.
        note_feedback_count = 0
        from app.models.space_synthesis import SpaceSynthesis
        synthesis_row = (
            db.query(SpaceSynthesis)
            .filter(
                SpaceSynthesis.space_id == space_id,
                SpaceSynthesis.is_current == True,
            )
            .first()
        )
        if synthesis_row:
            dismiss_reasons = synthesis_row.dismiss_reasons or {}
            completion_outcomes = synthesis_row.completion_outcomes or {}
            note_feedback_count = len(dismiss_reasons) + len(completion_outcomes)

        score = (
            new_ideas * self.NEW_IDEA_WEIGHT
            + unthemed * self.UNTHEMED_WEIGHT
            + staleness_hours * self.STALENESS_WEIGHT
            + note_feedback_count * self.NOTE_FEEDBACK_WEIGHT
        )

        return score >= self.AUTO_ORGANIZE_SCORE_THRESHOLD

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single idea text."""
        t0 = time.time()
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=[text],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="embedding",
            provider="openai",
            model=self.embedding_model,
            total_tokens=response.usage.total_tokens,
            latency_ms=latency,
        )
        return response.data[0].embedding

    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts in one API call."""
        if not texts:
            return []
        t0 = time.time()
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=texts,
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="embedding",
            provider="openai",
            model=self.embedding_model,
            total_tokens=response.usage.total_tokens,
            latency_ms=latency,
        )
        return [item.embedding for item in response.data]

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @staticmethod
    def _compute_centroid(embeddings: List[List[float]]) -> np.ndarray:
        """Compute the centroid (average) of a list of embeddings."""
        if not embeddings:
            return np.zeros(1536)
        return np.mean(embeddings, axis=0)

    def classify_idea(self, db: Session, idea_id: UUID, space_id: UUID):
        """Immediate classification: assign a new idea to existing themes.

        1. Load the idea (must already have an embedding)
        2. Load all themes with their member idea embeddings
        3. Compute theme centroids
        4. Cosine similarity against each centroid
        5. Assign to themes above SIMILARITY_THRESHOLD
        """
        idea = db.query(Idea).filter(Idea.id == idea_id, Idea.space_id == space_id).first()
        if not idea or not idea.embedding:
            return

        idea_emb = np.array(idea.embedding)

        # Get all themes in this space with their idea embeddings
        themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        if not themes:
            return

        for theme in themes:
            # Get embeddings of ideas assigned to this theme
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if not assignments:
                continue

            idea_ids = [a.idea_id for a in assignments]
            member_ideas = (
                db.query(Idea)
                .filter(Idea.id.in_(idea_ids), Idea.embedding.isnot(None))
                .all()
            )
            if not member_ideas:
                continue

            member_embeddings = [i.embedding for i in member_ideas]
            centroid = self._compute_centroid(member_embeddings)
            similarity = self._cosine_similarity(idea_emb, centroid)

            if similarity >= self.SIMILARITY_THRESHOLD:
                existing = (
                    db.query(IdeaTheme)
                    .filter(IdeaTheme.idea_id == idea_id, IdeaTheme.theme_id == theme.id)
                    .first()
                )
                if not existing:
                    db.add(IdeaTheme(
                        idea_id=idea_id,
                        theme_id=theme.id,
                        confidence=similarity,
                        assigned_by="ai",
                    ))

        db.commit()

    def organize(self, db: Session, space_id: UUID, context: Optional[str] = None, clustering_mode: str = "dbscan"):
        """Full re-organization (on-demand).

        1. Load all active ideas with embeddings
        2. DBSCAN or LLM clustering
        3. LLM theme extraction per cluster
        4. Match new clusters to existing themes (centroid overlap > 0.8)
        5. Create new themes for unmatched clusters
        6. Rebuild all IdeaTheme assignments
        7. Compute ThemeConnections
        """
        if clustering_mode == "llm":
            return self._organize_with_llm(db, space_id, context)

        # Load ideas
        ideas = (
            db.query(Idea)
            .filter(Idea.space_id == space_id, Idea.status == "active")
            .all()
        )
        if not ideas:
            return

        # Generate embeddings for ideas that don't have them,
        # or regenerate all if dimensions are mixed (model change)
        dims = {len(i.embedding) for i in ideas if i.embedding}
        if len(dims) > 1:
            # Mixed dimensions — clear all so they get regenerated uniformly
            for idea in ideas:
                idea.embedding = None

        ideas_needing_embeddings = [i for i in ideas if not i.embedding]
        if ideas_needing_embeddings:
            texts = [i.text for i in ideas_needing_embeddings]
            embeddings = self.generate_embeddings_batch(texts)
            for idea, emb in zip(ideas_needing_embeddings, embeddings):
                idea.embedding = emb
            db.commit()

        # Filter to ideas with embeddings
        ideas_with_emb = [i for i in ideas if i.embedding]
        if len(ideas_with_emb) < 2:
            return

        texts = [i.text for i in ideas_with_emb]
        embeddings = np.array([i.embedding for i in ideas_with_emb])

        # DBSCAN clustering
        clustering = DBSCAN(eps=0.50, min_samples=2, metric="cosine")
        labels = clustering.fit_predict(embeddings)

        # Group ideas by cluster
        clusters: Dict[int, List[int]] = {}
        for idx, label in enumerate(labels):
            if label == -1:
                continue
            clusters.setdefault(label, []).append(idx)

        # Load existing themes and snapshot BEFORE clearing assignments
        existing_themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        theme_centroids_snapshot: Dict[UUID, np.ndarray] = {}
        old_membership: Dict[UUID, Set[UUID]] = {}  # theme_id -> set of idea_ids
        old_theme_info: Dict[UUID, Dict[str, Any]] = {}  # theme_id -> {name, color}
        for theme in existing_themes:
            old_theme_info[theme.id] = {"name": theme.name, "color": theme.color}
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if assignments:
                idea_ids = [a.idea_id for a in assignments]
                old_membership[theme.id] = set(idea_ids)
                member_ideas = db.query(Idea).filter(
                    Idea.id.in_(idea_ids), Idea.embedding.isnot(None)
                ).all()
                if member_ideas:
                    theme_centroids_snapshot[theme.id] = self._compute_centroid(
                        [i.embedding for i in member_ideas]
                    )
            else:
                old_membership[theme.id] = set()

        # Now clear existing AI assignments (keep user assignments)
        db.query(IdeaTheme).filter(
            IdeaTheme.idea_id.in_([i.id for i in ideas_with_emb]),
            IdeaTheme.assigned_by == "ai",
        ).delete(synchronize_session=False)

        matched_theme_ids = set()
        created_themes: List[Theme] = []  # newly created themes this run
        color_idx = len(existing_themes)  # Continue color palette from existing count

        for label, indices in clusters.items():
            cluster_texts = [texts[i] for i in indices]
            cluster_embeddings = [embeddings[i] for i in indices]
            cluster_centroid = self._compute_centroid(cluster_embeddings)

            # Try matching to existing theme using snapshotted centroids
            best_match = None
            best_overlap = 0.0
            for theme in existing_themes:
                if theme.id in matched_theme_ids:
                    continue
                if theme.id not in theme_centroids_snapshot:
                    continue
                overlap = self._cosine_similarity(
                    cluster_centroid, theme_centroids_snapshot[theme.id]
                )
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_match = theme

            if best_match and best_overlap > 0.8:
                # Reuse existing theme, update summary
                theme = best_match
                matched_theme_ids.add(theme.id)
                theme_data = self._extract_theme_with_llm(cluster_texts, context)
                theme.summary = theme_data.get("summary", theme.summary)
            else:
                # Create new theme via LLM
                theme_data = self._extract_theme_with_llm(cluster_texts, context)
                theme = Theme(
                    space_id=space_id,
                    name=theme_data.get("theme", f"Theme {label + 1}"),
                    summary=theme_data.get("summary", ""),
                    color=THEME_COLORS[color_idx % len(THEME_COLORS)],
                    is_ai_generated=True,
                )
                db.add(theme)
                db.flush()
                created_themes.append(theme)
                color_idx += 1

            # Assign ideas to this theme
            for idx in indices:
                idea = ideas_with_emb[idx]
                similarity = self._cosine_similarity(
                    np.array(idea.embedding), cluster_centroid
                )
                db.add(IdeaTheme(
                    idea_id=idea.id,
                    theme_id=theme.id,
                    confidence=float(similarity),
                    assigned_by="ai",
                ))

        # Flush primary assignments so they're queryable in the secondary pass
        db.flush()

        # Second pass: assign ideas to secondary themes above threshold
        primary_assignment: Dict[UUID, UUID] = {}  # idea_id -> primary theme_id

        # Compute centroids for all themes that received primary assignments
        all_active_themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        theme_centroids_new: Dict[UUID, np.ndarray] = {}
        theme_idea_ids: Dict[UUID, set] = {}
        for theme in all_active_themes:
            # Get ideas assigned to this theme in current session
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id, IdeaTheme.assigned_by == "ai")
                .all()
            )
            if assignments:
                assigned_ids = {a.idea_id for a in assignments}
                theme_idea_ids[theme.id] = assigned_ids
                member_ideas = db.query(Idea).filter(
                    Idea.id.in_(assigned_ids), Idea.embedding.isnot(None)
                ).all()
                if member_ideas:
                    theme_centroids_new[theme.id] = self._compute_centroid(
                        [i.embedding for i in member_ideas]
                    )
                    # Record primary assignments
                    for mid in assigned_ids:
                        primary_assignment[mid] = theme.id

        # Now assign secondary themes
        for idea in ideas_with_emb:
            idea_emb = np.array(idea.embedding)
            p_theme_id = primary_assignment.get(idea.id)
            if not p_theme_id:
                continue  # noise idea, handled in rescue pass below

            for theme_id, centroid in theme_centroids_new.items():
                if theme_id == p_theme_id:
                    continue
                similarity = self._cosine_similarity(idea_emb, centroid)
                if similarity >= self.SECONDARY_THRESHOLD:
                    db.add(IdeaTheme(
                        idea_id=idea.id,
                        theme_id=theme_id,
                        confidence=float(similarity),
                        assigned_by="ai",
                    ))

        # Rescue pass: assign DBSCAN noise ideas to their best matching theme
        if theme_centroids_new:
            for idea in ideas_with_emb:
                if idea.id in primary_assignment:
                    continue  # already assigned
                idea_emb = np.array(idea.embedding)
                best_theme_id = None
                best_sim = 0.0
                for theme_id, centroid in theme_centroids_new.items():
                    similarity = self._cosine_similarity(idea_emb, centroid)
                    if similarity > best_sim:
                        best_sim = similarity
                        best_theme_id = theme_id
                if best_theme_id and best_sim >= self.RESCUE_THRESHOLD:
                    db.add(IdeaTheme(
                        idea_id=idea.id,
                        theme_id=best_theme_id,
                        confidence=float(best_sim),
                        assigned_by="ai",
                    ))

        # Flush all assignments (secondary + rescue) so they're visible to queries below
        db.flush()

        # Clean up orphaned AI-generated themes (0 ideas after reassignment)
        retired_themes: List[Dict[str, Any]] = []  # {id, name, color}
        for theme in existing_themes:
            if theme.id not in matched_theme_ids and theme.is_ai_generated:
                remaining = (
                    db.query(func.count(IdeaTheme.id))
                    .filter(IdeaTheme.theme_id == theme.id)
                    .scalar()
                )
                if not remaining:
                    retired_themes.append({
                        "id": theme.id,
                        "name": theme.name,
                        "color": theme.color,
                    })
                    # Remove any connections referencing this theme
                    db.query(ThemeConnection).filter(
                        (ThemeConnection.theme_a_id == theme.id) |
                        (ThemeConnection.theme_b_id == theme.id)
                    ).delete(synchronize_session=False)
                    db.delete(theme)

        # Emit theme evolution events
        self._emit_evolution_events(
            db, space_id, old_membership, old_theme_info,
            matched_theme_ids, created_themes, retired_themes,
        )

        # Update auto-organize tracking
        from datetime import datetime as dt
        space = db.query(Space).filter(Space.id == space_id).first()
        if space:
            space.last_organized_at = dt.utcnow()
            space.ideas_at_last_organize = len(ideas_with_emb)

        db.commit()

        # Compute theme connections
        self.compute_connections(db, space_id)

    def compute_connections(self, db: Session, space_id: UUID):
        """Compute theme-to-theme connections based on centroid similarity."""
        # Clear existing connections
        db.query(ThemeConnection).filter(ThemeConnection.space_id == space_id).delete()

        themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        if len(themes) < 2:
            db.commit()
            return

        # Compute centroids for each theme
        theme_centroids: Dict[UUID, np.ndarray] = {}
        for theme in themes:
            assignments = db.query(IdeaTheme).filter(IdeaTheme.theme_id == theme.id).all()
            if not assignments:
                continue
            idea_ids = [a.idea_id for a in assignments]
            member_ideas = (
                db.query(Idea)
                .filter(Idea.id.in_(idea_ids), Idea.embedding.isnot(None))
                .all()
            )
            if member_ideas:
                theme_centroids[theme.id] = self._compute_centroid(
                    [i.embedding for i in member_ideas]
                )

        # Compute pairwise similarities
        theme_ids = list(theme_centroids.keys())
        for i, j in combinations(range(len(theme_ids)), 2):
            id_a, id_b = theme_ids[i], theme_ids[j]
            # Ensure ordering for the check constraint
            if id_a > id_b:
                id_a, id_b = id_b, id_a

            strength = self._cosine_similarity(
                theme_centroids[theme_ids[i]],
                theme_centroids[theme_ids[j]],
            )
            if strength >= self.CONNECTION_THRESHOLD:
                db.add(ThemeConnection(
                    space_id=space_id,
                    theme_a_id=id_a,
                    theme_b_id=id_b,
                    strength=float(strength),
                ))

        db.commit()

    def get_graph_data(self, db: Session, space_id: UUID) -> dict:
        """Return nodes (themes) + edges (connections) for the network graph."""
        themes = db.query(Theme).filter(Theme.space_id == space_id).all()

        nodes = []
        for theme in themes:
            idea_count = (
                db.query(func.count(IdeaTheme.id))
                .filter(IdeaTheme.theme_id == theme.id)
                .scalar()
            )
            nodes.append({
                "id": str(theme.id),
                "name": theme.name,
                "size": idea_count or 0,
                "color": theme.color or "#3B82F6",
                "summary": theme.summary,
            })

        connections = (
            db.query(ThemeConnection)
            .filter(ThemeConnection.space_id == space_id)
            .all()
        )

        # Build idea sets per theme for shared_count computation
        theme_ideas: dict[str, set] = {}
        for theme in themes:
            tid = str(theme.id)
            idea_ids = (
                db.query(IdeaTheme.idea_id)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            theme_ideas[tid] = {row[0] for row in idea_ids}

        edges = []
        for c in connections:
            src = str(c.theme_a_id)
            tgt = str(c.theme_b_id)
            shared = len(theme_ideas.get(src, set()) & theme_ideas.get(tgt, set()))
            edges.append({
                "source": src,
                "target": tgt,
                "strength": c.strength,
                "shared_count": shared,
            })

        # Count unthemed ideas
        all_themed_idea_ids = (
            db.query(IdeaTheme.idea_id)
            .join(Theme, IdeaTheme.theme_id == Theme.id)
            .filter(Theme.space_id == space_id)
            .distinct()
            .subquery()
        )
        total_ideas = (
            db.query(func.count(Idea.id))
            .filter(Idea.space_id == space_id, Idea.status == "active")
            .scalar()
        )
        themed_count = (
            db.query(func.count())
            .select_from(all_themed_idea_ids)
            .scalar()
        )
        unthemed_count = (total_ideas or 0) - (themed_count or 0)

        return {
            "nodes": nodes,
            "edges": edges,
            "unthemed_count": max(unthemed_count, 0),
        }

    def _emit_evolution_events(
        self,
        db: Session,
        space_id: UUID,
        old_membership: Dict[UUID, Set[UUID]],
        old_theme_info: Dict[UUID, Dict[str, Any]],
        matched_theme_ids: Set[UUID],
        created_themes: List,
        retired_themes: List[Dict[str, Any]],
    ):
        """Emit ThemeEvent rows capturing what changed in this organize run."""
        run_id = uuid4()

        # Build new membership from current IdeaTheme state
        new_membership: Dict[UUID, Set[UUID]] = {}
        current_themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        theme_lookup = {t.id: t for t in current_themes}
        for theme in current_themes:
            assignments = (
                db.query(IdeaTheme.idea_id)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            new_membership[theme.id] = {a.idea_id for a in assignments}

        # Created events
        created_ids = {t.id for t in created_themes}
        for theme in created_themes:
            idea_ids = new_membership.get(theme.id, set())
            # Find source themes: old themes whose ideas overlap with this new theme
            source_themes = []
            for old_tid, old_ideas in old_membership.items():
                overlap = old_ideas & idea_ids
                if overlap:
                    source_themes.append({
                        "name": old_theme_info[old_tid]["name"],
                        "idea_overlap": len(overlap),
                    })
            source_themes.sort(key=lambda x: x["idea_overlap"], reverse=True)

            db.add(ThemeEvent(
                space_id=space_id,
                organize_run_id=run_id,
                event_type="created",
                theme_id=theme.id,
                theme_name=theme.name,
                theme_color=theme.color,
                details={
                    "idea_count": len(idea_ids),
                    "source_themes": source_themes[:5],
                },
            ))

        # Retired events
        for rt in retired_themes:
            old_ideas = old_membership.get(rt["id"], set())
            # Find destination themes: new themes that absorbed the retired ideas
            dest_themes = []
            for new_tid, new_ideas in new_membership.items():
                overlap = old_ideas & new_ideas
                if overlap:
                    t = theme_lookup.get(new_tid)
                    dest_themes.append({
                        "name": t.name if t else "Unknown",
                        "idea_overlap": len(overlap),
                    })
            dest_themes.sort(key=lambda x: x["idea_overlap"], reverse=True)

            db.add(ThemeEvent(
                space_id=space_id,
                organize_run_id=run_id,
                event_type="retired",
                theme_id=None,  # theme is deleted
                theme_name=rt["name"],
                theme_color=rt.get("color"),
                details={
                    "old_idea_count": len(old_ideas),
                    "destination_themes": dest_themes[:5],
                },
            ))

        # Persisted events (themes that survived from old → new)
        for theme_id in matched_theme_ids:
            if theme_id in created_ids:
                continue  # shouldn't happen, but guard
            theme = theme_lookup.get(theme_id)
            if not theme:
                continue

            old_ideas = old_membership.get(theme_id, set())
            new_ideas = new_membership.get(theme_id, set())
            gained = len(new_ideas - old_ideas)
            lost = len(old_ideas - new_ideas)

            db.add(ThemeEvent(
                space_id=space_id,
                organize_run_id=run_id,
                event_type="persisted",
                theme_id=theme_id,
                theme_name=theme.name,
                theme_color=theme.color,
                details={
                    "idea_count": len(new_ideas),
                    "prev_idea_count": len(old_ideas),
                    "gained": gained,
                    "lost": lost,
                },
            ))

    def _organize_with_llm(self, db: Session, space_id: UUID, context: Optional[str] = None):
        """LLM-based clustering: ask Claude to group ideas directly instead of DBSCAN.

        Better for structurally similar short sentences where DBSCAN chains
        everything together based on embedding proximity.
        """
        # Load ideas
        ideas = (
            db.query(Idea)
            .filter(Idea.space_id == space_id, Idea.status == "active")
            .all()
        )
        if not ideas:
            return

        # Ensure embeddings exist (needed for connections + theme matching)
        dims = {len(i.embedding) for i in ideas if i.embedding}
        if len(dims) > 1:
            for idea in ideas:
                idea.embedding = None

        ideas_needing_embeddings = [i for i in ideas if not i.embedding]
        if ideas_needing_embeddings:
            texts = [i.text for i in ideas_needing_embeddings]
            embeddings = self.generate_embeddings_batch(texts)
            for idea, emb in zip(ideas_needing_embeddings, embeddings):
                idea.embedding = emb
            db.commit()

        ideas_with_emb = [i for i in ideas if i.embedding]
        if len(ideas_with_emb) < 2:
            return

        texts = [i.text for i in ideas_with_emb]
        embeddings = np.array([i.embedding for i in ideas_with_emb])

        # Ask LLM to cluster ideas
        context_section = ""
        if context:
            context_section = f"""CONTEXT (provided by the user):
{context}

Use this context to make cluster groupings more specific and relevant.

"""
        prompt = f"""{context_section}Given these {len(texts)} ideas, group them into thematic clusters.
Return JSON: {{"clusters": [{{"theme": "Short name (1-6 words)", "summary": "1-2 sentence description", "indices": [0, 2, 5]}}]}}
Ideas that don't fit any cluster should be omitted from the indices.

Ideas:
{chr(10).join(f"{i}. {text}" for i, text in enumerate(texts))}"""

        t0 = time.time()
        response = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="space_llm_clustering",
            provider="anthropic",
            model=self.llm_model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        # Parse LLM response
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(text)
            llm_clusters = result.get("clusters", [])
        except (json.JSONDecodeError, IndexError, KeyError):
            logger.warning("Failed to parse LLM clustering response, falling back to DBSCAN")
            return self.organize(db, space_id, context=context, clustering_mode="dbscan")

        if not llm_clusters:
            return

        # Build cluster map: cluster_idx -> list of idea indices
        clusters: Dict[int, List[int]] = {}
        cluster_meta: Dict[int, Dict[str, str]] = {}
        for ci, cluster in enumerate(llm_clusters):
            indices = cluster.get("indices", [])
            # Validate indices are in range
            valid_indices = [idx for idx in indices if 0 <= idx < len(ideas_with_emb)]
            if len(valid_indices) >= 1:
                clusters[ci] = valid_indices
                cluster_meta[ci] = {
                    "theme": cluster.get("theme", f"Theme {ci + 1}"),
                    "summary": cluster.get("summary", ""),
                }

        # Load existing themes and snapshot BEFORE clearing assignments
        existing_themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        theme_centroids_snapshot: Dict[UUID, np.ndarray] = {}
        old_membership: Dict[UUID, Set[UUID]] = {}
        old_theme_info: Dict[UUID, Dict[str, Any]] = {}
        for theme in existing_themes:
            old_theme_info[theme.id] = {"name": theme.name, "color": theme.color}
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if assignments:
                idea_ids = [a.idea_id for a in assignments]
                old_membership[theme.id] = set(idea_ids)
                member_ideas = db.query(Idea).filter(
                    Idea.id.in_(idea_ids), Idea.embedding.isnot(None)
                ).all()
                if member_ideas:
                    theme_centroids_snapshot[theme.id] = self._compute_centroid(
                        [i.embedding for i in member_ideas]
                    )
            else:
                old_membership[theme.id] = set()

        # Clear existing AI assignments
        db.query(IdeaTheme).filter(
            IdeaTheme.idea_id.in_([i.id for i in ideas_with_emb]),
            IdeaTheme.assigned_by == "ai",
        ).delete(synchronize_session=False)

        matched_theme_ids = set()
        created_themes: List[Theme] = []
        color_idx = len(existing_themes)

        for label, indices in clusters.items():
            cluster_embeddings = [embeddings[i] for i in indices]
            cluster_centroid = self._compute_centroid(cluster_embeddings)

            # Try matching to existing theme using snapshotted centroids
            best_match = None
            best_overlap = 0.0
            for theme in existing_themes:
                if theme.id in matched_theme_ids:
                    continue
                if theme.id not in theme_centroids_snapshot:
                    continue
                overlap = self._cosine_similarity(
                    cluster_centroid, theme_centroids_snapshot[theme.id]
                )
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_match = theme

            meta = cluster_meta[label]
            if best_match and best_overlap > 0.8:
                theme = best_match
                matched_theme_ids.add(theme.id)
                theme.summary = meta["summary"]
            else:
                theme = Theme(
                    space_id=space_id,
                    name=meta["theme"],
                    summary=meta["summary"],
                    color=THEME_COLORS[color_idx % len(THEME_COLORS)],
                    is_ai_generated=True,
                )
                db.add(theme)
                db.flush()
                created_themes.append(theme)
                color_idx += 1

            # Assign ideas to this theme
            for idx in indices:
                idea = ideas_with_emb[idx]
                similarity = self._cosine_similarity(
                    np.array(idea.embedding), cluster_centroid
                )
                db.add(IdeaTheme(
                    idea_id=idea.id,
                    theme_id=theme.id,
                    confidence=float(similarity),
                    assigned_by="ai",
                ))

        # Flush assignments so they're visible to orphan cleanup + evolution queries
        db.flush()

        # Clean up orphaned AI-generated themes
        retired_themes: List[Dict[str, Any]] = []
        for theme in existing_themes:
            if theme.id not in matched_theme_ids and theme.is_ai_generated:
                remaining = (
                    db.query(func.count(IdeaTheme.id))
                    .filter(IdeaTheme.theme_id == theme.id)
                    .scalar()
                )
                if not remaining:
                    retired_themes.append({
                        "id": theme.id,
                        "name": theme.name,
                        "color": theme.color,
                    })
                    db.query(ThemeConnection).filter(
                        (ThemeConnection.theme_a_id == theme.id) |
                        (ThemeConnection.theme_b_id == theme.id)
                    ).delete(synchronize_session=False)
                    db.delete(theme)

        # Emit evolution events
        self._emit_evolution_events(
            db, space_id, old_membership, old_theme_info,
            matched_theme_ids, created_themes, retired_themes,
        )

        # Update auto-organize tracking
        from datetime import datetime as dt
        space = db.query(Space).filter(Space.id == space_id).first()
        if space:
            space.last_organized_at = dt.utcnow()
            space.ideas_at_last_organize = len(ideas_with_emb)

        db.commit()

        # Compute theme connections
        self.compute_connections(db, space_id)

    def generate_purpose_synthesis(
        self, db: Session, space_id: UUID, purpose: str
    ) -> Optional[Dict[str, Any]]:
        """Generate purpose-specific synthesis after organizing themes.

        Makes one LLM call with all themes + member ideas, returns structured
        content tailored to the space purpose. Skipped for 'organize' purpose.
        """
        if purpose == "organize":
            return None

        themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        if not themes:
            return None

        # Collect previous user feedback (dismissed notes + reasons, completed outcomes)
        previous_feedback: List[str] = []
        completed_outcomes: List[str] = []
        from app.models.space_synthesis import SpaceSynthesis
        prev_row = (
            db.query(SpaceSynthesis)
            .filter(
                SpaceSynthesis.space_id == space_id,
                SpaceSynthesis.is_current == True,
            )
            .first()
        )
        if prev_row:
            prev_notes = prev_row.theme_notes or {}
            prev_states = prev_row.note_states or {}
            prev_reasons = prev_row.dismiss_reasons or {}
            prev_outcomes = prev_row.completion_outcomes or {}
            for key, state in prev_states.items():
                # Resolve the note text from theme_id:index
                parts = key.rsplit(":", 1)
                if len(parts) != 2:
                    continue
                tid, idx_str = parts
                try:
                    idx = int(idx_str)
                    notes_list = prev_notes.get(tid, [])
                    if idx >= len(notes_list):
                        continue
                    note_text = notes_list[idx]
                except (ValueError, IndexError):
                    continue

                if state == "dismissed":
                    reason = prev_reasons.get(key, "")
                    if reason:
                        previous_feedback.append(f"- \"{note_text}\" (reason: {reason})")
                    else:
                        previous_feedback.append(f"- \"{note_text}\"")
                elif state == "completed":
                    outcome = prev_outcomes.get(key, "")
                    if outcome:
                        completed_outcomes.append(f"- \"{note_text}\" => outcome: {outcome}")
                    else:
                        completed_outcomes.append(f"- \"{note_text}\" (completed, no outcome reported)")

        # Build theme data with member ideas (cap 15 per theme)
        theme_data: List[Dict[str, Any]] = []
        for theme in themes:
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if not assignments:
                continue
            idea_ids = [a.idea_id for a in assignments]
            member_ideas = (
                db.query(Idea)
                .filter(Idea.id.in_(idea_ids), Idea.status == "active")
                .limit(15)
                .all()
            )
            theme_data.append({
                "id": str(theme.id),
                "name": theme.name,
                "summary": theme.summary or "",
                "ideas": [i.text for i in member_ideas],
            })

        if not theme_data:
            return None

        prompt = self._build_synthesis_prompt(purpose, theme_data, previous_feedback, completed_outcomes)

        try:
            t0 = time.time()
            response = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type="space_purpose_synthesis",
                provider="anthropic",
                model=self.llm_model,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=latency,
            )

            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(text)

            # Map theme names -> theme IDs (case-insensitive fallback)
            name_to_id: Dict[str, str] = {}
            name_to_id_lower: Dict[str, str] = {}
            for td in theme_data:
                name_to_id[td["name"]] = td["id"]
                name_to_id_lower[td["name"].lower()] = td["id"]

            raw_notes = result.get("theme_notes", {})
            mapped_notes: Dict[str, list] = {}
            for theme_name, notes in raw_notes.items():
                theme_id = name_to_id.get(theme_name) or name_to_id_lower.get(theme_name.lower())
                if theme_id and isinstance(notes, list):
                    mapped_notes[theme_id] = notes

            from datetime import datetime as dt
            return {
                "space_summary": result.get("space_summary", ""),
                "theme_notes": mapped_notes,
                "generated_at": dt.utcnow().isoformat(),
            }
        except Exception:
            logger.warning("Failed to generate purpose synthesis", exc_info=True)
            return None

    @staticmethod
    def _build_synthesis_prompt(
        purpose: str,
        theme_data: List[Dict[str, Any]],
        previous_feedback: Optional[List[str]] = None,
        completed_outcomes: Optional[List[str]] = None,
    ) -> str:
        """Build a purpose-specific prompt for synthesis."""
        themes_section = ""
        for td in theme_data:
            ideas_text = "\n".join(f"  - {idea}" for idea in td["ideas"])
            themes_section += f'\nTheme: "{td["name"]}"\nSummary: {td["summary"]}\nIdeas:\n{ideas_text}\n'

        purpose_instructions = {
            "actions": {
                "space_summary": "Provide a brief overall recommended approach or strategy based on all the themes. Focus on what to build, try, or do next.",
                "theme_notes": "For each theme, list 2-4 concrete next steps the user could take to move forward. Focus on building, prototyping, testing, and validating — things they can actually do this week. Avoid research tasks, risk analysis, legal/compliance considerations, or overly cautious prerequisites. Bias toward action over preparation.",
            },
            "insights": {
                "space_summary": "Describe the most interesting cross-theme patterns, tensions, or surprising connections you notice across all themes.",
                "theme_notes": "For each theme, list 2-4 key patterns, surprising observations, or non-obvious findings within that theme's ideas.",
            },
            "connections": {
                "space_summary": "Explain how all the themes fit together as a whole — what's the bigger picture connecting them?",
                "theme_notes": "For each theme, describe 2-4 specific relationships or connections to other themes by name. How do they overlap, complement, or tension with each other?",
            },
            "explore": {
                "space_summary": "Describe what's emerging overall from these ideas — what directions or possibilities are taking shape?",
                "theme_notes": "For each theme, suggest 2-4 interesting angles, questions, or directions worth exploring further.",
            },
        }

        instructions = purpose_instructions.get(purpose, purpose_instructions["explore"])

        feedback_section = ""
        if previous_feedback:
            feedback_section += f"""
The user previously dismissed the following suggestions. Avoid generating similar notes. Pay attention to the reasons — they indicate what the user does NOT want:
{chr(10).join(previous_feedback)}
"""
        if completed_outcomes:
            feedback_section += f"""
The user completed these actions and reported the following outcomes. Use this to suggest better, more relevant next steps that build on what they've already done:
{chr(10).join(completed_outcomes)}
"""

        return f"""Analyze the following themes and their member ideas. Provide purpose-specific synthesis.

{themes_section}
{feedback_section}
Instructions:
- space_summary: {instructions["space_summary"]}
- theme_notes: {instructions["theme_notes"]}

Return JSON only:
{{"space_summary": "Your overall synthesis (2-4 sentences)", "theme_notes": {{"Theme Name": ["note 1", "note 2", "note 3"]}}}}

Use the exact theme names as keys in theme_notes. Be specific and actionable, not generic."""

    def generate_expanded_synthesis(
        self,
        db: Session,
        space_id: UUID,
        purpose: str,
        compact_summary: str,
        compact_theme_notes: Dict[str, list],
    ) -> Optional[Dict[str, Any]]:
        """Generate an expanded, detailed synthesis building on the compact version.

        Returns dict with expanded_summary (narrative) and expanded_theme_notes
        (dict of theme_id -> detailed analysis object).
        """
        from app.models.theme import Theme
        from app.models.idea import Idea
        from app.models.idea_theme import IdeaTheme

        themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        if not themes:
            return None

        # Build theme data with member ideas
        theme_data: List[Dict[str, Any]] = []
        id_to_name: Dict[str, str] = {}
        for theme in themes:
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if not assignments:
                continue
            idea_ids = [a.idea_id for a in assignments]
            member_ideas = (
                db.query(Idea)
                .filter(Idea.id.in_(idea_ids), Idea.status == "active")
                .limit(15)
                .all()
            )
            theme_data.append({
                "id": str(theme.id),
                "name": theme.name,
                "summary": theme.summary or "",
                "ideas": [i.text for i in member_ideas],
            })
            id_to_name[str(theme.id)] = theme.name

        if not theme_data:
            return None

        # Convert compact_theme_notes from id-keyed to name-keyed for the prompt
        compact_notes_by_name = {}
        for tid, notes in compact_theme_notes.items():
            name = id_to_name.get(tid)
            if name:
                compact_notes_by_name[name] = notes

        prompt = self._build_expanded_prompt(
            purpose, theme_data, compact_summary, compact_notes_by_name
        )

        try:
            t0 = time.time()
            response = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}],
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type="space_expanded_synthesis",
                provider="anthropic",
                model=self.llm_model,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=latency,
            )

            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(text)

            # Map theme names -> theme IDs
            name_to_id: Dict[str, str] = {}
            name_to_id_lower: Dict[str, str] = {}
            for td in theme_data:
                name_to_id[td["name"]] = td["id"]
                name_to_id_lower[td["name"].lower()] = td["id"]

            raw_notes = result.get("theme_analysis", {})
            mapped_notes: Dict[str, dict] = {}
            for theme_name, analysis in raw_notes.items():
                theme_id = name_to_id.get(theme_name) or name_to_id_lower.get(theme_name.lower())
                if theme_id and isinstance(analysis, dict):
                    mapped_notes[theme_id] = analysis

            return {
                "expanded_summary": result.get("expanded_summary", ""),
                "expanded_theme_notes": mapped_notes,
            }
        except Exception:
            logger.warning("Failed to generate expanded synthesis", exc_info=True)
            return None

    @staticmethod
    def _build_expanded_prompt(
        purpose: str,
        theme_data: List[Dict[str, Any]],
        compact_summary: str,
        compact_theme_notes: Dict[str, list],
    ) -> str:
        """Build a prompt for expanded/detailed synthesis."""
        themes_section = ""
        for td in theme_data:
            ideas_text = "\n".join(f"  - {idea}" for idea in td["ideas"])
            compact_notes = compact_theme_notes.get(td["name"], [])
            notes_text = "\n".join(f"  - {n}" for n in compact_notes) if compact_notes else "  (none)"
            themes_section += (
                f'\nTheme: "{td["name"]}"\n'
                f'Summary: {td["summary"]}\n'
                f'Ideas:\n{ideas_text}\n'
                f'Current synthesis notes:\n{notes_text}\n'
            )

        purpose_framing = {
            "actions": "Focus on strategic reasoning behind each action area — why these steps matter, what risks exist, and how themes build on each other.",
            "insights": "Go deeper into each pattern — what evidence supports it, what tensions exist, and what might be missing from the picture.",
            "connections": "Elaborate on the relationships between themes — shared roots, productive tensions, and how they might evolve together.",
            "explore": "Expand on the emerging directions — what makes each promising, what unknowns remain, and where the most interesting intersections lie.",
            "organize": "Analyze the groupings — what each cluster reveals about the underlying structure, what doesn't fit neatly, and what gaps exist.",
        }

        framing = purpose_framing.get(purpose, purpose_framing["explore"])

        return f"""You have already produced a compact synthesis of this space. Now provide a detailed, expanded analysis that goes much deeper.

Compact summary: {compact_summary}

Themes and their ideas:
{themes_section}

{framing}

Provide a detailed JSON response with:

1. "expanded_summary": A rich narrative (2-3 paragraphs) that covers:
   - The overall landscape of ideas and what they reveal
   - Cross-theme connections, tensions, or surprising relationships
   - Open questions or areas that deserve more attention

2. "theme_analysis": For each theme (using exact theme names as keys), an object with:
   - "narrative": A detailed paragraph analyzing this theme in depth — what the ideas reveal, what's most significant, and nuances the compact version missed
   - "tensions": 1-2 tensions or trade-offs within this theme (array of strings)
   - "open_questions": 1-2 questions that remain unresolved or worth exploring (array of strings)
   - "connections": 1-2 specific connections to other themes by name (array of strings)

Return JSON only:
{{"expanded_summary": "...", "theme_analysis": {{"Theme Name": {{"narrative": "...", "tensions": ["..."], "open_questions": ["..."], "connections": ["..."]}}}}}}

Be specific and grounded in the actual ideas. Avoid generic observations."""

    @staticmethod
    def generate_starter_prompts(
        title: str,
        description: Optional[str],
        purpose: str,
    ) -> Optional[List[str]]:
        """Generate 3 contextual starter prompts for an empty space using Haiku.

        Returns a list of 3 short strings, or None on any failure.
        """
        from app.core.config import settings as app_settings

        haiku_model = "claude-haiku-4-5-20251001"

        purpose_verbs = {
            "explore": "explore ideas freely",
            "organize": "sort and organize items",
            "connections": "find connections between ideas",
            "insights": "discover patterns and insights",
            "actions": "identify actionable next steps",
        }
        purpose_desc = purpose_verbs.get(purpose, "explore ideas freely")

        context_parts = [f'Title: "{title}"']
        if description:
            context_parts.append(f"Description: {description}")
        context_parts.append(f"Goal: {purpose_desc}")

        prompt = f"""A user created an empty idea space with these details:
{chr(10).join(context_parts)}

Generate exactly 3 short sentence starters (each 4-10 words, ending with \u2026) that the user would begin typing as their own idea. These should read like the START of something the user would write, not questions the platform asks.

Good example for a book space: "I'm thinking of a story where\u2026"
Bad example (a question): "What genre appeals to you\u2026"

Return JSON only: ["starter 1\u2026", "starter 2\u2026", "starter 3\u2026"]"""

        try:
            client = Anthropic(api_key=app_settings.ANTHROPIC_API_KEY)
            t0 = time.time()
            response = client.messages.create(
                model=haiku_model,
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type="space_starter_prompts",
                provider="anthropic",
                model=haiku_model,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=latency,
            )

            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            result = json.loads(text)
            if isinstance(result, list) and len(result) >= 3:
                return [str(p) for p in result[:3]]
            return None
        except Exception:
            logger.warning("Failed to generate starter prompts", exc_info=True)
            return None

    def _extract_theme_with_llm(self, cluster_texts: List[str], context: Optional[str] = None) -> Dict[str, Any]:
        """Use Claude to extract a theme name and summary from a cluster of ideas."""
        context_section = ""
        if context:
            context_section = f"""CONTEXT (provided by the user):
{context}

Use this context to make theme names more specific and relevant.

"""
        prompt = f"""{context_section}Analyze the following {len(cluster_texts)} ideas and:
1. Identify the main theme they share (give it a short name, 1-6 words)
2. Provide a brief summary of what this theme encompasses (1-2 sentences)

Ideas:
{chr(10).join(f"- {text}" for text in cluster_texts)}

Return your analysis as JSON:
{{"theme": "Short theme name", "summary": "Brief description of the theme"}}"""

        t0 = time.time()
        response = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="space_theme_extraction",
            provider="anthropic",
            model=self.llm_model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        try:
            text = response.content[0].text.strip()
            # Handle cases where response might be wrapped in markdown code blocks
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(text)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse LLM theme extraction response")
            return {"theme": "Unnamed Theme", "summary": ""}

    # --- Artifact Generation ---

    ARTIFACT_TYPES = {
        "summary": {
            "label": "Summary",
            "description": "A narrative write-up synthesizing all themes",
        },
        "checklist": {
            "label": "Prioritized Checklist",
            "description": "Ranked action items with rationale",
        },
        "plan": {
            "label": "Plan",
            "description": "Phased plan with milestones and dependencies",
        },
        "decision_brief": {
            "label": "Decision Brief",
            "description": "Options, trade-offs, and recommendation",
        },
        "implementation_spec": {
            "label": "Implementation Spec",
            "description": "Detailed spec with requirements and approach",
        },
        "talking_points": {
            "label": "Talking Points",
            "description": "Key messages organized by audience or topic",
        },
        "retrospective": {
            "label": "Retrospective",
            "description": "What worked, what didn't, what to change",
        },
    }

    def generate_artifact(
        self,
        db: Session,
        space_id: UUID,
        artifact_type: str,
        purpose: str,
        space_title: str,
        space_description: Optional[str],
        user_context: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Generate an artifact (summary, checklist, etc.) from the space's themes and ideas."""
        from app.models.theme import Theme
        from app.models.idea import Idea
        from app.models.idea_theme import IdeaTheme
        from app.models.space_synthesis import SpaceSynthesis

        themes = db.query(Theme).filter(Theme.space_id == space_id).all()
        if not themes:
            return None

        # Build theme data with member ideas
        theme_data: List[Dict[str, Any]] = []
        for theme in themes:
            assignments = (
                db.query(IdeaTheme)
                .filter(IdeaTheme.theme_id == theme.id)
                .all()
            )
            if not assignments:
                continue
            idea_ids = [a.idea_id for a in assignments]
            member_ideas = (
                db.query(Idea)
                .filter(Idea.id.in_(idea_ids), Idea.status == "active")
                .limit(20)
                .all()
            )
            theme_data.append({
                "name": theme.name,
                "summary": theme.summary or "",
                "ideas": [i.text for i in member_ideas],
            })

        if not theme_data:
            return None

        # Get current synthesis for additional context
        synthesis_row = (
            db.query(SpaceSynthesis)
            .filter(
                SpaceSynthesis.space_id == space_id,
                SpaceSynthesis.is_current == True,
            )
            .first()
        )
        synthesis_summary = synthesis_row.space_summary if synthesis_row else None

        prompt = self._build_artifact_prompt(
            artifact_type, purpose, space_title, space_description,
            theme_data, synthesis_summary, user_context,
        )

        try:
            t0 = time.time()
            response = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=8000,
                messages=[{"role": "user", "content": prompt}],
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type=f"space_artifact_{artifact_type}",
                provider="anthropic",
                model=self.llm_model,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                latency_ms=latency,
            )

            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                # Truncated output — try to repair by closing open strings/arrays/objects
                repaired = text
                # Close any unterminated string
                if repaired.count('"') % 2 == 1:
                    repaired += '"'
                # Close open brackets
                open_brackets = repaired.count('[') - repaired.count(']')
                open_braces = repaired.count('{') - repaired.count('}')
                repaired += ']' * max(0, open_brackets)
                repaired += '}' * max(0, open_braces)
                return json.loads(repaired)
        except Exception:
            logger.warning(f"Failed to generate artifact type={artifact_type}", exc_info=True)
            return None

    @staticmethod
    def _build_artifact_prompt(
        artifact_type: str,
        purpose: str,
        space_title: str,
        space_description: Optional[str],
        theme_data: List[Dict[str, Any]],
        synthesis_summary: Optional[str],
        user_context: Optional[str],
    ) -> str:
        """Build a prompt for artifact generation."""
        themes_section = ""
        for td in theme_data:
            ideas_text = "\n".join(f"  - {idea}" for idea in td["ideas"])
            themes_section += f'\nTheme: "{td["name"]}"\nSummary: {td["summary"]}\nIdeas:\n{ideas_text}\n'

        context_parts = [f'Space: "{space_title}"']
        if space_description:
            context_parts.append(f"Description: {space_description}")
        if synthesis_summary:
            context_parts.append(f"Current synthesis: {synthesis_summary}")
        if user_context:
            context_parts.append(f"User's additional context: {user_context}")
        context_section = "\n".join(context_parts)

        type_instructions = {
            "summary": """Generate a comprehensive narrative summary of this space.

Return JSON:
{
  "title": "A descriptive title for this summary",
  "sections": [
    {"heading": "Section heading", "content": "One or more paragraphs of narrative text"}
  ]
}

Structure the summary with 3-5 sections that flow naturally. Cover:
- What this space is about and what emerged
- The key themes and what they reveal
- Cross-cutting patterns or tensions
- What stands out or deserves attention
Write in clear, direct prose. Be specific — reference actual ideas and themes by name.""",

            "checklist": """Generate a prioritized checklist of action items based on this space.

Return JSON:
{
  "title": "A descriptive title for this checklist",
  "items": [
    {
      "text": "The action item",
      "priority": "high" | "medium" | "low",
      "rationale": "Why this matters and why it's at this priority level",
      "theme": "Which theme this relates to"
    }
  ]
}

List 8-15 items, ordered by priority (high first). Focus on:
- Concrete, actionable items someone could start this week
- Clear rationale tied to the ideas in the space
- A mix of quick wins and strategic moves
Avoid generic advice. Every item should be grounded in the actual ideas.""",

            "plan": """Generate a phased plan based on this space.

Return JSON:
{
  "title": "A descriptive title for this plan",
  "overview": "1-2 paragraph strategic overview",
  "phases": [
    {
      "name": "Phase name",
      "description": "What this phase accomplishes",
      "items": ["Specific deliverable or milestone"],
      "dependencies": ["What needs to happen first, if anything"]
    }
  ]
}

Create 3-5 phases that build on each other. Each phase should have 3-6 concrete items.
Ground every item in actual themes and ideas from the space.""",

            "decision_brief": """Generate a decision brief based on this space.

Return JSON:
{
  "title": "A descriptive title for this brief",
  "context": "1-2 paragraphs of background and why a decision is needed",
  "options": [
    {
      "name": "Option name",
      "description": "What this option entails",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1", "Disadvantage 2"],
      "effort": "low" | "medium" | "high"
    }
  ],
  "recommendation": "1-2 paragraphs with the recommended path and why"
}

Identify 2-4 distinct options from the themes. Be honest about trade-offs.
The recommendation should be clear and well-reasoned.""",

            "implementation_spec": """Generate an implementation specification based on this space.

Return JSON:
{
  "title": "A descriptive title for this spec",
  "overview": "1-2 paragraph summary of what's being specified",
  "requirements": [
    {"text": "Requirement description", "priority": "must" | "should" | "could", "theme": "Related theme"}
  ],
  "approach": [
    {"heading": "Approach section heading", "content": "Detailed description"}
  ],
  "risks": [
    {"risk": "What could go wrong", "mitigation": "How to address it"}
  ]
}

Be specific and detailed. Requirements should be concrete and testable.
The approach should be actionable, not hand-wavy.""",

            "talking_points": """Generate talking points based on this space.

Return JSON:
{
  "title": "A descriptive title for these talking points",
  "overview": "A 2-3 sentence executive summary",
  "topics": [
    {
      "heading": "Topic heading",
      "points": ["Key message 1", "Key message 2"],
      "supporting_detail": "Brief supporting evidence or context"
    }
  ]
}

Create 4-7 topics. Each should have 2-4 crisp, quotable points.
Include enough supporting detail to answer follow-up questions.""",

            "retrospective": """Generate a retrospective analysis based on this space.

Return JSON:
{
  "title": "A descriptive title for this retrospective",
  "summary": "1-2 paragraph overall assessment",
  "went_well": [{"point": "What went well", "evidence": "Supporting detail from ideas"}],
  "challenges": [{"point": "What was challenging", "evidence": "Supporting detail from ideas"}],
  "changes": [{"point": "What to change", "rationale": "Why this change matters"}],
  "key_takeaways": ["Takeaway 1", "Takeaway 2"]
}

Be balanced — include genuine positives and genuine areas for improvement.
Ground everything in the actual ideas, not generic retrospective advice.""",
        }

        instructions = type_instructions.get(artifact_type, type_instructions["summary"])

        return f"""You are generating a document artifact from a space that has been organized into themes.

{context_section}

Themes and their ideas:
{themes_section}

{instructions}

Return valid JSON only. Be specific and grounded in the actual content — avoid generic filler."""
