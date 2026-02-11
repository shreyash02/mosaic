"""Encryption utilities for storing sensitive tokens."""

import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import settings


def _get_encryption_key() -> bytes:
    """Derive a Fernet-compatible encryption key from SECRET_KEY.

    Uses SHA256 to derive a 32-byte key, then base64 encodes it
    for Fernet compatibility.
    """
    key_material = f"{settings.SECRET_KEY}_slack_tokens".encode()
    derived_key = hashlib.sha256(key_material).digest()
    return base64.urlsafe_b64encode(derived_key)


def encrypt_token(token: str) -> str:
    """Encrypt a token for secure storage.

    Args:
        token: The plaintext token to encrypt

    Returns:
        Base64-encoded encrypted token
    """
    fernet = Fernet(_get_encryption_key())
    encrypted = fernet.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a stored token.

    Args:
        encrypted_token: The encrypted token from storage

    Returns:
        The decrypted plaintext token

    Raises:
        cryptography.fernet.InvalidToken: If decryption fails
    """
    fernet = Fernet(_get_encryption_key())
    decrypted = fernet.decrypt(encrypted_token.encode())
    return decrypted.decode()
