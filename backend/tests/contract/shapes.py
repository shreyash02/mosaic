"""Frontend TypeScript type shapes for contract validation.

Each shape is a dict mapping field names to expected types.
Types can be:
  - A Python type (str, int, bool, float)
  - A tuple of types for union (str, type(None)) means string | null
  - "optional" means the key may be absent entirely
  - A dict for nested object validation
  - A list with one element for array-of-shape validation

These mirror the TypeScript interfaces in frontend/src/types/index.ts.
"""

# Sentinel for optional fields (may be absent from response)
OPTIONAL = "optional"


def assert_shape(data: dict, shape: dict, path: str = "root"):
    """Validate that a response dict matches the expected shape.

    Args:
        data: The API response dict to validate
        shape: Expected shape definition
        path: Current path for error messages
    """
    assert isinstance(data, dict), f"{path}: expected dict, got {type(data).__name__}"

    for field, expected in shape.items():
        if expected is OPTIONAL:
            # Field may or may not be present — no validation needed
            continue

        if isinstance(expected, tuple) and OPTIONAL in expected:
            # Optional field with type constraint — skip if absent
            if field not in data:
                continue
            # Field is present — validate its type (excluding OPTIONAL sentinel)
            types = tuple(t for t in expected if t is not OPTIONAL)
            value = data[field]
            if value is not None:
                assert isinstance(value, types), (
                    f"{path}.{field}: expected {types}, got {type(value).__name__} = {value!r}"
                )
            continue

        assert field in data, (
            f"{path}: missing required field '{field}'. "
            f"Available fields: {list(data.keys())}"
        )

        value = data[field]

        if isinstance(expected, tuple):
            # Union type — e.g., (str, type(None))
            if value is not None:
                real_types = tuple(t for t in expected if t is not type(None))
                assert isinstance(value, real_types), (
                    f"{path}.{field}: expected {expected}, got {type(value).__name__} = {value!r}"
                )
        elif isinstance(expected, dict):
            # Nested object
            assert_shape(value, expected, path=f"{path}.{field}")
        elif isinstance(expected, list) and len(expected) == 1 and isinstance(expected[0], dict):
            # Array of objects
            assert isinstance(value, list), (
                f"{path}.{field}: expected list, got {type(value).__name__}"
            )
            for i, item in enumerate(value):
                assert_shape(item, expected[0], path=f"{path}.{field}[{i}]")
        elif expected is not None:
            # Simple type check
            assert isinstance(value, expected), (
                f"{path}.{field}: expected {expected.__name__}, got {type(value).__name__} = {value!r}"
            )


def assert_list_of(data: list, shape: dict, path: str = "root"):
    """Validate that a response is a list of objects matching shape."""
    assert isinstance(data, list), f"{path}: expected list, got {type(data).__name__}"
    for i, item in enumerate(data):
        assert_shape(item, shape, path=f"{path}[{i}]")


# ============================================================================
# Frontend TypeScript shapes
# ============================================================================

USER_SHAPE = {
    "id": str,
    "email": str,
    "full_name": (str, type(None)),
    "email_verified": bool,
    "created_at": str,
    "updated_at": str,
    "profile_image_url": (str, type(None), OPTIONAL),
}

AUTH_RESPONSE_SHAPE = {
    "access_token": str,
    "refresh_token": str,
    "token_type": str,
}

USER_WITH_AUTH_INFO_SHAPE = {
    **USER_SHAPE,
    "has_password": bool,
    "has_google": bool,
}

EMAIL_PREFERENCES_SHAPE = {
    "conversation_invitations": bool,
    "organization_invitations": bool,
    "closing_reminders": bool,
    "announcements": bool,
    "conversation_closed": bool,
    "analysis_ready": bool,
    "periodic_analysis": bool,
    "recurring_instances": bool,
}

ONBOARDING_PROGRESS_SHAPE = {
    "checklists": dict,
}

QUESTION_SHAPE = {
    "id": str,
    "conversation_id": str,
    "question_text": str,
    "question_type": str,
    "question_order": int,
    "is_required": (bool, OPTIONAL),
    "options": (dict, type(None), OPTIONAL),
    "question_image_url": (str, type(None), OPTIONAL),
    "created_at": str,
}

