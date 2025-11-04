"""
Analytics utilities for tracking user behavior and platform metrics.
"""
import logging
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger('dieselnoi.analytics')

User = get_user_model()


def track_event(
    event_type: str,
    user: Optional[User] = None,
    event_data: Optional[Dict[str, Any]] = None,
    request: Optional[Any] = None
):
    """
    Track a user event for analytics.

    Args:
        event_type: Type of event (e.g., 'login', 'course_view')
        user: User who performed the action (optional)
        event_data: Additional data about the event
        request: Django request object for metadata
    """
    try:
        # Import here to avoid circular imports
        from .models_analytics import UserActivity

        # Prepare event data
        event_data = event_data or {}
        ip_address = None
        user_agent = ''
        referrer = ''

        if request:
            # Get client IP address
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0]
            else:
                ip_address = request.META.get('REMOTE_ADDR')

            user_agent = request.META.get('HTTP_USER_AGENT', '')
            referrer = request.META.get('HTTP_REFERER', '')

        # Create activity record
        UserActivity.objects.create(
            user=user,
            event_type=event_type,
            event_data=event_data,
            ip_address=ip_address,
            user_agent=user_agent[:1000],  # Limit length
            referrer=referrer[:500],  # Limit length
        )

        # Log the event
        user_str = user.username if user else 'Anonymous'
        logger.info(f"Event tracked: {event_type} - {user_str}", extra={
            'event_type': event_type,
            'user_id': user.id if user else None,
            'event_data': event_data
        })

    except Exception as e:
        # Don't fail the request if analytics tracking fails
        logger.error(f"Failed to track event: {e}", exc_info=True)


def track_video_view(
    user: User,
    lesson,
    watch_duration_seconds: int,
    completion_percentage: float,
    session_id: str
):
    """
    Track video viewing analytics.

    Args:
        user: User watching the video
        lesson: Lesson being watched
        watch_duration_seconds: Total watch time
        completion_percentage: How much of the video was watched
        session_id: Unique session identifier
    """
    try:
        from .models_analytics import VideoAnalytics

        VideoAnalytics.objects.create(
            user=user,
            lesson=lesson,
            watch_duration_seconds=watch_duration_seconds,
            completion_percentage=completion_percentage,
            session_id=session_id,
            ended_at=timezone.now()
        )

        logger.info(f"Video analytics tracked: {user.username} - {lesson.title}", extra={
            'user_id': user.id,
            'lesson_id': lesson.id,
            'watch_duration': watch_duration_seconds,
            'completion': completion_percentage
        })

    except Exception as e:
        logger.error(f"Failed to track video analytics: {e}", exc_info=True)


def get_user_engagement_score(user: User) -> float:
    """
    Calculate a simple engagement score for a user (0-100).

    Factors:
    - Number of lessons completed
    - Total watch time
    - Comments created
    - Days since last activity
    """
    try:
        from .models import LessonProgress, Comment

        # Get user's stats
        completed_lessons = LessonProgress.objects.filter(
            user=user,
            is_completed=True
        ).count()

        total_watch_time = sum(
            progress.watch_time_seconds or 0
            for progress in LessonProgress.objects.filter(user=user)
        )

        comments_count = Comment.objects.filter(user=user).count()

        # Calculate score (simple formula)
        # Max: 40 points for lessons, 40 for watch time, 20 for comments
        lessons_score = min(completed_lessons * 2, 40)  # 2 points per lesson, max 40
        watch_time_score = min(total_watch_time / 3600, 40)  # 1 point per hour, max 40
        comments_score = min(comments_count * 2, 20)  # 2 points per comment, max 20

        total_score = lessons_score + watch_time_score + comments_score

        return round(min(total_score, 100), 2)

    except Exception as e:
        logger.error(f"Failed to calculate engagement score: {e}")
        return 0.0
