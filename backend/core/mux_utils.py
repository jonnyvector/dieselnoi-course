"""
Utility functions for Mux video streaming.
"""
import base64
import time
import jwt
from typing import Optional, Dict
from django.conf import settings


def generate_mux_jwt_token(
    playback_id: str,
    expiration_seconds: int = 3600,
    **params
) -> Optional[str]:
    """
    Generate a JWT token for Mux signed playback.

    Args:
        playback_id: The Mux playback ID
        expiration_seconds: How long the token should be valid (default 1 hour)
        **params: Additional claims (e.g., type, time, etc.)

    Returns:
        JWT token string, or None if signing key not configured
    """
    # Check if signing key is configured
    signing_key_id = settings.MUX_SIGNING_KEY_ID if hasattr(settings, 'MUX_SIGNING_KEY_ID') else None
    signing_key_private = settings.MUX_SIGNING_KEY_PRIVATE if hasattr(settings, 'MUX_SIGNING_KEY_PRIVATE') else None

    if not signing_key_id or not signing_key_private:
        # If no signing keys configured, return None
        # (This allows the system to work without signed URLs in development)
        return None

    # Calculate expiration timestamp
    exp = int(time.time()) + expiration_seconds

    # Build JWT payload
    payload = {
        'sub': playback_id,  # Subject: the playback ID
        'aud': 'v',  # Audience: 'v' for video
        'exp': exp,  # Expiration time
        'kid': signing_key_id,  # Key ID
    }

    # Add any additional params to payload
    payload.update(params)

    # Decode the base64 private key
    try:
        private_key_bytes = base64.b64decode(signing_key_private)
    except Exception as e:
        print(f"Error decoding Mux signing key: {e}")
        return None

    # Generate JWT token using RS256 (RSA with SHA-256)
    try:
        token = jwt.encode(
            payload,
            private_key_bytes,
            algorithm='RS256',
            headers={'kid': signing_key_id}
        )
        return token
    except Exception as e:
        print(f"Error generating Mux JWT: {e}")
        return None


def get_signed_playback_id(playback_id: str, expiration_seconds: int = 3600) -> str:
    """
    Get a signed playback ID for use with Mux Player.

    For Mux Player React, this returns just the playback ID.
    The JWT token should be passed separately via the `tokens` prop.

    Args:
        playback_id: The Mux playback ID
        expiration_seconds: How long the URL should be valid (default 1 hour)

    Returns:
        The playback ID (unchanged - token passed separately)
    """
    # For Mux Player React, we return just the playback ID
    # The frontend will handle the token separately
    return playback_id


def get_playback_token(playback_id: str, expiration_seconds: int = 7200) -> Optional[str]:
    """
    Get a JWT playback token for Mux Player.

    Args:
        playback_id: The Mux playback ID
        expiration_seconds: How long the token should be valid (default 2 hours)

    Returns:
        JWT token string, or None if signing not configured
    """
    return generate_mux_jwt_token(playback_id, expiration_seconds)