CONVERSATION_SHAPE = {
    "id": str,
    "creator_id": str,
    "title": str,
    "anonymity_level": str,
    "results_access": str,
    "access_code": str,
    "state": str,
    "created_at": str,
    "updated_at": str,
    "description": (str, type(None), OPTIONAL),
    "invite_only": (bool, OPTIONAL),
    "auto_analyze": (bool, OPTIONAL),
    "show_verbatim_responses": (bool, OPTIONAL),
    "allow_response_editing": (bool, OPTIONAL),
    "max_response_length": (int, OPTIONAL),
    "manual_close_enabled": (bool, OPTIONAL),
    "time_extension_enabled": (bool, OPTIONAL),
    "timezone": (str, type(None), OPTIONAL),
    "activated_at": (str, type(None), OPTIONAL),
    "closed_at": (str, type(None), OPTIONAL),
    "analyzed_at": (str, type(None), OPTIONAL),
    "duration_minutes": (int, type(None), OPTIONAL),
    "scheduled_activate_at": (str, type(None), OPTIONAL),
    "auto_close_at": (str, type(None), OPTIONAL),
    "organization_id": (str, type(None), OPTIONAL),
    "workspace_id": (str, type(None), OPTIONAL),
    "questions": OPTIONAL,
    "share_token": (str, type(None), OPTIONAL),
    "is_archived": (bool, OPTIONAL),
    "response_threshold": (int, type(None), OPTIONAL),
    "is_continuous": (bool, OPTIONAL),
    "context_notes": (str, type(None), OPTIONAL),
    "is_template": (bool, OPTIONAL),
    "series_id": (str, type(None), OPTIONAL),
    "is_recurring_instance": (bool, OPTIONAL),
    "recurrence_pattern": (str, type(None), OPTIONAL),
    "brand_logo_url": (str, type(None), OPTIONAL),
    "brand_name": (str, type(None), OPTIONAL),
}

CONVERSATION_LIST_ITEM_SHAPE = {
    "id": str,
    "title": str,
    "state": str,
    "anonymity_level": str,
    "access_code": str,
    "created_at": str,
    "activated_at": (str, type(None), OPTIONAL),
    "closed_at": (str, type(None), OPTIONAL),
    "response_count": (int, OPTIONAL),
    "unique_participants": (int, OPTIONAL),
    "timezone": (str, type(None), OPTIONAL),
    "organization_id": (str, type(None), OPTIONAL),
    "workspace_id": (str, type(None), OPTIONAL),
    "is_follow_up": (bool, OPTIONAL),
    "is_template": (bool, OPTIONAL),
    "is_continuous": (bool, OPTIONAL),
    "is_archived": (bool, OPTIONAL),
    "series_id": (str, type(None), OPTIONAL),
    "is_recurring_instance": (bool, OPTIONAL),
}

RESPONSE_STATS_SHAPE = {
    "total_responses": int,
    "unique_participants": int,
    "responses_by_question": dict,
}

RESPONSE_CHECK_SHAPE = {
    "has_submitted": bool,
    "can_edit": (bool, OPTIONAL),
    "message": (str, OPTIONAL),
}

DRAFT_SAVE_RESPONSE_SHAPE = {
    "success": bool,
    "last_saved_at": str,
    "message": str,
}

DRAFT_LOAD_RESPONSE_SHAPE = {
    "has_draft": bool,
    "last_saved_at": (str, type(None), OPTIONAL),
    "responses": list,
    "reveal_consent": bool,
}

CODE_VALIDATION_SHAPE = {
    "valid": bool,
    "message": str,
    "conversation_id": (str, type(None), OPTIONAL),
    "requires_participant_code": (bool, OPTIONAL),
    "requires_login": (bool, OPTIONAL),
    "session_token": (str, type(None), OPTIONAL),
    "has_submitted": (bool, OPTIONAL),
    "conversation_state": (str, type(None), OPTIONAL),
}

