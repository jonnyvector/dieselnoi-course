from rest_framework import serializers
from django.conf import settings
from .models import (
    User, Course, Lesson, Subscription, LessonProgress, Comment, CourseReview, CourseResource, Badge, UserBadge,
    ReferralCode, Referral, ReferralCredit, ReferralFraudCheck
)
from .mux_utils import get_signed_playback_id


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'created_at']
        read_only_fields = ['id', 'is_staff', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model."""
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'description',
            'video_url',
            'mux_playback_id',
            'duration_minutes',
            'order',
            'is_free_preview',
            'unlock_date',
            'is_locked',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_is_locked(self, instance):
        """Check if lesson is locked for the current user."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        return self._is_lesson_locked(instance, request.user)

    def _is_lesson_locked(self, lesson, user):
        """Determine if a lesson is locked for a specific user."""
        from django.utils import timezone
        from .models import LessonUnlock

        # Free previews are never locked
        if lesson.is_free_preview:
            return False

        # No unlock date = not using drip content
        if not lesson.unlock_date:
            return False

        # Check if lesson has been manually unlocked for this user
        if LessonUnlock.objects.filter(user=user, lesson=lesson).exists():
            return False

        # Check if unlock datetime has passed
        now = timezone.now()
        return lesson.unlock_date > now

    def to_representation(self, instance):
        """Hide video access for non-subscribers or locked lessons."""
        data = super().to_representation(instance)
        request = self.context.get('request')

        # Check if lesson is locked (drip content)
        if request and request.user.is_authenticated:
            is_locked = data.get('is_locked', False)

            # If locked, hide video access
            if is_locked:
                data['video_url'] = None
                data['mux_playback_id'] = None
                return data

        # Check if user has active subscription to this lesson's course
        if request and request.user.is_authenticated:
            has_subscription = request.user.subscriptions.filter(
                course=instance.course,
                status__in=['active', 'trialing']
            ).exists()
            if not has_subscription and not instance.is_free_preview:
                data['video_url'] = None
                data['mux_playback_id'] = None
            elif instance.mux_playback_id:
                # User has access - provide signed playback ID with 2-hour expiration
                data['mux_playback_id'] = get_signed_playback_id(
                    instance.mux_playback_id,
                    expiration_seconds=7200  # 2 hours
                )
        elif not instance.is_free_preview:
            data['video_url'] = None
            data['mux_playback_id'] = None
        elif instance.mux_playback_id:
            # Free preview - provide signed playback ID with 2-hour expiration
            data['mux_playback_id'] = get_signed_playback_id(
                instance.mux_playback_id,
                expiration_seconds=7200  # 2 hours
            )

        return data


class CourseResourceSerializer(serializers.ModelSerializer):
    """Serializer for CourseResource model with download URL."""
    download_url = serializers.SerializerMethodField()
    file_size_display = serializers.ReadOnlyField()

    class Meta:
        model = CourseResource
        fields = ['id', 'title', 'description', 'download_url', 'file_size_display', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def get_download_url(self, obj):
        """Generate download URL if user has active subscription, otherwise return None."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        # Check if user has active subscription to this course
        from .models import Subscription  # Avoid circular import
        has_subscription = Subscription.objects.filter(
            user=request.user,
            course=obj.course,
            status__in=['active', 'trialing']
        ).exists()

        if not has_subscription:
            return None

        # For development: Return media file URL
        # For production: Will use S3 presigned URLs
        if obj.file:
            return request.build_absolute_uri(obj.file.url)
        return None


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model (list view)."""
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'description',
            'slug',
            'difficulty',
            'price',
            'thumbnail_url',
            'lesson_count',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_lesson_count(self, obj):
        return obj.lessons.count()


class CourseDetailSerializer(serializers.ModelSerializer):
    """Serializer for Course model (detail view with lessons)."""
    lessons = LessonSerializer(many=True, read_only=True)
    resources = CourseResourceSerializer(many=True, read_only=True)
    lesson_count = serializers.SerializerMethodField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    user_review = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id',
            'title',
            'description',
            'slug',
            'difficulty',
            'price',
            'thumbnail_url',
            'lesson_count',
            'lessons',
            'resources',
            'average_rating',
            'total_reviews',
            'user_review',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at', 'average_rating', 'total_reviews']

    def get_lesson_count(self, obj):
        return obj.lessons.count()

    def get_user_review(self, obj):
        """Return current user's review if exists."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                review = obj.reviews.get(user=request.user)
                return CourseReviewSerializer(review, context=self.context).data
            except CourseReview.DoesNotExist:
                return None
        return None


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.SlugField(source='course.slug', read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id',
            'user_email',
            'course_title',
            'course_slug',
            'status',
            'is_active',
            'start_date',
            'end_date',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'user_email', 'course_title', 'course_slug', 'is_active']


class LessonProgressSerializer(serializers.ModelSerializer):
    """Serializer for LessonProgress model."""
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    course_title = serializers.CharField(source='lesson.course.title', read_only=True)
    course_slug = serializers.SlugField(source='lesson.course.slug', read_only=True)

    class Meta:
        model = LessonProgress
        fields = [
            'id',
            'lesson',
            'lesson_title',
            'course_title',
            'course_slug',
            'is_completed',
            'completed_at',
            'last_watched_at',
            'watch_time_seconds',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'lesson_title', 'course_title', 'course_slug']


class CourseProgressSerializer(serializers.Serializer):
    """Serializer for course progress summary."""
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    course_slug = serializers.SlugField()
    total_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    completion_percentage = serializers.FloatField()
    last_watched_at = serializers.DateTimeField(allow_null=True)


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for Comment model."""
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id',
            'user_id',
            'username',
            'lesson',
            'content',
            'parent',
            'timestamp_seconds',
            'is_edited',
            'reply_count',
            'replies',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user_id', 'username', 'is_edited', 'reply_count', 'created_at', 'updated_at']

    def get_replies(self, obj):
        """Get direct replies to this comment (not nested deeper)."""
        if obj.parent is None:  # Only show replies for top-level comments
            replies = obj.replies.all()[:5]  # Limit to 5 most recent replies
            return CommentSerializer(replies, many=True, context=self.context).data
        return []

    def create(self, validated_data):
        """Set the user from the request context."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Mark comment as edited when updated."""
        if 'content' in validated_data and validated_data['content'] != instance.content:
            validated_data['is_edited'] = True
        return super().update(instance, validated_data)


class CourseReviewSerializer(serializers.ModelSerializer):
    """Serializer for CourseReview model."""
    user_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = [
            'id', 'rating', 'review_text', 'user_name',
            'created_at', 'updated_at', 'is_edited',
            'is_featured', 'can_edit'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'is_edited']

    def get_user_name(self, obj):
        """Format as 'A. Smith' (first initial + last name)."""
        user = obj.user
        if user.first_name and user.last_name:
            first_initial = user.first_name[0].upper()
            return f"{first_initial}. {user.last_name}"
        elif user.last_name:
            return user.last_name
        else:
            return "Anonymous User"

    def get_can_edit(self, obj):
        """Check if current user can edit this review."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False

    def validate(self, data):
        """Validate that user has completed at least 50% of the course."""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context is required")

        user = request.user
        course = self.context.get('course')

        if not course:
            raise serializers.ValidationError("Course context is required")

        # Check 50% completion requirement
        total_lessons = course.lessons.count()
        if total_lessons == 0:
            raise serializers.ValidationError("This course has no lessons yet.")

        completed_lessons = LessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            is_completed=True
        ).count()

        completion_percentage = (completed_lessons / total_lessons) * 100

        if completion_percentage < 50:
            raise serializers.ValidationError(
                f"You must complete at least 50% of the course to leave a review. "
                f"Current progress: {completion_percentage:.0f}%"
            )

        return data


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, data):
        """Check that passwords match."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        return data

    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user


class BadgeSerializer(serializers.ModelSerializer):
    """Serializer for Badge model."""
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon', 'category', 'requirement_value', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserBadgeSerializer(serializers.ModelSerializer):
    """Serializer for UserBadge model."""
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'badge', 'earned_at']
        read_only_fields = ['id', 'earned_at']


class ReferralCodeSerializer(serializers.ModelSerializer):
    """Serializer for ReferralCode model."""
    referral_link = serializers.SerializerMethodField()

    class Meta:
        model = ReferralCode
        fields = ['id', 'code', 'referral_link', 'created_at']
        read_only_fields = ['id', 'code', 'created_at']

    def get_referral_link(self, obj):
        """Generate full referral URL."""
        # Get the request from context to build absolute URL
        request = self.context.get('request')
        if request:
            # In production, use actual domain
            domain = request.get_host().replace(':8000', ':3000')
            return f"http://{domain}/signup?ref={obj.code}"
        return f"/signup?ref={obj.code}"


class ReferralSerializer(serializers.ModelSerializer):
    """Serializer for Referral model."""
    referrer_username = serializers.CharField(source='referrer.username', read_only=True)
    referee_username = serializers.CharField(source='referee.username', read_only=True, allow_null=True)

    class Meta:
        model = Referral
        fields = [
            'id', 'referrer', 'referrer_username', 'referee', 'referee_username',
            'code_used', 'status', 'clicked_at', 'signed_up_at', 'first_subscription_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReferralCreditSerializer(serializers.ModelSerializer):
    """Serializer for ReferralCredit model."""
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = ReferralCredit
        fields = [
            'id', 'user', 'referral', 'amount', 'earned_at', 'expires_at',
            'used', 'used_at', 'used_for_subscription', 'is_expired'
        ]
        read_only_fields = ['id', 'earned_at', 'used_at', 'is_expired']


class ReferralStatsSerializer(serializers.Serializer):
    """Serializer for referral statistics."""
    code = serializers.CharField()
    referral_link = serializers.CharField()
    clicks = serializers.IntegerField()
    signups = serializers.IntegerField()
    conversions = serializers.IntegerField()
    credits_available = serializers.DecimalField(max_digits=10, decimal_places=2)
    credits_used = serializers.DecimalField(max_digits=10, decimal_places=2)
    credits_total = serializers.DecimalField(max_digits=10, decimal_places=2)


class ReferralHistorySerializer(serializers.ModelSerializer):
    """Detailed referral history for display."""
    referee_username = serializers.CharField(source='referee.username', read_only=True, allow_null=True)
    referee_email = serializers.CharField(source='referee.email', read_only=True, allow_null=True)
    credit_amount = serializers.SerializerMethodField()

    class Meta:
        model = Referral
        fields = [
            'id', 'referee_username', 'referee_email', 'status',
            'signed_up_at', 'first_subscription_at', 'credit_amount', 'created_at'
        ]

    def get_credit_amount(self, obj):
        """Get credit amount if exists."""
        if hasattr(obj, 'credit'):
            return float(obj.credit.amount)
        return None
