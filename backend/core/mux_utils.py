"""
Utility functions for Mux video streaming.
"""
import base64
import hashlib
import hmac
import time
from typing import Optional
from django.conf import settings


def generate_signed_playback_url(
    playback_id: str,
    expiration_seconds: int = 3600,
    **params
) -> Optional[str]:
    """
    Generate a signed Mux playback URL with expiration.

    Args:
        playback_id: The Mux playback ID
        expiration_seconds: How long the URL should be valid (default 1 hour)
        **params: Additional query parameters (e.g., time, token, etc.)

    Returns:
        Signed playback ID that can be used with Mux Player, or None if signing key not configured
    """
    # Check if signing key is configured
    signing_key_id = settings.MUX_SIGNING_KEY_ID if hasattr(settings, 'MUX_SIGNING_KEY_ID') else None
    signing_key_private = settings.MUX_SIGNING_KEY_PRIVATE if hasattr(settings, 'MUX_SIGNING_KEY_PRIVATE') else None

    if not signing_key_id or not signing_key_private:
        # If no signing keys configured, return the regular playback ID
        # (This allows the system to work without signed URLs in development)
        return playback_id

    # Calculate expiration timestamp
    exp = int(time.time()) + expiration_seconds

    # Build the base string to sign
    # Format: playback_id + exp
    base_string = f"{playback_id}?exp={exp}"

    # Additional params if provided
    param_string = '&'.join(f"{k}={v}" for k, v in params.items())
    if param_string:
        base_string += f"&{param_string}"

    # Generate HMAC signature
    signature = hmac.new(
        base64.b64decode(signing_key_private),
        base_string.encode('utf-8'),
        hashlib.sha256
    ).digest()

    # Base64 encode the signature (URL-safe)
    encoded_signature = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')

    # Return the signed token as: playback_id?token=signature&exp=timestamp
    return f"{playback_id}?token={encoded_signature}&exp={exp}"


def get_signed_playback_id(playback_id: str, expiration_seconds: int = 3600) -> str:
    """
    Get a signed playback ID for use with Mux Player.

    This is a simpler interface for the most common use case.

    Args:
        playback_id: The Mux playback ID
        expiration_seconds: How long the URL should be valid (default 1 hour)

    Returns:
        Signed playback ID (or regular playback ID if signing not configured)
    """
    signed_url = generate_signed_playback_url(playback_id, expiration_seconds)
    return signed_url or playback_id
