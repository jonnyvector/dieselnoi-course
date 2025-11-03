from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify


class User(AbstractUser):
    """Custom User model for the Dieselnoi platform."""
    email = models.EmailField(unique=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email


class Course(models.Model):
    """Represents a Muay Thai training course."""
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='beginner')
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Monthly subscription price in USD")
    thumbnail_url = models.URLField(blank=True, null=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['difficulty', 'title']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Lesson(models.Model):
    """Represents a single lesson within a course."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    video_url = models.CharField(max_length=500, blank=True, null=True, help_text="Legacy video URL (for non-Mux videos)")
    mux_asset_id = models.CharField(max_length=255, blank=True, null=True, help_text="Mux Asset ID")
    mux_playback_id = models.CharField(max_length=255, blank=True, null=True, help_text="Mux Playback ID")
    duration_minutes = models.PositiveIntegerField(default=0, help_text="Lesson duration in minutes")
    order = models.PositiveIntegerField(default=0, help_text="Order of lesson in the course")
    is_free_preview = models.BooleanField(default=False, help_text="Allow non-subscribers to view")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['course', 'order']
        unique_together = ['course', 'order']

    def __str__(self):
        return f"{self.course.title} - {self.order}: {self.title}"


class Subscription(models.Model):
    """Represents a user's subscription to a specific course."""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('cancelled', 'Cancelled'),
        ('trialing', 'Trialing'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='subscriptions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'course']

    def __str__(self):
        return f"{self.user.email} - {self.course.title} - {self.status}"

    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ['active', 'trialing']
