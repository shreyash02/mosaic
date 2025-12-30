"""Utility functions for generating access codes."""

import string
import secrets


def generate_access_code(length: int = 12) -> str:
    """Generate a secure random access code."""
    alphabet = string.ascii_uppercase + string.digits
    # Exclude similar looking characters
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))
