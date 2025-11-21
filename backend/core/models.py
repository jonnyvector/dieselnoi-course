from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Avg
from django.utils.text import slugify


class User(AbstractUser):
    """Custom User model for the Dieselnoi platform."""
    email = models.EmailField(unique=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
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
    thumbnail_url = models.URLField(blank=True, null=True, help_text="Thumbnail image URL (upload to Cloudinary/Imgur)")
    is_published = models.BooleanField(default=False)

    # Cached rating data (updated via signals)
    average_rating = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True,
        help_text="Average rating from reviews"
    )
    total_reviews = models.PositiveIntegerField(default=0, help_text="Total number of reviews")

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

    def update_rating_cache(self):
        """Recalculate average rating and total reviews from all non-hidden reviews."""
        reviews = self.reviews.filter(is_hidden=False)
        self.total_reviews = reviews.count()
        if self.total_reviews > 0:
            self.average_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        else:
            self.average_rating = None
        self.save()


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
    unlock_date = models.DateTimeField(null=True, blank=True, help_text="Date and time when lesson becomes available (null = immediately available)")
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
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['user', 'course']
        indexes = [
            models.Index(fields=['course', 'status']),
            models.Index(fields=['user', 'course', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['status', 'updated_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.title} - {self.status}"

    @property
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ['active', 'trialing']


class LessonProgress(models.Model):
    """Tracks user progress through lessons."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_progress')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(blank=True, null=True)
    last_watched_at = models.DateTimeField(auto_now=True)
    watch_time_seconds = models.PositiveIntegerField(default=0, help_text="Total time watched in seconds")
    last_position_seconds = models.PositiveIntegerField(default=0, help_text="Last playback position for resume")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_watched_at']
        unique_together = ['user', 'lesson']
        verbose_name_plural = 'Lesson Progress'
        indexes = [
            models.Index(fields=['lesson', 'is_completed']),
            models.Index(fields=['user', 'lesson']),
            models.Index(fields=['lesson', 'user', 'is_completed']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} - {'Complete' if self.is_completed else 'In Progress'}"


class LessonUnlock(models.Model):
    """Tracks manual lesson unlocks for specific users (admin override)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_unlocks')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='manual_unlocks')
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'lesson']
        indexes = [
            models.Index(fields=['user', 'lesson']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} (manually unlocked)"


class Comment(models.Model):
    """Represents a comment on a lesson, with support for replies and timestamps."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField(help_text="Comment text content")
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='replies',
        null=True,
        blank=True,
        help_text="Parent comment for threaded replies"
    )
    timestamp_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Video timestamp in seconds where this comment was made"
    )
    is_edited = models.BooleanField(default=False, help_text="Has this comment been edited")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lesson', '-created_at']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        timestamp_info = f" @{self.timestamp_seconds}s" if self.timestamp_seconds else ""
        reply_info = f" (reply to #{self.parent.id})" if self.parent else ""
        return f"{self.user.username} on {self.lesson.title}{timestamp_info}{reply_info}"

    @property
    def reply_count(self):
        """Count of direct replies to this comment."""
        return self.replies.count()


class CourseReview(models.Model):
    """Represents a student review/rating for a course."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')

    # Rating & content
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    review_text = models.TextField(blank=True, max_length=2000, help_text="Optional written review")

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False, help_text="Has this review been edited")

    # Moderation
    is_hidden = models.BooleanField(default=False, help_text="Hide this review from public display")
    is_featured = models.BooleanField(default=False, help_text="Feature this review prominently")

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['course', 'is_hidden']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.title} ({self.rating}⭐)"

    def save(self, *args, **kwargs):
        """Mark as edited if rating or review_text changed."""
        if self.pk:  # Existing review
            try:
                old_review = CourseReview.objects.get(pk=self.pk)
                if (old_review.rating != self.rating or
                    old_review.review_text != self.review_text):
                    self.is_edited = True
            except CourseReview.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class CourseResource(models.Model):
    """Downloadable PDF resources for a course (training plans, guides, etc.)."""
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=200, help_text="Resource title (e.g., '8-Week Training Plan')")
    description = models.TextField(blank=True, help_text="Brief description of what this resource contains")

    # File storage (will use local storage in dev, S3 in production)
    file = models.FileField(upload_to='course_resources/', help_text="PDF file only")

    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order (lower numbers first)")

    class Meta:
        ordering = ['order', 'title']
        indexes = [
            models.Index(fields=['course', 'order']),
        ]

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    @property
    def file_size_mb(self):
        """Return file size in megabytes."""
        if self.file:
            return round(self.file.size / (1024 * 1024), 2)
        return None

    @property
    def file_size_display(self):
        """Return human-readable file size."""
        if not self.file:
            return "0 KB"

        size_bytes = self.file.size
        if size_bytes < 1024:
            return f"{size_bytes} bytes"
        elif size_bytes < 1024 * 1024:
            return f"{round(size_bytes / 1024, 1)} KB"
        else:
            return f"{round(size_bytes / (1024 * 1024), 1)} MB"


class Badge(models.Model):
    """Defines an achievement badge that users can earn."""
    CATEGORY_CHOICES = [
        ('starter', 'Starter'),
        ('completion', 'Course Completion'),
        ('engagement', 'Engagement'),
        ('watch_time', 'Watch Time'),
        ('speed', 'Speed'),
        ('streak', 'Streak'),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=50, help_text="Emoji or icon identifier")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    requirement_value = models.IntegerField(null=True, blank=True, help_text="Numeric requirement (e.g., 5 for '5 lessons')")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'requirement_value']

    def __str__(self):
        return f"{self.icon} {self.name}"


