"""Service for computing trends across periodic analyses."""

import time
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict

from app.models.periodic_analysis import PeriodicAnalysis


class ContinuousTrendsService:
    """Service for generating continuous conversation trends.

    This service computes trends across multiple periodic analyses for a
    single continuous conversation, showing how themes and sentiments
    evolve over time.
    """

    def compute_trends(
        self,
        periodic_analyses: List[PeriodicAnalysis],
        period_type: str = "weekly"
    ) -> Dict[str, Any]:
        """
        Compute trends across multiple periodic analyses.

        Similar to CollectionAnalysisService._generate_trends but operates
        on periodic analyses instead of conversations.

        Args:
            periodic_analyses: List of PeriodicAnalysis objects
            period_type: Type of period (daily, weekly, biweekly, monthly)

        Returns:
            Trends data dict with theme evolution over time
        """
        start_time = time.time()

        if len(periodic_analyses) < 2:
            return {
                "period_type": period_type,
                "themes": [],
                "computation_duration_ms": int((time.time() - start_time) * 1000)
            }

        # Sort by period_start
        sorted_analyses = sorted(periodic_analyses, key=lambda x: x.period_start)

        # Group themes by question text
        question_groups = defaultdict(lambda: defaultdict(list))

        for analysis in sorted_analyses:
            if not analysis.question_analyses:
                continue

            for qa in analysis.question_analyses:
                question_text = qa.get("question_text", "").lower().strip()
                if qa.get("question_type") == "text" and qa.get("themes"):
                    for theme in qa.get("themes", []):
                        theme_name = theme.get("theme", "")
                        if theme_name:
                            question_groups[question_text][theme_name].append({
                                "period": analysis.period_label,
                                "period_start": analysis.period_start,
                                "period_end": analysis.period_end,
                                "frequency": theme.get("frequency", 0),
                                "response_count": qa.get("response_count", 0)
                            })

        # Build trend data
        trends = []

        for question_text, theme_map in question_groups.items():
            for theme_name, period_data in theme_map.items():
                if len(period_data) < 2:
                    continue

                # Normalize theme name to 3 words or less
                normalized_theme = self._normalize_theme_name(theme_name)

                # Calculate normalized scores
                max_frequency = max(d["frequency"] for d in period_data) or 1

                data_points = []
                for d in period_data:
                    normalized_score = d["frequency"] / max_frequency
                    data_points.append({
                        "period": d["period"],
                        "period_start": d["period_start"].isoformat() if isinstance(d["period_start"], datetime) else d["period_start"],
                        "period_end": d["period_end"].isoformat() if isinstance(d["period_end"], datetime) else d["period_end"],
                        "normalized_score": round(normalized_score, 3),
                        "frequency": d["frequency"],
                        "response_count": d["response_count"]
                    })

                trends.append({
                    "theme_id": self._theme_to_id(normalized_theme),
                    "theme_name": normalized_theme,
                    "question_text": question_text,
                    "data_points": sorted(data_points, key=lambda x: x["period"])
                })

        duration_ms = int((time.time() - start_time) * 1000)

        # Sort by max normalized score and limit to top 20
        sorted_trends = sorted(
            trends,
            key=lambda x: max(d["normalized_score"] for d in x["data_points"]),
            reverse=True
        )[:20]

        return {
            "period_type": period_type,
            "themes": sorted_trends,
            "computation_duration_ms": duration_ms
        }

    def _normalize_theme_name(self, theme: str) -> str:
        """Normalize theme name to 3 words or less."""
        words = theme.split()[:3]
        return " ".join(words)

    def _theme_to_id(self, theme: str) -> str:
        """Convert theme name to ID (lowercase, underscores)."""
        return theme.lower().replace(" ", "_").replace("-", "_")