ANALYSIS_SHAPE = {
    "id": str,
    "conversation_id": str,
    "overall_summary": (str, type(None)),
    "themes": list,
    "question_analyses": list,
    "total_responses_analyzed": int,
    "created_at": str,
    "surprising_insights": (list, type(None), OPTIONAL),
    "context_notes_snapshot": (str, type(None), OPTIONAL),
    "embedding_provider": (str, type(None), OPTIONAL),
    "embedding_model": (str, type(None), OPTIONAL),
    "clustering_algorithm": (str, type(None), OPTIONAL),
    "llm_provider": (str, type(None), OPTIONAL),
    "llm_model": (str, type(None), OPTIONAL),
    "num_clusters_found": (int, OPTIONAL),
    "analysis_duration_ms": (int, float, type(None), OPTIONAL),
}

ANALYSIS_LIST_RESPONSE_SHAPE = {
    "conversation_id": str,
    "total": int,
    "analyses": list,
}

SUGGESTED_ACTION_SHAPE = {
    "id": str,
    "analysis_id": str,
    "conversation_id": str,
    "title": str,
    "description": str,
    "action_type": str,
    "priority": str,
    "sentiment": str,
    "source": str,
    "status": str,
    "created_at": str,
    "related_cluster_ids": (list, OPTIONAL),
    "response_percentage": (int, float, type(None), OPTIONAL),
    "dismissed_reason": (str, type(None), OPTIONAL),
    "accepted_at": (str, type(None), OPTIONAL),
    "completed_at": (str, type(None), OPTIONAL),
    "dismissed_at": (str, type(None), OPTIONAL),
    "deferred_at": (str, type(None), OPTIONAL),
    "updated_at": (str, type(None), OPTIONAL),
    "created_by_id": (str, type(None), OPTIONAL),
}

SUGGESTED_ACTIONS_RESPONSE_SHAPE = {
    "analysis_id": str,
    "conversation_id": str,
    "actions": list,
    "total": int,
}

INSIGHT_ANNOTATION_SHAPE = {
    "id": str,
    "analysis_id": str,
    "target_type": str,
    "target_key": dict,
    "starred": bool,
    "note": (str, type(None)),
    "created_at": str,
    "updated_at": (str, type(None)),
}

ANNOTATIONS_LIST_RESPONSE_SHAPE = {
    "analysis_id": str,
    "annotations": list,
    "total": int,
}

ORGANIZATION_SHAPE = {
    "id": str,
    "name": str,
    "created_by": str,
    "created_at": str,
    "updated_at": str,
    "description": (str, type(None), OPTIONAL),
    "brand_logo_url": (str, type(None), OPTIONAL),
    "brand_name": (str, type(None), OPTIONAL),
}

ORGANIZATION_MEMBER_SHAPE = {
    "id": (str, int),  # May be int or str depending on serialization
    "organization_id": str,
    "user_id": str,
    "role": str,
    "joined_at": str,
}

ORGANIZATION_WITH_MEMBERS_SHAPE = {
    **ORGANIZATION_SHAPE,
    "members": list,
}

NOTIFICATION_SHAPE = {
    "id": str,
    # NOTE: Backend does not return user_id — frontend Notification type
    # includes it but the backend NotificationResponse schema omits it.
    "notification_type": str,
    "title": str,
    "message": (str, type(None)),
    "read": bool,
    "created_at": str,
    "entity_type": (str, type(None), OPTIONAL),
    "entity_id": (str, type(None), OPTIONAL),
    "data": (dict, type(None), OPTIONAL),
}

NOTIFICATION_LIST_RESPONSE_SHAPE = {
    "notifications": list,
    "total": int,
    # NOTE: Backend returns has_more (bool), not unread_count.
    # Frontend NotificationListResponse expects unread_count — the frontend
    # fetches it separately via GET /notifications/unread-count.
    "has_more": bool,
}

UNREAD_COUNT_RESPONSE_SHAPE = {
    # NOTE: Backend returns {"count": N}, but frontend UnreadCountResponse
    # expects {"unread_count": N}. The frontend api.ts maps this field.
    "count": int,
}

SUCCESS_RESPONSE_SHAPE = {
    "success": bool,
    "message": str,
}

WORKSPACE_SHAPE = {
    "id": str,
    "type": str,
    "name": str,
    "owner_id": str,
    "is_default": bool,
    "visibility": str,
    "description": (str, type(None), OPTIONAL),
    "organization_id": (str, type(None), OPTIONAL),
}
