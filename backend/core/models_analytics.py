"""
Analytics models for tracking user behavior and platform metrics.
"""
from django.db import models
from django.conf import settings


class VideoAnalytics(models.Model):
    """Track video viewing analytics."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='video_analytics')
    lesson = models.ForeignKey('Lesson', on_delete=models.CASCADE, related_name='analytics')

    # Viewing metrics
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    watch_duration_seconds = models.IntegerField(default=0)
    completion_percentage = models.FloatField(default=0.0)

    # User behavior
    paused_count = models.IntegerField(default=0)
    seeked_count = models.IntegerField(default=0)
    playback_speed = models.FloatField(default=1.0)

    # Session info
    session_id = models.CharField(max_length=100, db_index=True)
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'video_analytics'
        indexes = [
            models.Index(fields=['user', 'lesson']),
            models.Index(fields=['started_at']),
        ]
        verbose_name_plural = 'Video analytics'

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {self.completion_percentage}%"


class UserActivity(models.Model):
    """Track general user activity on the platform."""
    EVENT_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('signup', 'Sign Up'),
        ('course_view', 'Course Viewed'),
        ('lesson_view', 'Lesson Viewed'),
        ('subscription_created', 'Subscription Created'),
        ('subscription_cancelled', 'Subscription Cancelled'),
        ('comment_created', 'Comment Created'),
        ('search', 'Search'),
        ('error', 'Error Occurred'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES, db_index=True)
    event_data = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = 'user_activity'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]
        verbose_name_plural = 'User activities'

    def __str__(self):
        user_str = self.user.username if self.user else 'Anonymous'
        return f"{user_str} - {self.event_type} - {self.timestamp}"


class PlatformMetrics(models.Model):
    """Store daily aggregated metrics for the platform."""
    date = models.DateField(unique=True, db_index=True)

    # User metrics
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    new_signups = models.IntegerField(default=0)

    # Subscription metrics
    total_subscriptions = models.IntegerField(default=0)
    new_subscriptions = models.IntegerField(default=0)
    cancelled_subscriptions = models.IntegerField(default=0)
    mrr = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # Monthly Recurring Revenue

    # Content metrics
    lessons_watched = models.IntegerField(default=0)
    lessons_completed = models.IntegerField(default=0)
    total_watch_time_minutes = models.IntegerField(default=0)
    comments_created = models.IntegerField(default=0)

    # Engagement metrics
    avg_session_duration_minutes = models.FloatField(default=0.0)
    avg_lessons_per_user = models.FloatField(default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_metrics'
        ordering = ['-date']
        verbose_name_plural = 'Platform metrics'

    def __str__(self):
        return f"Metrics for {self.date}"
