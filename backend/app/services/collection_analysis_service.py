"""Service for analyzing collections across multiple conversations."""

import time
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import numpy as np
from anthropic import Anthropic

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.analysis import Analysis
from app.models.question import Question

logger = logging.getLogger(__name__)


class CollectionAnalysisService:
    """Service for generating collection-level insights and trends."""

    def __init__(self):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        # Use the same model as AnalysisService for consistency
        self.llm_model = "claude-sonnet-4-5-20250929"

    def generate_collection_analysis(
        self,
        conversations: List[Conversation],
        analyses: List[Analysis]
    ) -> Dict[str, Any]:
        """
        Generate complete collection analysis: summary, insights, and trends.

        Returns dict with:
        - overall_summary: str
        - surprising_insights: List[Dict]
        - question_insights: List[Dict]
        - trends: Dict with theme evolution data
        """
        start_time = time.time()

        # Build conversation_id -> analysis mapping
        analysis_map = {a.conversation_id: a for a in analyses}

        # Get analyzed conversations
        analyzed_conversations = [
            c for c in conversations
            if c.id in analysis_map and analysis_map[c.id].question_analyses
        ]

        if not analyzed_conversations:
            return {
                "overall_summary": "No analyzed conversations in this collection yet.",
                "surprising_insights": [],
                "question_insights": [],
                "trends": {"period": "monthly", "themes": []},
                "total_conversations": len(conversations),
                "total_responses": 0,
                "conversations_analyzed": 0,
                "conversation_ids": [str(c.id) for c in conversations]
            }

        # Aggregate question insights
        question_insights = self._aggregate_question_insights(analyzed_conversations, analysis_map)

        # Generate overall summary
        overall_summary = self._generate_collection_summary(analyzed_conversations, analysis_map, question_insights)

        # Generate surprising insights
        surprising_insights = self._generate_collection_insights(analyzed_conversations, analysis_map, question_insights)

        # Generate trends
        trends = self._generate_trends(analyzed_conversations, analysis_map, period="monthly")

        duration_ms = int((time.time() - start_time) * 1000)

        # Count total responses
        total_responses = sum(
            a.total_responses_analyzed or 0
            for a in analyses
            if a.total_responses_analyzed
        )

        return {
            "overall_summary": overall_summary,
            "surprising_insights": surprising_insights,
            "question_insights": question_insights,
            "trends": trends,
            "total_conversations": len(conversations),
            "total_responses": total_responses,
            "conversations_analyzed": len(analyzed_conversations),
            "conversation_ids": [str(c.id) for c in conversations],
            "computation_duration_ms": duration_ms
        }

    def _aggregate_question_insights(
        self,
        conversations: List[Conversation],
        analysis_map: Dict
    ) -> List[Dict[str, Any]]:
        """Aggregate insights for matching questions across conversations."""
        # Group questions by text (exact match)
        question_groups = defaultdict(list)

        for conv in conversations:
            analysis = analysis_map.get(conv.id)
            if not analysis or not analysis.question_analyses:
                continue

            for qa in analysis.question_analyses:
                question_text = qa.get("question_text", "").lower().strip()
                question_groups[question_text].append({
                    "conversation_id": str(conv.id),
                    "conversation_title": conv.title,
                    "activated_at": conv.activated_at.isoformat() if conv.activated_at else None,
                    "analysis": qa
                })

        # Aggregate each question group
        aggregated = []
        for question_text, group_data in question_groups.items():
            if len(group_data) == 0:
                continue

            # Use first analysis as template
            first_qa = group_data[0]["analysis"]
            question_type = first_qa.get("question_type", "text")

            aggregated_qa = {
                "question_text": first_qa.get("question_text", question_text),
                "question_type": question_type,
                "total_responses": sum(qa["analysis"].get("response_count", 0) for qa in group_data),
                "conversation_count": len(group_data)
            }

            if question_type == "text":
                # Aggregate themes - preserve rich details
                theme_map = defaultdict(lambda: {
                    "frequency": 0,
                    "conversations": [],
                    "summaries": [],
                    "perspectives_list": [],
                    "key_points_list": [],
                    "original_name": None  # Preserve original capitalization
                })

                for qa_data in group_data:
                    themes = qa_data["analysis"].get("themes", [])
                    for theme in themes:
                        theme_name_lower = theme.get("theme", "").lower().strip()
                        theme_name_original = theme.get("theme", "").strip()

                        theme_map[theme_name_lower]["frequency"] += theme.get("frequency", 0)
                        theme_map[theme_name_lower]["conversations"].append(qa_data["conversation_id"])

                        # Preserve original name (use first occurrence)
                        if theme_map[theme_name_lower]["original_name"] is None:
                            theme_map[theme_name_lower]["original_name"] = theme_name_original

                        # Preserve theme details
                        if theme.get("summary"):
                            theme_map[theme_name_lower]["summaries"].append(theme["summary"])
                        if theme.get("perspectives"):
                            theme_map[theme_name_lower]["perspectives_list"].extend(theme["perspectives"])
                        if theme.get("key_points"):
                            theme_map[theme_name_lower]["key_points_list"].extend(theme["key_points"])

                # Convert to list, sorted by frequency
                aggregated_themes = []
                for name_lower, data in sorted(theme_map.items(), key=lambda x: x[1]["frequency"], reverse=True)[:10]:
                    theme_obj = {
                        "theme": data["original_name"] or name_lower.title(),  # Use original capitalization
                        "frequency": data["frequency"],
                        "conversation_count": len(set(data["conversations"]))
                    }

                    # Add summary (use most common or first)
                    if data["summaries"]:
                        # Use the first summary as primary, or most common if available
                        theme_obj["summary"] = data["summaries"][0]

                    # Aggregate perspectives (merge and deduplicate by name)
                    if data["perspectives_list"]:
                        perspective_map = {}
                        for p in data["perspectives_list"]:
                            p_name = p.get("name", "").lower()
                            if p_name not in perspective_map:
                                perspective_map[p_name] = {
                                    "name": p.get("name", ""),
                                    "summary": p.get("summary", ""),
                                    "count": 0
                                }
                            perspective_map[p_name]["count"] += p.get("count", 0)
                        theme_obj["perspectives"] = list(perspective_map.values())

                    # Aggregate key points (deduplicate)
                    if data["key_points_list"]:
                        # Remove duplicates while preserving order
                        seen = set()
                        unique_points = []
                        for point in data["key_points_list"]:
                            point_lower = point.lower().strip()
                            if point_lower not in seen:
                                seen.add(point_lower)
                                unique_points.append(point)
                        theme_obj["key_points"] = unique_points[:10]  # Limit to 10

                    aggregated_themes.append(theme_obj)

                aggregated_qa["themes"] = aggregated_themes

                # Also include question summaries if available (for questions without themes)
                summaries = [qa["analysis"].get("summary") for qa in group_data if qa["analysis"].get("summary")]
                if summaries and not aggregated_themes:
                    # Use the first summary as a fallback
                    aggregated_qa["summary"] = summaries[0]

            elif question_type == "rating":
                # Aggregate rating stats
                all_ratings = []
                for qa_data in group_data:
                    rating_stats = qa_data["analysis"].get("rating_stats")
                    if rating_stats:
                        avg = rating_stats.get("average", 0)
                        count = rating_stats.get("total_responses", 0)
                        # Weight by response count
                        all_ratings.extend([avg] * count)

                if all_ratings:
                    # Get scale from first available rating_stats
                    scale_min = None
                    scale_max = None
                    for qa_data in group_data:
                        rs = qa_data["analysis"].get("rating_stats")
                        if rs and rs.get("scale_max") is not None:
                            scale_min = rs.get("scale_min", 1)
                            scale_max = rs["scale_max"]
                            break

                    aggregated_qa["rating_stats"] = {
                        "average": float(np.mean(all_ratings)),
                        "min_value": int(np.min(all_ratings)),
                        "max_value": int(np.max(all_ratings)),
                        "scale_min": scale_min,
                        "scale_max": scale_max,
                        "total_responses": len(all_ratings)
                    }

            elif question_type in ["single_choice", "multiple_choice"]:
                # Aggregate poll stats
                choice_map = defaultdict(int)
                total = 0
                for qa_data in group_data:
                    poll_stats = qa_data["analysis"].get("poll_stats")
                    if poll_stats:
                        for choice in poll_stats.get("choices", []):
                            choice_map[choice.get("label", "")] += choice.get("count", 0)
                            total += choice.get("count", 0)

                aggregated_qa["poll_stats"] = {
                    "total_responses": total,
                    "choices": [
                        {
                            "label": label,
                            "count": count,
                            "percentage": round((count / total * 100) if total > 0 else 0, 1)
                        }
                        for label, count in sorted(choice_map.items(), key=lambda x: x[1], reverse=True)
                    ]
                }

            aggregated.append(aggregated_qa)

        return aggregated

    def _generate_collection_summary(
        self,
        conversations: List[Conversation],
        analysis_map: Dict,
        question_insights: List[Dict]
    ) -> str:
        """Generate AI summary of the entire collection."""
        if not question_insights:
            return "No insights available for this collection."

        # Build context with rich details
        summaries = []
        theme_details = []

        for qa in question_insights[:5]:  # Top 5 questions
            q_text = qa["question_text"]
            q_type = qa["question_type"]
            count = qa["total_responses"]

            if q_type == "text":
                if qa.get("themes") and len(qa["themes"]) > 0:
                    # Include theme details
                    for theme in qa["themes"][:2]:  # Top 2 themes per question
                        theme_name = theme.get("theme", "")
                        theme_summary = theme.get("summary", "")
                        if theme_summary:
                            theme_details.append(f"  - {theme_name}: {theme_summary}")
                        else:
                            theme_details.append(f"  - {theme_name} (mentioned {theme.get('frequency', 0)} times)")
                    summaries.append(f"- \"{q_text}\": {len(qa['themes'])} theme(s) identified ({count} responses)")
                elif qa.get("summary"):
                    # Use question summary if no themes
                    summaries.append(f"- \"{q_text}\": {qa['summary'][:150]}... ({count} responses)")
                else:
                    summaries.append(f"- \"{q_text}\": {count} text responses")
            elif q_type == "rating" and qa.get("rating_stats"):
                avg = qa["rating_stats"]["average"]
                s_max = qa["rating_stats"].get("scale_max", 10)
                summaries.append(f"- \"{q_text}\": Average {avg:.1f}/{s_max} ({count} responses)")
            elif q_type in ["single_choice", "multiple_choice"] and qa.get("poll_stats"):
                top_choice = qa["poll_stats"]["choices"][0] if qa["poll_stats"]["choices"] else None
                if top_choice:
                    summaries.append(f"- \"{q_text}\": {top_choice['label']} ({top_choice['percentage']}%, {count} responses)")

        # If no summaries built, try to use what we have
        if not summaries:
            for qa in question_insights[:3]:
                q_text = qa["question_text"]
                q_type = qa["question_type"]
                count = qa["total_responses"]
                if q_type == "text" and qa.get("summary"):
                    summaries.append(f"- \"{q_text}\": {qa['summary'][:100]}...")
                elif q_type == "text":
                    summaries.append(f"- \"{q_text}\": {count} text responses")
                elif q_type == "rating":
                    summaries.append(f"- \"{q_text}\": {count} ratings")
                elif q_type in ["single_choice", "multiple_choice"]:
                    summaries.append(f"- \"{q_text}\": {count} poll responses")

        total_responses = sum(qa['total_responses'] for qa in question_insights)
        analyzed_count = len([c for c in conversations if c.id in analysis_map])

        # Also collect overall summaries from individual conversations
        individual_summaries = []
        for conv in conversations:
            analysis = analysis_map.get(conv.id)
            if analysis and analysis.overall_summary:
                individual_summaries.append(analysis.overall_summary)

        if not summaries and not theme_details:
            return f"This collection contains {len(conversations)} conversations with {total_responses} total responses. {analyzed_count} conversation(s) have been analyzed."

        # Build comprehensive prompt
        prompt_parts = [
            f"You are summarizing insights aggregated across {len(conversations)} conversations in this collection ({analyzed_count} analyzed).",
            f"Total responses analyzed: {total_responses}",
            "",
            "IMPORTANT: This is an AGGREGATED summary across multiple conversations. Use plural language (e.g., 'workshops', 'conversations', 'participants across these conversations') rather than singular references (e.g., 'the workshop', 'this conversation').",
            ""
        ]

        if individual_summaries:
            prompt_parts.append("Individual conversation summaries (for context - these describe single conversations):")
            for i, summary in enumerate(individual_summaries[:3], 1):
                prompt_parts.append(f"{i}. {summary}")
            prompt_parts.append("")
            prompt_parts.append("Note: The above summaries describe individual conversations. Your task is to synthesize patterns ACROSS all conversations in the collection.")

        if summaries:
            prompt_parts.append("Key findings aggregated across questions:")
            prompt_parts.extend(summaries)
            prompt_parts.append("")

        if theme_details:
            prompt_parts.append("Detailed themes identified across conversations:")
            prompt_parts.extend(theme_details[:10])  # Limit to 10 theme details
            prompt_parts.append("")

        prompt_parts.append("Provide a concise 2-3 sentence summary that synthesizes these insights and highlights the most important patterns and themes across this collection. Use plural language and refer to the collection as a whole, not individual conversations.")
        prompt_parts.append("")
        prompt_parts.append("IMPORTANT: Write in plain text only. Do not use any markdown formatting (no **bold**, no *italic*, no bullet points with -, no headers with #).")

        prompt = "\n".join(prompt_parts)

        # Log the input prompt (using both print and logger for visibility)
        print("=" * 80)
        print("COLLECTION SUMMARY - CLAUDE API CALL")
        print("=" * 80)
        print(f"Prompt length: {len(prompt)} characters")
        print(f"\nFull prompt:\n{prompt}")
        print("=" * 80)
        logger.info("Generating collection summary - Claude API call")
        logger.debug(f"Collection summary prompt (length: {len(prompt)}):\n{prompt}")

        try:
            message = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=400,  # Increased for richer summaries
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text.strip()

            # Log the response (using both print and logger for visibility)
            print("=" * 80)
            print("COLLECTION SUMMARY - CLAUDE API RESPONSE")
            print("=" * 80)
            print(f"Response length: {len(response_text)} characters")
            print(f"\nFull response:\n{response_text}")
            print("=" * 80)
            logger.info(f"Collection summary response received (length: {len(response_text)})")
            logger.debug(f"Collection summary response:\n{response_text}")

            return response_text
        except Exception as e:
            print("=" * 80)
            print("COLLECTION SUMMARY - CLAUDE API ERROR")
            print("=" * 80)
            print(f"Error: {str(e)}")
            print("=" * 80)
            logger.error(f"Error generating collection summary: {str(e)}", exc_info=True)

            # Fallback with more context
            if individual_summaries:
                return individual_summaries[0]  # Use first individual summary as fallback
            if summaries:
                return f"This collection of {len(conversations)} conversations ({analyzed_count} analyzed) includes {total_responses} responses. {summaries[0] if summaries else ''}"
            return f"This collection contains {len(conversations)} conversations with {total_responses} total responses. {analyzed_count} conversation(s) have been analyzed."

    def _generate_collection_insights(
        self,
        conversations: List[Conversation],
        analysis_map: Dict,
        question_insights: List[Dict]
    ) -> List[Dict[str, str]]:
        """Generate surprising cross-conversation insights."""
        # Collect all surprising insights from individual conversations
        all_insights = []
        for conv in conversations:
            analysis = analysis_map.get(conv.id)
            if analysis and analysis.surprising_insights:
                for insight in analysis.surprising_insights:
                    # Only include title and description (remove conversation_title if present)
                    insight_dict = {
                        "title": insight.get("title", ""),
                        "description": insight.get("description", "")
                    }
                    if insight_dict["title"] and insight_dict["description"]:
                        all_insights.append(insight_dict)

        # If we have enough data, generate cross-conversation insights
        if len(conversations) >= 2 and question_insights:
            # Look for patterns across conversations
            insights = []

            # Check for consistent themes
            for qa in question_insights:
                if qa.get("themes") and len(qa["themes"]) > 0:
                    top_theme = qa["themes"][0]
                    if top_theme["conversation_count"] >= len(conversations) * 0.5:
                        theme_summary = top_theme.get("summary", "")
                        description = f"This theme appears consistently across {top_theme['conversation_count']} conversations, mentioned {top_theme['frequency']} times total."
                        if theme_summary:
                            description += f" {theme_summary}"
                        insights.append({
                            "title": f"Recurring Theme: {top_theme.get('theme', 'Unknown')}",
                            "description": description
                        })

            # Combine with individual insights
            combined = insights + all_insights
            return combined[:5]  # Top 5

        return all_insights[:5]  # Return individual insights if not enough for cross-analysis

    def _generate_trends(
        self,
        conversations: List[Conversation],
        analysis_map: Dict,
        period: str = "monthly"
    ) -> Dict[str, Any]:
        """
        Generate trend evolution data.

        Returns trends with themes normalized to 3 words or less,
        with normalized scores (0-1) over time periods.
        """
        # Need at least 2 conversations with different activation dates for trends
        activated_conversations = [c for c in conversations if c.activated_at]
        if len(activated_conversations) < 2:
            return {
                "period": period,
                "themes": []
            }

        # Group conversations by time period
        period_groups = defaultdict(list)

        for conv in activated_conversations:
            period_key = self._get_period_key(conv.activated_at, period)
            period_groups[period_key].append(conv)

        # Group questions by text
        question_groups = defaultdict(lambda: defaultdict(list))

        for period_key, convs in period_groups.items():
            for conv in convs:
                analysis = analysis_map.get(conv.id)
                if not analysis or not analysis.question_analyses:
                    continue

                for qa in analysis.question_analyses:
                    question_text = qa.get("question_text", "").lower().strip()
                    if qa.get("question_type") == "text" and qa.get("themes"):
                        for theme in qa.get("themes", []):
                            question_groups[question_text][theme.get("theme", "")].append({
                                "period": period_key,
                                "frequency": theme.get("frequency", 0),
                                "conversation_id": str(conv.id),
                                "activated_at": conv.activated_at
                            })

        # Build trend data
        trends = []
        all_periods = sorted(set(period_groups.keys()))

        for question_text, theme_map in question_groups.items():
            for theme_name, period_data in theme_map.items():
                # Normalize theme name to 3 words or less
                normalized_theme = self._normalize_theme_name(theme_name)

                # Calculate normalized scores for each period
                data_points = []
                max_frequency = max(
                    (sum(d["frequency"] for d in period_data if d["period"] == p)
                     for p in all_periods),
                    default=1
                )

                for period_key in all_periods:
                    period_entries = [d for d in period_data if d["period"] == period_key]
                    if not period_entries:
                        continue

                    frequency = sum(d["frequency"] for d in period_entries)
                    conversation_count = len(set(d["conversation_id"] for d in period_entries))

                    # Normalized score (0-1)
                    normalized_score = frequency / max_frequency if max_frequency > 0 else 0

                    # Get period boundaries
                    period_start, period_end = self._get_period_boundaries(period_key, period_type=period)

                    data_points.append({
                        "period": period_key,
                        "period_start": period_start.isoformat(),
                        "period_end": period_end.isoformat(),
                        "normalized_score": round(normalized_score, 3),
                        "frequency": frequency,
                        "conversation_count": conversation_count
                    })

                if len(data_points) >= 2:  # Need at least 2 points for a trend
                    trends.append({
                        "theme_id": self._theme_to_id(normalized_theme),
                        "theme_name": normalized_theme,
                        "question_text": question_text,
                        "data_points": sorted(data_points, key=lambda x: x["period"])
                    })

        return {
            "period": period,
            "themes": sorted(trends, key=lambda x: max(d["normalized_score"] for d in x["data_points"]), reverse=True)[:20]  # Top 20
        }

    def _normalize_theme_name(self, theme: str) -> str:
        """Normalize theme name to 3 words or less."""
        words = theme.split()[:3]
        return " ".join(words)

    def _theme_to_id(self, theme: str) -> str:
        """Convert theme name to ID (lowercase, no spaces)."""
        return theme.lower().replace(" ", "_").replace("-", "_")

    def _get_period_key(self, dt: datetime, period: str) -> str:
        """Get period key for a datetime."""
        if period == "daily":
            return dt.strftime("%Y-%m-%d")
        elif period == "weekly":
            # ISO week
            year, week, _ = dt.isocalendar()
            return f"{year}-W{week:02d}"
        else:  # monthly
            return dt.strftime("%Y-%m")

    def _get_period_boundaries(self, period_key: str, period_type: str) -> tuple:
        """Get start and end datetime for a period."""
        if period_type == "daily":
            dt = datetime.strptime(period_key, "%Y-%m-%d")
            return dt, dt + timedelta(days=1) - timedelta(seconds=1)
        elif period_type == "weekly":
            # Parse ISO week format: YYYY-Www
            year, week_str = period_key.split("-W")
            year, week = int(year), int(week_str)
            # Find the first Thursday of the year (ISO week 1 contains Jan 4)
            jan4 = datetime(year, 1, 4)
            jan4_weekday = jan4.weekday()  # Monday = 0, Thursday = 3
            # Days to subtract to get to Monday of week 1
            days_to_monday = (jan4_weekday) % 7
            week1_monday = jan4 - timedelta(days=days_to_monday)
            # Calculate start of requested week
            week_start = week1_monday + timedelta(weeks=week - 1)
            week_end = week_start + timedelta(days=7) - timedelta(seconds=1)
            return week_start, week_end
        else:  # monthly
            dt = datetime.strptime(period_key, "%Y-%m")
            # Last day of month
            if dt.month == 12:
                next_month = dt.replace(year=dt.year + 1, month=1)
            else:
                next_month = dt.replace(month=dt.month + 1)
            return dt, next_month - timedelta(seconds=1)

