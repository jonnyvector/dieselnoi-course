"""
Authentication security utilities for progressive delays and account lockouts.
"""
import time
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from typing import Tuple, Optional


class LoginAttemptTracker:
    """Track failed login attempts and implement progressive delays."""

    # Progressive delay thresholds (attempts: delay_seconds)
    DELAY_THRESHOLDS = {
        3: 2,    # After 3 attempts: 2 second delay
        5: 5,    # After 5 attempts: 5 second delay
        7: 10,   # After 7 attempts: 10 second delay
        10: 30,  # After 10 attempts: 30 second delay
    }

    # Account lockout settings
    MAX_ATTEMPTS = 15  # Lock account after 15 failed attempts
    LOCKOUT_DURATION = 900  # Lock for 15 minutes (in seconds)

    # Cache key prefixes
    IP_PREFIX = 'login_attempts_ip'
    USER_PREFIX = 'login_attempts_user'
    LOCKOUT_PREFIX = 'account_lockout'

    # Cache expiry (1 hour - resets the counter)
    ATTEMPT_EXPIRY = 3600

    @classmethod
    def _get_ip_key(cls, ip_address: str) -> str:
        """Generate cache key for IP-based tracking."""
        return f"{cls.IP_PREFIX}:{ip_address}"

    @classmethod
    def _get_user_key(cls, username: str) -> str:
        """Generate cache key for user-based tracking."""
        return f"{cls.USER_PREFIX}:{username}"

    @classmethod
    def _get_lockout_key(cls, username: str) -> str:
        """Generate cache key for account lockout."""
        return f"{cls.LOCKOUT_PREFIX}:{username}"

    @classmethod
    def record_failed_attempt(cls, username: str, ip_address: str) -> None:
        """
        Record a failed login attempt for both username and IP.

        Args:
            username: The username that failed
            ip_address: The IP address of the request
        """
        # Track by username
        user_key = cls._get_user_key(username)
        user_attempts = cache.get(user_key, 0)
        cache.set(user_key, user_attempts + 1, cls.ATTEMPT_EXPIRY)

        # Track by IP
        ip_key = cls._get_ip_key(ip_address)
        ip_attempts = cache.get(ip_key, 0)
        cache.set(ip_key, ip_attempts + 1, cls.ATTEMPT_EXPIRY)

        # Check if we should lock the account
        if user_attempts + 1 >= cls.MAX_ATTEMPTS:
            lockout_key = cls._get_lockout_key(username)
            cache.set(lockout_key, timezone.now().isoformat(), cls.LOCKOUT_DURATION)

    @classmethod
    def clear_attempts(cls, username: str, ip_address: str) -> None:
        """
        Clear failed attempts after successful login.

        Args:
            username: The username that succeeded
            ip_address: The IP address of the request
        """
        cache.delete(cls._get_user_key(username))
        cache.delete(cls._get_ip_key(ip_address))
        cache.delete(cls._get_lockout_key(username))

    @classmethod
    def get_attempt_count(cls, username: str, ip_address: str) -> Tuple[int, int]:
        """
        Get the number of failed attempts for username and IP.

        Returns:
            Tuple of (user_attempts, ip_attempts)
        """
        user_attempts = cache.get(cls._get_user_key(username), 0)
        ip_attempts = cache.get(cls._get_ip_key(ip_address), 0)
        return user_attempts, ip_attempts

    @classmethod
    def is_locked_out(cls, username: str) -> Tuple[bool, Optional[int]]:
        """
        Check if an account is currently locked out.

        Returns:
            Tuple of (is_locked, seconds_remaining)
        """
        lockout_key = cls._get_lockout_key(username)
        lockout_time_str = cache.get(lockout_key)

        if not lockout_time_str:
            return False, None

        # Account is locked - calculate remaining time
        ttl = cache.ttl(lockout_key)
        if ttl is None or ttl <= 0:
            # Lockout expired
            cache.delete(lockout_key)
            return False, None

        return True, ttl

    @classmethod
    def get_required_delay(cls, username: str, ip_address: str) -> int:
        """
        Calculate the required delay before next login attempt.

        Returns:
            Number of seconds to delay (0 if no delay needed)
        """
        user_attempts, ip_attempts = cls.get_attempt_count(username, ip_address)
        max_attempts = max(user_attempts, ip_attempts)

        # Find the appropriate delay based on attempt count
        delay = 0
        for threshold, threshold_delay in sorted(cls.DELAY_THRESHOLDS.items()):
            if max_attempts >= threshold:
                delay = threshold_delay

        return delay

    @classmethod
    def apply_delay(cls, username: str, ip_address: str) -> None:
        """
        Apply progressive delay based on failed attempts.
        Blocks execution for the required time.

        Args:
            username: The username attempting to log in
            ip_address: The IP address of the request
        """
        delay = cls.get_required_delay(username, ip_address)
        if delay > 0:
            time.sleep(delay)


class RegistrationRateLimiter:
    """Track registration attempts to prevent abuse."""

    PREFIX = 'registration_attempts_ip'
    MAX_PER_HOUR = 10  # Maximum 10 registrations per IP per hour
    EXPIRY = 3600  # 1 hour

    @classmethod
    def _get_key(cls, ip_address: str) -> str:
        """Generate cache key for IP-based tracking."""
        return f"{cls.PREFIX}:{ip_address}"

    @classmethod
    def can_register(cls, ip_address: str) -> Tuple[bool, int]:
        """
        Check if this IP can register a new account.

        Returns:
            Tuple of (can_register, attempts_used)
        """
        key = cls._get_key(ip_address)
        attempts = cache.get(key, 0)
        return attempts < cls.MAX_PER_HOUR, attempts

    @classmethod
    def record_registration(cls, ip_address: str) -> None:
        """Record a registration attempt."""
        key = cls._get_key(ip_address)
        attempts = cache.get(key, 0)
        cache.set(key, attempts + 1, cls.EXPIRY)

    @classmethod
    def get_remaining_attempts(cls, ip_address: str) -> int:
        """Get number of remaining registration attempts."""
        key = cls._get_key(ip_address)
        attempts = cache.get(key, 0)
        return max(0, cls.MAX_PER_HOUR - attempts)


def get_client_ip(request) -> str:
    """
    Extract client IP address from request.
    Handles proxies and load balancers.

    Args:
        request: Django request object

    Returns:
        Client IP address as string
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs, get the first one
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip
