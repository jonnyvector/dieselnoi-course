from rest_framework import serializers
from .models import User, Course, Lesson, Subscription


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model."""
    class Meta:
        model = Lesson
        fields = [
            'id',
            'title',
            'description',
            'video_url',
            'duration_minutes',
            'order',
            'is_free_preview',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        """Hide video_url for non-subscribers unless it's a free preview."""
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
        elif not instance.is_free_preview:
            data['video_url'] = None

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