class UserBadge(models.Model):
    """Tracks which badges a user has earned."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='earned_badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='earners')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']
        indexes = [
            models.Index(fields=['user', '-earned_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.badge.name}"


class ReferralCode(models.Model):
    """Unique referral code for each user."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='referral_code')
    code = models.CharField(max_length=20, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.code}"

    @staticmethod
    def generate_code():
        """Generate a unique short referral code."""
        import random
        import string
        while True:
            # Format: DN-XXXXX (5 random alphanumeric characters)
            code = 'DN-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
            if not ReferralCode.objects.filter(code=code).exists():
                return code


class Referral(models.Model):
    """Tracks referral relationships and conversion status."""
    STATUS_CHOICES = [
        ('clicked', 'Clicked'),
        ('signed_up', 'Signed Up'),
        ('converted', 'Converted'),
        ('rewarded', 'Rewarded'),
    ]

    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_made')
    referee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referral_source', null=True, blank=True)
    code_used = models.CharField(max_length=20)

    # Tracking timestamps
    clicked_at = models.DateTimeField(null=True, blank=True)
    signed_up_at = models.DateTimeField(null=True, blank=True)
    first_subscription_at = models.DateTimeField(null=True, blank=True)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='clicked')

    # Fraud prevention
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['referrer', '-created_at']),
            models.Index(fields=['code_used']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        referee_name = self.referee.username if self.referee else 'Anonymous'
        return f"{self.referrer.username} → {referee_name} ({self.status})"


class ReferralCredit(models.Model):
    """Credits earned from successful referrals."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referral_credits')
    referral = models.OneToOneField(Referral, on_delete=models.CASCADE, related_name='credit')

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=10.00)
    earned_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    # Usage tracking
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_for_subscription = models.ForeignKey('Subscription', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['expires_at']  # Use oldest credits first
        indexes = [
            models.Index(fields=['user', 'used', 'expires_at']),
        ]

    def __str__(self):
        status = "Used" if self.used else "Available"
        return f"{self.user.username} - ${self.amount} ({status})"

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at


class ReferralFraudCheck(models.Model):
    """Fraud detection for referral signups."""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    referral = models.OneToOneField(Referral, on_delete=models.CASCADE, related_name='fraud_check')

    # Fraud detection flags
    same_ip = models.BooleanField(default=False)
    same_device = models.BooleanField(default=False)
    rapid_signup = models.BooleanField(default=False)
    disposable_email = models.BooleanField(default=False)

    # Results
    fraud_score = models.IntegerField(default=0, help_text="0-100 fraud risk score")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Review
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='fraud_reviews')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fraud_score', '-created_at']

    def __str__(self):
        return f"Fraud Check: {self.referral} (Score: {self.fraud_score}, {self.status})"

    def auto_review(self):
        """Auto-approve or reject based on fraud score."""
        if self.fraud_score < 20:
            self.status = 'approved'
        elif self.fraud_score > 50:
            self.status = 'rejected'
        else:
            self.status = 'pending'  # Manual review needed
        self.save()
