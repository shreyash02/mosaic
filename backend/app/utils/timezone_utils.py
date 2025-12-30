"""Timezone utility functions for handling datetime conversions."""

from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional


def validate_timezone(timezone_str: str) -> bool:
    """
    Validate if a timezone string is a valid IANA timezone.

    Args:
        timezone_str: IANA timezone string to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        ZoneInfo(timezone_str)
        return True
    except Exception:
        return False


# Legacy timezone mappings (old names -> current names)
TIMEZONE_ALIASES = {
    "Asia/Calcutta": "Asia/Kolkata",
}


def normalize_timezone(timezone_str: str) -> str:
    """
    Normalize a timezone string, converting legacy names to current names.

    Args:
        timezone_str: IANA timezone string (may be legacy name)

    Returns:
        Normalized timezone string

    Raises:
        ValueError: If timezone is invalid
    """
    # Convert legacy names
    normalized = TIMEZONE_ALIASES.get(timezone_str, timezone_str)

    # Validate the normalized timezone
    if not validate_timezone(normalized):
        raise ValueError(f"Invalid timezone: {timezone_str}")

    return normalized


def convert_local_to_utc(local_datetime: datetime, timezone_str: str) -> datetime:
    """
    Convert a local datetime (naive) to UTC, interpreting it in the given timezone.

    Args:
        local_datetime: Naive datetime (no timezone info)
        timezone_str: IANA timezone string (e.g., 'America/New_York', 'Asia/Kolkata')

    Returns:
        UTC datetime (naive, but represents UTC time)
    """
    # Normalize timezone (handle legacy names)
    timezone_str = normalize_timezone(timezone_str)
    if local_datetime.tzinfo is not None:
        # If datetime already has timezone info, convert it
        return local_datetime.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)
    
    # Interpret the naive datetime in the given timezone
    tz = ZoneInfo(timezone_str)
    local_aware = local_datetime.replace(tzinfo=tz)
    utc_aware = local_aware.astimezone(ZoneInfo('UTC'))
    return utc_aware.replace(tzinfo=None)


def convert_utc_to_local(utc_datetime: datetime, timezone_str: str) -> datetime:
    """
    Convert a UTC datetime (naive) to local time in the given timezone.

    Args:
        utc_datetime: Naive datetime representing UTC time
        timezone_str: IANA timezone string (e.g., 'America/New_York', 'Asia/Kolkata')

    Returns:
        Local datetime (naive, but represents local time)
    """
    # Normalize timezone (handle legacy names)
    timezone_str = normalize_timezone(timezone_str)

    if utc_datetime.tzinfo is not None:
        # If datetime already has timezone info, convert it
        utc_datetime = utc_datetime.replace(tzinfo=None)

    # Interpret the naive datetime as UTC
    utc_aware = utc_datetime.replace(tzinfo=ZoneInfo('UTC'))
    local_aware = utc_aware.astimezone(ZoneInfo(timezone_str))
    return local_aware.replace(tzinfo=None)


def parse_datetime_with_timezone(dt_str: str, timezone_str: str) -> datetime:
    """
    Parse a datetime string and interpret it in the given timezone, then convert to UTC.
    
    Args:
        dt_str: ISO format datetime string (may or may not include timezone)
                 Format can be: "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", or with timezone
        timezone_str: IANA timezone string to interpret the datetime in if it's naive
    
    Returns:
        UTC datetime (naive)
    """
    # Normalize the string (handle Z suffix, ensure proper format)
    normalized = dt_str.replace('Z', '+00:00').strip()
    
    # Try to parse as ISO format (handles both with and without timezone)
    try:
        dt = datetime.fromisoformat(normalized)
    except ValueError:
        # If fromisoformat fails, try parsing common formats manually
        for fmt in ['%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M']:
            try:
                dt = datetime.strptime(normalized, fmt)
                break
            except ValueError:
                continue
        else:
            raise ValueError(f"Unable to parse datetime string: {dt_str}")
    
    # If datetime has timezone info, use it; otherwise interpret in conversation timezone
    if dt.tzinfo is None:
        return convert_local_to_utc(dt, timezone_str)
    else:
        # Convert from its timezone to UTC
        return dt.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)

