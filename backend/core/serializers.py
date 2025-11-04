from rest_framework import serializers
from .models import User, Course, Lesson, Subscription, LessonProgress, Comment


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'created_at']
        read_only_fields = ['id', 'is_staff', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model."""
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
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        """Hide video access for non-subscribers unless it's a free preview."""
        data = super().to_representation(instance)
        request = self.context.get('request')

        # Check if user has active subscription to this lesson's course
        if request and request.user.is_authenticated:
            has_subscription = request.user.subscriptions.filter(
                course=instance.course,
                status__in=['active', 'trialing']
            ).exists()
            if not has_subscription and not instance.is_free_preview:
                data['video_url'] = None
                data['mux_playback_id'] = None
        elif not instance.is_free_preview:
            data['video_url'] = None
            data['mux_playback_id'] = None

        return data


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
            'lessons',
            'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']

    def get_lesson_count(self, obj):
        return obj.lessons.count()


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
