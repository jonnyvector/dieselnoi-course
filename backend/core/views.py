from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
import stripe
import mux_python
from mux_python.rest import ApiException
from django.db.models import Count, Q, Max
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
import qrcode
import qrcode.image.svg
from io import BytesIO
import base64
from .models import Course, Lesson, Subscription, LessonProgress, Comment, CourseReview, CourseResource, Badge, UserBadge, Referral, ReferralCode, ReferralCredit, ReferralFraudCheck
from .serializers import (
    CourseSerializer,
    CourseDetailSerializer,
    LessonSerializer,
    SubscriptionSerializer,
    UserSerializer,
    RegisterSerializer,
    LessonProgressSerializer,
    CourseProgressSerializer,
    CommentSerializer,
    CourseReviewSerializer,
    CourseResourceSerializer,
    BadgeSerializer,
    UserBadgeSerializer,
)
from .analytics import AnalyticsService
from .badge_checker import check_and_award_badges, get_user_badge_progress


class IsSubscriberOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow subscribers to access content.
    Free preview lessons are accessible to everyone.
    """

    def has_permission(self, request, view):
        # Allow read-only access to all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return False

    def has_object_permission(self, request, view, obj):
        # Check if it's a free preview lesson
        if isinstance(obj, Lesson) and obj.is_free_preview:
            return True

        # Check if user has active subscription to this lesson's course
        if isinstance(obj, Lesson):
            return request.user.subscriptions.filter(
                course=obj.course,
                status__in=['active', 'trialing']
            ).exists()

        return False


class CourseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing courses.
    List view shows all published courses.
    Detail view shows course with all lessons.
    """
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        """Only show published courses with optimized queries."""
        from django.db.models import Count
        return Course.objects.filter(is_published=True).prefetch_related('lessons').annotate(
            lesson_count_annotated=Count('lessons')
        )

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

    @method_decorator(cache_page(60 * 5))  # Cache course list for 5 minutes
    def list(self, request, *args, **kwargs):
        """Cached course list - public data only."""
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def lessons(self, request, slug=None):
        """Get all lessons for a specific course."""
        course = self.get_object()
        lessons = course.lessons.all()
        serializer = LessonSerializer(
            lessons,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)


class LessonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing individual lessons.
    Access is controlled by subscription status.
    """
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated, IsSubscriberOrReadOnly]

    @method_decorator(ratelimit(key='user', rate='200/m', method='GET', block=True))
    def retrieve(self, request, *args, **kwargs):
        """Rate-limited lesson retrieval - 200/min allows smooth browsing."""
        return super().retrieve(request, *args, **kwargs)

    def get_queryset(self):
        """Return all lessons from published courses with optimized queries."""
        return Lesson.objects.filter(
            course__is_published=True
        ).select_related('course').prefetch_related('user_progress', 'comments')


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing user's subscriptions.
    Users can only view their own subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own subscriptions with optimized queries."""
        return Subscription.objects.filter(user=self.request.user).select_related('course', 'user')

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's subscriptions."""
        subscriptions = Subscription.objects.filter(
            user=request.user
        ).select_related('course', 'user')
        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)


class LessonProgressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for tracking user progress through lessons.
    Users can mark lessons as complete and view their progress.
    """
    serializer_class = LessonProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(ratelimit(key='user', rate='120/m', method='POST', block=True))
    def create(self, request, *args, **kwargs):
        """Rate-limited progress creation - 120/min for smooth video tracking."""
        return super().create(request, *args, **kwargs)

    @method_decorator(ratelimit(key='user', rate='120/m', method='PATCH', block=True))
    def partial_update(self, request, *args, **kwargs):
        """Rate-limited progress update - 120/min for smooth video tracking."""
        return super().partial_update(request, *args, **kwargs)

    def get_queryset(self):
        """Users can only see their own progress."""
        return LessonProgress.objects.filter(user=self.request.user).select_related('lesson', 'lesson__course')

    @action(detail=False, methods=['post'])
    def mark_complete(self, request):
        """Mark a lesson as complete."""
        lesson_id = request.data.get('lesson_id')
        watch_time_seconds = request.data.get('watch_time_seconds', 0)

        if not lesson_id:
            return Response(
                {'error': 'lesson_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lesson = Lesson.objects.get(id=lesson_id, course__is_published=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Lesson not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create or update progress
        progress, created = LessonProgress.objects.update_or_create(
            user=request.user,
            lesson=lesson,
            defaults={
                'is_completed': True,
                'completed_at': timezone.now(),
                'watch_time_seconds': watch_time_seconds
            }
        )

        # Check and award badges
        newly_earned_badges = check_and_award_badges(request.user)

        serializer = self.get_serializer(progress)
        response_data = serializer.data

        # Include newly earned badges in response
        if newly_earned_badges:
            response_data['newly_earned_badges'] = [
                {'id': badge.id, 'name': badge.name, 'icon': badge.icon}
                for badge in newly_earned_badges
            ]

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def update_watch_time(self, request):
        """Update watch time for a lesson (without marking complete)."""
        lesson_id = request.data.get('lesson_id')
        watch_time_seconds = request.data.get('watch_time_seconds', 0)

        if not lesson_id:
            return Response(
                {'error': 'lesson_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            lesson = Lesson.objects.get(id=lesson_id, course__is_published=True)
        except Lesson.DoesNotExist:
            return Response(
                {'error': 'Lesson not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create or update progress
        progress, created = LessonProgress.objects.update_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'watch_time_seconds': watch_time_seconds}
        )

        serializer = self.get_serializer(progress)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def course_progress(self, request):
        """Get progress summary for all courses the user has access to."""
        from django.db.models import Count, Max, Q, Subquery, OuterRef

        # Get all courses user has subscriptions for, with aggregated data in single query
        subscribed_courses = Course.objects.filter(
            subscriptions__user=request.user,
            subscriptions__status__in=['active', 'trialing']
        ).annotate(
            total_lessons=Count('lessons'),
            completed_lessons=Count(
                'lessons__user_progress',
                filter=Q(
                    lessons__user_progress__user=request.user,
                    lessons__user_progress__is_completed=True
                )
            ),
            last_watched_at=Max(
                'lessons__user_progress__last_watched_at',
                filter=Q(lessons__user_progress__user=request.user)
            )
        ).distinct()

        progress_data = []
        for course in subscribed_courses:
            total = course.total_lessons
            completed = course.completed_lessons
            completion_percentage = (completed / total * 100) if total > 0 else 0

            progress_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'course_slug': course.slug,
                'total_lessons': total,
                'completed_lessons': completed,
                'completion_percentage': round(completion_percentage, 1),
                'last_watched_at': course.last_watched_at
            })

        serializer = CourseProgressSerializer(progress_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recently_watched(self, request):
        """Get recently watched lessons for continue watching."""
        # Pre-fetch user's active subscription course IDs (single query)
        active_course_ids = set(
            request.user.subscriptions.filter(
                status__in=['active', 'trialing']
            ).values_list('course_id', flat=True)
        )

        # Get recent lesson progress
        recent_progress = LessonProgress.objects.filter(
            user=request.user
        ).select_related(
            'lesson', 'lesson__course'
        ).order_by('-last_watched_at')[:10]

        # Build response with lesson and course details
        data = []
        for progress in recent_progress:
            lesson = progress.lesson
            course = lesson.course

            # Filter in Python using pre-fetched set (no DB query)
            if course.id not in active_course_ids:
                continue

            data.append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'lesson_order': lesson.order,
                'course_id': course.id,
                'course_title': course.title,
                'course_slug': course.slug,
                'is_completed': progress.is_completed,
                'watch_time_seconds': progress.watch_time_seconds,
                'last_watched_at': progress.last_watched_at,
                'duration_minutes': lesson.duration_minutes,
                'mux_playback_id': lesson.mux_playback_id,
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='course/(?P<course_slug>[^/.]+)')
    def course_detail_progress(self, request, course_slug=None):
        """Get detailed progress for a specific course."""
        try:
            course = Course.objects.get(slug=course_slug, is_published=True)
        except Course.DoesNotExist:
            return Response(
                {'error': 'Course not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all lessons for this course
        lessons = course.lessons.all()
        total_lessons = lessons.count()

        # Get user's progress for each lesson
        lesson_progress = LessonProgress.objects.filter(
            user=request.user,
            lesson__course=course
        )

        # Create a map of lesson_id -> progress
        progress_map = {p.lesson_id: p for p in lesson_progress}

        # Build response with lesson details and progress
        lessons_data = []
        for lesson in lessons:
            progress = progress_map.get(lesson.id)
            lessons_data.append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'lesson_order': lesson.order,
                'is_completed': progress.is_completed if progress else False,
                'completed_at': progress.completed_at if progress else None,
                'last_watched_at': progress.last_watched_at if progress else None,
                'watch_time_seconds': progress.watch_time_seconds if progress else 0
            })

        completed_lessons = sum(1 for l in lessons_data if l['is_completed'])
        completion_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0

        return Response({
            'course_id': course.id,
            'course_title': course.title,
            'course_slug': course.slug,
            'total_lessons': total_lessons,
            'completed_lessons': completed_lessons,
            'completion_percentage': round(completion_percentage, 1),
            'lessons': lessons_data
        })


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a comment to edit/delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions allowed to anyone
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only to owner
        return obj.user == request.user


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing comments on lessons.
    Paginated to handle large numbers of comments.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    pagination_class = None  # Will use default from settings (PageNumberPagination)

    @method_decorator(ratelimit(key='user', rate='20/m', method='POST', block=True))
    def create(self, request, *args, **kwargs):
        """Rate-limited comment creation - 20 per minute to allow conversations."""
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        """Filter comments by lesson if lesson_id is provided."""
        from rest_framework.pagination import PageNumberPagination
        from django.db.models import Count

        queryset = Comment.objects.select_related('user', 'lesson').prefetch_related('replies__user').annotate(
            reply_count=Count('replies')
        ).order_by('-created_at')

        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            # Only return top-level comments (parent=None) for the lesson
            queryset = queryset.filter(lesson_id=lesson_id, parent=None)

        return queryset

    def perform_create(self, serializer):
        """Create a comment and set the user."""
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        """Only allow deletion of own comments."""
        if instance.user != self.request.user and not self.request.user.is_staff:
            raise permissions.PermissionDenied("You can only delete your own comments.")
        instance.delete()


class CourseReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating course reviews.
    Students can create/edit their own reviews. Only admins can delete.
    """
    serializer_class = CourseReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_context(self):
        """Add course to serializer context for validation."""
        context = super().get_serializer_context()

        # For create operations, get course from request data
        if self.request.method == 'POST':
            course_id = self.request.data.get('course_id')
            if course_id:
                try:
                    course = Course.objects.get(id=course_id, is_published=True)
                    context['course'] = course
                except Course.DoesNotExist:
                    pass
        # For update operations, get course from existing instance
        elif self.request.method in ['PUT', 'PATCH'] and hasattr(self, 'get_object'):
            try:
                instance = self.get_object()
                context['course'] = instance.course
            except:
                pass

        return context

    @method_decorator(ratelimit(key='user', rate='10/h', method='POST', block=True))
    def create(self, request, *args, **kwargs):
        """Rate-limited review creation - 10 per hour to prevent spam."""
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        """Return all non-hidden reviews, optionally filtered by course."""
        queryset = CourseReview.objects.filter(is_hidden=False).select_related('user', 'course')

        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Sorting
        sort = self.request.query_params.get('sort', 'newest')
        if sort == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort == 'lowest':
            queryset = queryset.order_by('rating', '-created_at')
        else:  # newest (default)
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        """Create a review with the current user and course from request data."""
        course = serializer.context.get('course')

        if not course:
            raise serializers.ValidationError({"course_id": "This field is required."})

        # Verify subscription
        has_subscription = Subscription.objects.filter(
            user=self.request.user,
            course=course,
            status__in=['active', 'trialing']
        ).exists()

        if not has_subscription:
            raise permissions.PermissionDenied("Active subscription required to review this course.")

        serializer.save(user=self.request.user, course=course)

    def perform_update(self, serializer):
        """Only allow editing own reviews."""
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("You can only edit your own reviews.")

        serializer.save()

    def perform_destroy(self, instance):
        """Only allow admins to delete reviews."""
        if not self.request.user.is_staff:
            raise permissions.PermissionDenied("Only administrators can delete reviews.")
        instance.delete()


class CourseResourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for course resources (downloadable PDFs, etc.).
    Read-only API - resources managed through Django admin.
    """
    serializer_class = CourseResourceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return all course resources."""
        return CourseResource.objects.select_related('course').all()

    def retrieve(self, request, pk=None):
        """Get a single resource with download URL if user has subscription."""
        resource = self.get_object()

        # Verify subscription
        has_subscription = Subscription.objects.filter(
            user=request.user,
            course=resource.course,
            status__in=['active', 'trialing']
        ).exists()

        if not has_subscription and not resource.course.is_published:
            return Response(
                {'detail': 'Active subscription required to access this resource.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(resource)
        return Response(serializer.data)


class RegisterView(APIView):
    """
    User registration endpoint with smart rate limiting.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .auth_security import RegistrationRateLimiter, get_client_ip

        ip_address = get_client_ip(request)

        # Check rate limit
        can_register, attempts = RegistrationRateLimiter.can_register(ip_address)
        if not can_register:
            remaining = RegistrationRateLimiter.get_remaining_attempts(ip_address)
            return Response(
                {
                    'error': 'Registration rate limit exceeded.',
                    'detail': f'Too many registration attempts. Please try again in an hour. ({attempts}/10 used)'
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Record the registration
            RegistrationRateLimiter.record_registration(ip_address)

            # Log the user in immediately after registration
            # Set the backend attribute required by login()
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)

            # Track referral signup if code provided
            referral_code = request.data.get('referral_code')
            if referral_code:
                try:
                    from django.utils import timezone
                    ref_code = ReferralCode.objects.get(code=referral_code.upper())

                    # Find or create the referral entry
                    referral = Referral.objects.filter(
                        code_used=referral_code.upper(),
                        referee__isnull=True,
                        status='clicked'
                    ).first()

                    if referral:
                        # Update existing click tracking
                        referral.referee = user
                        referral.status = 'signed_up'
                        referral.signed_up_at = timezone.now()
                        referral.save()
                    else:
                        # Create new referral entry
                        Referral.objects.create(
                            referrer=ref_code.user,
                            referee=user,
                            code_used=referral_code.upper(),
                            status='signed_up',
                            signed_up_at=timezone.now(),
                            ip_address=ip_address,
                            user_agent=request.META.get('HTTP_USER_AGENT', '')
                        )
                except ReferralCode.DoesNotExist:
                    pass  # Invalid code, ignore silently

            return Response(
                {
                    'user': UserSerializer(user).data,
                    'message': 'User registered successfully'
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """
    User login endpoint with progressive delays and account lockout.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .auth_security import LoginAttemptTracker, get_client_ip

        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Normalize username to lowercase for case-insensitive login
        username = username.lower()

        ip_address = get_client_ip(request)

        # Check if account is locked out
        is_locked, seconds_remaining = LoginAttemptTracker.is_locked_out(username)
        if is_locked:
            minutes_remaining = seconds_remaining // 60
            return Response(
                {
                    'error': 'Account temporarily locked',
                    'detail': f'Too many failed login attempts. Please try again in {minutes_remaining} minutes.',
                    'locked_until_seconds': seconds_remaining
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Attempt authentication (no delay for successful logins)
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Successful login - clear failed attempts
            LoginAttemptTracker.clear_attempts(username, ip_address)

            # Check if user has 2FA enabled
            has_2fa = TOTPDevice.objects.filter(user=user, confirmed=True).exists()

            if has_2fa:
                # Don't fully log in yet - require 2FA verification
                # Store user ID in session temporarily
                request.session['pending_2fa_user_id'] = user.id
                request.session['pending_2fa_username'] = username
                request.session.save()

                return Response(
                    {
                        'requires_2fa': True,
                        'message': 'Please enter your 2FA code'
                    },
                    status=status.HTTP_200_OK
                )
            else:
                # No 2FA - proceed with normal login
                login(request, user)

                return Response(
                    {
                        'user': UserSerializer(user).data,
                        'message': 'Login successful'
                    },
                    status=status.HTTP_200_OK
                )
        else:
            # Failed login - record attempt first
            LoginAttemptTracker.record_failed_attempt(username, ip_address)

            # Get current attempt counts for informative error message
            user_attempts, ip_attempts = LoginAttemptTracker.get_attempt_count(username, ip_address)
            max_attempts = max(user_attempts, ip_attempts)

            # Apply progressive delay AFTER recording failure (slows down subsequent attempts)
            LoginAttemptTracker.apply_delay(username, ip_address)

            # Provide helpful feedback
            attempts_remaining = LoginAttemptTracker.MAX_ATTEMPTS - max_attempts
            error_detail = 'Invalid credentials'

            if attempts_remaining <= 5 and attempts_remaining > 0:
                error_detail = f'Invalid credentials. {attempts_remaining} attempts remaining before lockout.'
            elif attempts_remaining <= 0:
                error_detail = 'Account locked due to too many failed attempts.'

            return Response(
                {
                    'error': error_detail,
                    'attempts_remaining': max(0, attempts_remaining)
                },
                status=status.HTTP_401_UNAUTHORIZED
            )


class LogoutView(APIView):
    """
    User logout endpoint.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(
            {'message': 'Logout successful'},
            status=status.HTTP_200_OK
        )


class CurrentUserView(APIView):
    """
    Get current authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UpdateProfileView(APIView):
    """Update user profile (name, email)."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        user = request.user
        email = request.data.get('email')
        first_name = request.data.get('first_name')
        last_name = request.data.get('last_name')

        # Check if email is already taken by another user
        if email and email != user.email:
            if User.objects.filter(email=email).exclude(pk=user.pk).exists():
                return Response(
                    {'error': 'This email is already in use'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user.email = email

        if first_name is not None:
            user.first_name = first_name

        if last_name is not None:
            user.last_name = last_name

        user.save()

        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        })


class ChangePasswordView(APIView):
    """Change user password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not all([current_password, new_password]):
            return Response(
                {'error': 'Both current and new password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new_password)
        request.user.save()

        # Update the session to keep user logged in with new password
        # This prevents session invalidation after password change
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, request.user)

        return Response({
            'success': True,
            'message': 'Password changed successfully'
        })


class GetCSRFToken(APIView):
    """
    Get CSRF token for frontend requests.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.middleware.csrf import get_token, rotate_token
        # Ensure CSRF cookie is set and get the token
        csrf_token = get_token(request)
        response = Response({'csrfToken': csrf_token})
        # Explicitly set the CSRF cookie in the response
        response.set_cookie(
            key='csrftoken',
            value=csrf_token,
            max_age=31449600,  # 1 year
            secure=settings.CSRF_COOKIE_SECURE,
            httponly=False,  # Must be False so JavaScript can read it
            samesite=settings.CSRF_COOKIE_SAMESITE
        )
        return response


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe checkout session for subscription.
    """
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(ratelimit(key='user', rate='20/h', method='POST', block=True))
    def post(self, request):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            user = request.user
            course_slug = request.data.get('course_slug')

            # Get the course to use its price
            if course_slug:
                try:
                    course = Course.objects.get(slug=course_slug, is_published=True)
                    price_in_cents = int(course.price * 100)
                    product_name = f'Dieselnoi Muay Thai - {course.title}'
                    product_description = course.description[:100]  # Stripe has character limits
                except Course.DoesNotExist:
                    return Response(
                        {'error': 'Course not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Default to all-access pricing if no course specified
                price_in_cents = 2999  # $29.99
                product_name = 'Dieselnoi Muay Thai - All Access'
                product_description = 'Monthly subscription to all Muay Thai courses'

            # Create or retrieve Stripe customer
            if not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    metadata={'user_id': user.id}
                )
                user.stripe_customer_id = customer.id
                user.save()
            else:
                customer_id = user.stripe_customer_id

            # Check for referral discount (first-time subscribers only)
            discounts = []
            is_first_subscription = not Subscription.objects.filter(user=user).exists()

            if is_first_subscription:
                # Check if user was referred
                referral = Referral.objects.filter(
                    referee=user,
                    status__in=['signed_up', 'clicked']
                ).first()

                if referral:
                    # Apply 20% referral discount
                    discounts.append({'coupon': 'referral-20-off'})

            # Check for available referral credits
            from django.utils import timezone
            available_credits = ReferralCredit.objects.filter(
                user=user,
                used=False,
                expires_at__gt=timezone.now()
            ).order_by('expires_at')

            # Calculate total available credit
            total_credit = sum(float(credit.amount) for credit in available_credits)

            # Create checkout session
            session_params = {
                'customer': user.stripe_customer_id,
                'payment_method_types': ['card'],
                'line_items': [{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': product_name,
                            'description': product_description,
                        },
                        'unit_amount': price_in_cents,
                        'recurring': {
                            'interval': 'month',
                        },
                    },
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'success_url': settings.FRONTEND_URL + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url': settings.FRONTEND_URL + '/subscription/cancelled',
                'metadata': {
                    'user_id': user.id,
                    'course_slug': course_slug if course_slug else 'all-access',
                    'apply_credits': 'true' if total_credit > 0 else 'false',
                    'credits_to_apply': str(total_credit) if total_credit > 0 else '0',
                }
            }

            if discounts:
                session_params['discounts'] = discounts

            checkout_session = stripe.checkout.Session.create(**session_params)

            return Response({
                'sessionId': checkout_session.id,
                'url': checkout_session.url
            })

        except Exception as e:
            import traceback
            import sys
            error_msg = f"Stripe checkout error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr, flush=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CreateCustomerPortalSessionView(APIView):
    """
    Create a Stripe customer portal session for managing subscriptions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            user = request.user

            # User must have a Stripe customer ID
            if not user.stripe_customer_id:
                return Response(
                    {'error': 'No billing account found'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create customer portal session
            portal_session = stripe.billing_portal.Session.create(
                customer=user.stripe_customer_id,
                return_url=settings.FRONTEND_URL + '/dashboard',
            )

            return Response({
                'url': portal_session.url
            })

        except Exception as e:
            import traceback
            import sys
            error_msg = f"Stripe portal error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr, flush=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CreateMuxUploadView(APIView):
    """
    Create a Mux Direct Upload URL for video uploads.
    Only staff/admin users can upload videos.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    @method_decorator(ratelimit(key='user', rate='20/h', method='POST', block=True))
    def post(self, request):
        try:
            lesson_id = request.data.get('lesson_id')

            if not lesson_id:
                return Response(
                    {'error': 'lesson_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify lesson exists
            try:
                lesson = Lesson.objects.get(id=lesson_id)
            except Lesson.DoesNotExist:
                return Response(
                    {'error': 'Lesson not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Configure Mux API
            configuration = mux_python.Configuration()
            configuration.username = settings.MUX_TOKEN_ID
            configuration.password = settings.MUX_TOKEN_SECRET

            # Create direct upload
            uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(configuration))

            create_upload_request = mux_python.CreateUploadRequest(
                new_asset_settings=mux_python.CreateAssetRequest(
                    playback_policy=[mux_python.PlaybackPolicy.PUBLIC],
                    passthrough=str(lesson_id)  # Store lesson_id to identify later
                ),
                cors_origin=settings.FRONTEND_URL
            )

            create_upload_response = uploads_api.create_direct_upload(create_upload_request)
            upload = create_upload_response.data

            return Response({
                'upload_url': upload.url,
                'upload_id': upload.id
            })

        except ApiException as e:
            return Response(
                {'error': f'Mux API error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import traceback
            import sys
            error_msg = f"Upload creation error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr, flush=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events for subscription updates.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({'error': 'Invalid payload'}, status=400)
        except stripe.error.SignatureVerificationError:
            return Response({'error': 'Invalid signature'}, status=400)

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            self._handle_checkout_session_completed(session)

        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            self._handle_subscription_updated(subscription)

        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            self._handle_subscription_deleted(subscription)

        return Response({'status': 'success'})

    def _handle_checkout_session_completed(self, session):
        """Handle successful checkout - create subscription record."""
        from django.utils import timezone
        from .models import User, Subscription, Course

        user_id = session['metadata'].get('user_id')
        course_slug = session['metadata'].get('course_slug')

        if not user_id or not course_slug:
            return

        try:
            user = User.objects.get(id=user_id)
            course = Course.objects.get(slug=course_slug)
            stripe_subscription_id = session.get('subscription')

            # Create or update subscription for this specific course
            Subscription.objects.update_or_create(
                user=user,
                course=course,
                defaults={
                    'stripe_subscription_id': stripe_subscription_id,
                    'status': 'active',
                    'start_date': timezone.now(),
                }
            )
        except (User.DoesNotExist, Course.DoesNotExist):
            pass

    def _handle_subscription_updated(self, stripe_subscription):
        """Handle subscription status changes."""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription['id']
            )

            # Map Stripe status to our status
            stripe_status = stripe_subscription['status']
            status_mapping = {
                'active': 'active',
                'past_due': 'past_due',
                'canceled': 'cancelled',
                'trialing': 'trialing',
                'incomplete': 'past_due',
                'incomplete_expired': 'cancelled',
                'unpaid': 'past_due',
            }

            subscription.status = status_mapping.get(stripe_status, 'cancelled')
            subscription.save()
        except Subscription.DoesNotExist:
            pass

    def _handle_subscription_deleted(self, stripe_subscription):
        """Handle subscription cancellation."""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=stripe_subscription['id']
            )
            subscription.status = 'cancelled'
            subscription.save()
        except Subscription.DoesNotExist:
            pass


@method_decorator(csrf_exempt, name='dispatch')
class MuxWebhookView(APIView):
    """
    Handle Mux webhook events for video uploads.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            payload = request.body.decode('utf-8')
            import json
            import hmac
            import hashlib

            event = json.loads(payload)

            # Verify webhook signature if secret is configured
            if settings.MUX_WEBHOOK_SECRET:
                signature = request.META.get('HTTP_MUX_SIGNATURE')
                if signature:
                    # Mux signature format: "t=timestamp,v1=signature"
                    # Parse out the signature
                    sig_parts = dict(part.split('=') for part in signature.split(','))
                    timestamp = sig_parts.get('t', '')
                    expected_sig = sig_parts.get('v1', '')

                    # Create the signed payload
                    signed_payload = f"{timestamp}.{payload}"
                    computed_sig = hmac.new(
                        settings.MUX_WEBHOOK_SECRET.encode('utf-8'),
                        signed_payload.encode('utf-8'),
                        hashlib.sha256
                    ).hexdigest()

                    # Verify signature matches
                    if not hmac.compare_digest(computed_sig, expected_sig):
                        print("Mux webhook signature verification failed", flush=True)
                        return Response({'error': 'Invalid signature'}, status=401)

            event_type = event.get('type')

            if event_type == 'video.asset.ready':
                self._handle_asset_ready(event['data'])
            elif event_type == 'video.asset.errored':
                self._handle_asset_errored(event['data'])

            return Response({'status': 'success'})

        except Exception as e:
            import traceback
            import sys
            error_msg = f"Mux webhook error: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr, flush=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _handle_asset_ready(self, asset_data):
        """Handle when a video asset is ready for playback."""
        try:
            asset_id = asset_data.get('id')
            passthrough = asset_data.get('passthrough')
            playback_ids = asset_data.get('playback_ids', [])
            duration_seconds = asset_data.get('duration')  # Duration in seconds from Mux

            if not passthrough:
                print(f"No passthrough data for asset {asset_id}", flush=True)
                return

            # passthrough contains the lesson_id
            lesson_id = int(passthrough)

            try:
                lesson = Lesson.objects.get(id=lesson_id)
                lesson.mux_asset_id = asset_id

                # Get the first playback ID
                if playback_ids and len(playback_ids) > 0:
                    lesson.mux_playback_id = playback_ids[0].get('id')

                # Update duration from actual video duration
                if duration_seconds:
                    # Convert seconds to minutes, rounding up
                    import math
                    lesson.duration_minutes = math.ceil(duration_seconds / 60)
                    print(f"✓ Updated lesson {lesson_id} duration to {lesson.duration_minutes} minutes ({duration_seconds} seconds)", flush=True)

                lesson.save()
                print(f"✓ Updated lesson {lesson_id} with asset {asset_id}", flush=True)

            except Lesson.DoesNotExist:
                print(f"Lesson {lesson_id} not found for asset {asset_id}", flush=True)

        except Exception as e:
            import traceback
            print(f"Error handling asset ready: {str(e)}\n{traceback.format_exc()}", flush=True)

    def _handle_asset_errored(self, asset_data):
        """Handle when a video asset encounters an error."""
        asset_id = asset_data.get('id')
        errors = asset_data.get('errors', {})
        print(f"Asset {asset_id} errored: {errors}", flush=True)


# Analytics Views

class AnalyticsOverviewView(APIView):
    """
    Get overview analytics for admin dashboard.
    Only accessible to admin users.
    Cached for 1 hour to reduce database load.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        from django.core.cache import cache

        cache_key = 'analytics:overview:v1'
        data = cache.get(cache_key)

        if data is None:
            data = AnalyticsService.get_overview_stats()
            cache.set(cache_key, data, 3600)  # Cache for 1 hour

        return Response(data)


class AnalyticsCoursesView(APIView):
    """
    Get analytics for all courses.
    Only accessible to admin users.
    Cached for 1 hour to reduce database load.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        from django.core.cache import cache

        cache_key = 'analytics:courses:v1'
        data = cache.get(cache_key)

        if data is None:
            data = AnalyticsService.get_course_analytics()
            cache.set(cache_key, data, 3600)  # Cache for 1 hour

        return Response(data)


class AnalyticsCourseDetailView(APIView):
    """
    Get detailed analytics for a specific course.
    Only accessible to admin users.
    Cached for 1 hour to reduce database load.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request, course_slug):
        from django.core.cache import cache

        cache_key = f'analytics:course:{course_slug}:v1'
        data = cache.get(cache_key)

        if data is None:
            data = AnalyticsService.get_course_detail_analytics(course_slug)
            if data is None:
                return Response(
                    {'error': 'Course not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            cache.set(cache_key, data, 3600)  # Cache for 1 hour

        return Response(data)


class AnalyticsEngagementView(APIView):
    """
    Get engagement metrics (top lessons, dropoff rates, etc).
    Only accessible to admin users.
    Cached for 1 hour to reduce database load.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        from django.core.cache import cache

        cache_key = 'analytics:engagement:v1'
        data = cache.get(cache_key)

        if data is None:
            data = AnalyticsService.get_engagement_metrics()
            cache.set(cache_key, data, 3600)  # Cache for 1 hour

        return Response(data)


class AnalyticsUserGrowthView(APIView):
    """
    Get user growth and retention metrics.
    Only accessible to admin users.
    Cached for 1 hour to reduce database load.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def get(self, request):
        from django.core.cache import cache

        cache_key = 'analytics:user_growth:v1'
        data = cache.get(cache_key)

        if data is None:
            data = AnalyticsService.get_user_growth_metrics()
            cache.set(cache_key, data, 3600)  # Cache for 1 hour

        return Response(data)


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing badges.
    """
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_badges(self, request):
        """Get current user's badge progress (earned and unearned)."""
        badge_data = get_user_badge_progress(request.user)
        return Response(badge_data)

    @action(detail=False, methods=['get'])
    def earned(self, request):
        """Get only earned badges for current user."""
        user_badges = UserBadge.objects.filter(user=request.user).select_related('badge')
        serializer = UserBadgeSerializer(user_badges, many=True)
        return Response(serializer.data)


class ReferralViewSet(viewsets.ViewSet):
    """ViewSet for referral program."""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_code(self, request):
        """Get or create user's referral code."""
        from .serializers import ReferralCodeSerializer
        code, created = ReferralCode.objects.get_or_create(
            user=request.user,
            defaults={'code': ReferralCode.generate_code()}
        )
        serializer = ReferralCodeSerializer(code, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get referral statistics for current user."""
        from .serializers import ReferralStatsSerializer
        from django.db.models import Q, Sum
        from django.utils import timezone

        # Get user's referral code
        try:
            ref_code = request.user.referral_code
        except:
            return Response({
                'code': None,
                'referral_link': None,
                'clicks': 0,
                'signups': 0,
                'conversions': 0,
                'credits_available': 0,
                'credits_used': 0,
                'credits_total': 0
            })

        # Get referral stats
        referrals = Referral.objects.filter(referrer=request.user)
        clicks = referrals.filter(status__in=['clicked', 'signed_up', 'converted', 'rewarded']).count()
        signups = referrals.filter(status__in=['signed_up', 'converted', 'rewarded']).count()
        conversions = referrals.filter(status__in=['converted', 'rewarded']).count()

        # Get credit stats
        credits = ReferralCredit.objects.filter(user=request.user, expires_at__gt=timezone.now())
        credits_available = credits.filter(used=False).aggregate(Sum('amount'))['amount__sum'] or 0
        credits_used = ReferralCredit.objects.filter(user=request.user, used=True).aggregate(Sum('amount'))['amount__sum'] or 0
        credits_total = credits_available + credits_used

        # Build referral link
        domain = request.get_host().replace(':8000', ':3000')
        referral_link = f"http://{domain}/signup?ref={ref_code.code}"

        data = {
            'code': ref_code.code,
            'referral_link': referral_link,
            'clicks': clicks,
            'signups': signups,
            'conversions': conversions,
            'credits_available': float(credits_available),
            'credits_used': float(credits_used),
            'credits_total': float(credits_total)
        }

        serializer = ReferralStatsSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def history(self, request):
        """Get referral history."""
        from .serializers import ReferralHistorySerializer
        referrals = Referral.objects.filter(
            referrer=request.user
        ).select_related('referee').order_by('-created_at')[:50]

        serializer = ReferralHistorySerializer(referrals, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def credits(self, request):
        """Get available credits."""
        from .serializers import ReferralCreditSerializer
        from django.utils import timezone

        credits = ReferralCredit.objects.filter(
            user=request.user,
            used=False,
            expires_at__gt=timezone.now()
        ).order_by('expires_at')

        serializer = ReferralCreditSerializer(credits, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def track_click(self, request):
        """Track a referral click (anonymous)."""
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code required'}, status=400)

        try:
            ref_code = ReferralCode.objects.get(code=code.upper())
        except ReferralCode.DoesNotExist:
            return Response({'error': 'Invalid code'}, status=404)

        # Get client IP and user agent
        def get_client_ip(request):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')
            return ip

        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # Create referral tracking entry
        Referral.objects.create(
            referrer=ref_code.user,
            code_used=code.upper(),
            status='clicked',
            clicked_at=timezone.now(),
            ip_address=ip_address,
            user_agent=user_agent
        )

        return Response({'success': True, 'referrer': ref_code.user.username})

    @action(detail=False, methods=['get'])
    def validate(self, request):
        """Validate a referral code."""
        code = request.query_params.get('code')
        if not code:
            return Response({'valid': False})

        try:
            ref_code = ReferralCode.objects.get(code=code.upper())
            return Response({
                'valid': True,
                'code': ref_code.code,
                'referrer_name': ref_code.user.first_name or ref_code.user.username
            })
        except ReferralCode.DoesNotExist:
            return Response({'valid': False})


class GenerateCertificateView(APIView):
    """Generate a PDF certificate for course completion."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.conf import settings
        from .certificate_generator import generate_certificate
        from .models import Course, Subscription, LessonProgress
        import os

        course_slug = request.data.get('course_slug')
        if not course_slug:
            return Response({'error': 'Course slug required'}, status=400)

        try:
            course = Course.objects.get(slug=course_slug)
        except Course.DoesNotExist:
            return Response({'error': 'Course not found'}, status=404)

        # Check if user has active subscription
        has_subscription = Subscription.objects.filter(
            user=request.user,
            course=course,
            status='active'
        ).exists()

        if not has_subscription:
            return Response({'error': 'Active subscription required'}, status=403)

        # Check if course is 100% complete
        total_lessons = course.lessons.count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__course=course,
            is_completed=True
        ).count()

        if total_lessons == 0 or completed_lessons < total_lessons:
            return Response({
                'error': 'Course not completed',
                'completed': completed_lessons,
                'total': total_lessons
            }, status=400)

        # Get completion date (latest lesson completion)
        latest_completion = LessonProgress.objects.filter(
            user=request.user,
            lesson__course=course,
            is_completed=True
        ).order_by('-completed_at').first()

        completion_date = latest_completion.completed_at if latest_completion else timezone.now()

        # Generate PDF
        pdf_buffer = generate_certificate(request.user, course, completion_date)

        # Save to disk
        certificates_dir = os.path.join(settings.MEDIA_ROOT, 'certificates')
        os.makedirs(certificates_dir, exist_ok=True)

        filename = f'{request.user.id}_{course.slug}.pdf'
        filepath = os.path.join(certificates_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(pdf_buffer.read())

        # Return download URL
        download_url = f'{settings.MEDIA_URL}certificates/{filename}'

        return Response({
            'success': True,
            'download_url': download_url,
            'filename': filename
        })


# ============================================
# Two-Factor Authentication Views
# ============================================

class TwoFactorStatusView(APIView):
    """Check if user has 2FA enabled."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            device = TOTPDevice.objects.get(user=request.user, confirmed=True)
            return Response({
                'enabled': True,
                'device_name': device.name
            })
        except TOTPDevice.DoesNotExist:
            return Response({'enabled': False})


class TwoFactorSetupView(APIView):
    """Generate QR code for 2FA setup."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Check if user already has 2FA enabled
        existing_device = TOTPDevice.objects.filter(user=request.user, confirmed=True).first()
        if existing_device:
            return Response(
                {'error': '2FA is already enabled. Disable it first to set up a new device.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if there's already an unconfirmed device - reuse it instead of creating a new one
        # This handles the case where user closes modal and reopens it
        device = TOTPDevice.objects.filter(user=request.user, confirmed=False).first()

        if not device:
            # Create new TOTP device
            device = TOTPDevice.objects.create(
                user=request.user,
                name=f"{request.user.email}'s Authenticator",
                confirmed=False
            )

        # Generate QR code
        url = device.config_url
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'qr_code': f'data:image/png;base64,{qr_code_base64}',
            'secret': device.key,
            'device_id': device.id
        })


class TwoFactorVerifyView(APIView):
    """Verify and enable 2FA."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get unconfirmed device
        try:
            device = TOTPDevice.objects.get(user=request.user, confirmed=False)
        except TOTPDevice.DoesNotExist:
            return Response(
                {'error': 'No setup in progress. Please start 2FA setup first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify token
        if device.verify_token(token):
            device.confirmed = True
            device.save()

            # Generate backup codes
            static_device = StaticDevice.objects.create(
                user=request.user,
                name='Backup Codes',
                confirmed=True
            )

            backup_codes = []
            for _ in range(10):
                token = StaticToken.random_token()
                StaticToken.objects.create(device=static_device, token=token)
                backup_codes.append(token)

            return Response({
                'success': True,
                'message': '2FA enabled successfully',
                'backup_codes': backup_codes
            })
        else:
            return Response(
                {'error': 'Invalid token. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class TwoFactorDisableView(APIView):
    """Disable 2FA."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Password is required to disable 2FA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify password
        if not request.user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Delete all TOTP and static devices
        TOTPDevice.objects.filter(user=request.user).delete()
        StaticDevice.objects.filter(user=request.user).delete()

        return Response({
            'success': True,
            'message': '2FA disabled successfully'
        })


class TwoFactorVerifyLoginView(APIView):
    """Verify 2FA token during login."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from .auth_security import LoginAttemptTracker, get_client_ip
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Check if there's a pending 2FA verification
        user_id = request.session.get('pending_2fa_user_id')
        username = request.session.get('pending_2fa_username')

        if not user_id:
            return Response(
                {'error': 'No pending 2FA verification. Please log in first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        token = request.data.get('token')
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            # Clear invalid session data
            request.session.pop('pending_2fa_user_id', None)
            request.session.pop('pending_2fa_username', None)
            return Response(
                {'error': 'Invalid session. Please log in again.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try TOTP device first
        totp_devices = TOTPDevice.objects.filter(user=user, confirmed=True)

        for device in totp_devices:
            if device.verify_token(token):
                # Valid TOTP token - complete login
                request.session.pop('pending_2fa_user_id', None)
                request.session.pop('pending_2fa_username', None)

                # Set the backend explicitly (required when multiple backends are configured)
                user.backend = 'django.contrib.auth.backends.ModelBackend'
                login(request, user)

                return Response(
                    {
                        'user': UserSerializer(user).data,
                        'message': 'Login successful'
                    },
                    status=status.HTTP_200_OK
                )

        # Try static backup codes
        static_devices = StaticDevice.objects.filter(user=user, confirmed=True)

        for device in static_devices:
            if device.verify_token(token):
                # Valid backup code - complete login and warn user
                request.session.pop('pending_2fa_user_id', None)
                request.session.pop('pending_2fa_username', None)

                # Set the backend explicitly (required when multiple backends are configured)
                user.backend = 'django.contrib.auth.backends.ModelBackend'
                login(request, user)

                return Response(
                    {
                        'user': UserSerializer(user).data,
                        'message': 'Login successful',
                        'warning': 'You used a backup code. Consider regenerating backup codes.'
                    },
                    status=status.HTTP_200_OK
                )

        # Invalid token - record failed attempt
        ip_address = get_client_ip(request)
        LoginAttemptTracker.record_failed_attempt(username, ip_address)

        # Get remaining attempts
        user_attempts, ip_attempts = LoginAttemptTracker.get_attempt_count(username, ip_address)
        max_attempts = max(user_attempts, ip_attempts)
        attempts_remaining = LoginAttemptTracker.MAX_ATTEMPTS - max_attempts

        if attempts_remaining <= 0:
            # Clear pending 2FA session
            request.session.pop('pending_2fa_user_id', None)
            request.session.pop('pending_2fa_username', None)
            return Response(
                {'error': 'Too many failed attempts. Please log in again.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        return Response(
            {
                'error': 'Invalid 2FA code. Please try again.',
                'attempts_remaining': attempts_remaining
            },
            status=status.HTTP_401_UNAUTHORIZED
        )


class TwoFactorCancelSetupView(APIView):
    """Cancel 2FA setup in progress."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Delete any unconfirmed devices
        TOTPDevice.objects.filter(user=request.user, confirmed=False).delete()

        return Response({
            'success': True,
            'message': 'Setup cancelled successfully'
        })


class TwoFactorBackupCodesView(APIView):
    """Regenerate backup codes."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Check if 2FA is enabled
        if not TOTPDevice.objects.filter(user=request.user, confirmed=True).exists():
            return Response(
                {'error': '2FA is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        password = request.data.get('password')
        if not password:
            return Response(
                {'error': 'Password is required to regenerate backup codes'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify password
        if not request.user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Delete old backup codes
        StaticDevice.objects.filter(user=request.user).delete()

        # Generate new backup codes
        static_device = StaticDevice.objects.create(
            user=request.user,
            name='Backup Codes',
            confirmed=True
        )

        backup_codes = []
        for _ in range(10):
            token = StaticToken.random_token()
            StaticToken.objects.create(device=static_device, token=token)
            backup_codes.append(token)

        return Response({
            'success': True,
            'backup_codes': backup_codes
        })


class PasswordResetRequestView(APIView):
    """Request a password reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.core.mail import send_mail
        from django.contrib.auth import get_user_model
        from django.template.loader import render_to_string
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes

        User = get_user_model()
        email = request.data.get('email')

        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)

            # Generate password reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            # Build reset URL (frontend URL)
            frontend_url = settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:3000'
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}"

            # Send email
            subject = 'Reset Your Password - Dieselnoi Muay Thai'
            message = f"""
Hi {user.username},

You requested to reset your password. Click the link below to reset it:

{reset_url}

This link will expire in 24 hours.

If you didn't request this, please ignore this email.

Best regards,
Dieselnoi Muay Thai Team
            """

            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@dieselnoi.com',
                [email],
                fail_silently=False,
            )

            return Response({
                'success': True,
                'message': 'Password reset email sent. Please check your inbox.'
            })

        except User.DoesNotExist:
            # Don't reveal if email exists or not (security best practice)
            return Response({
                'success': True,
                'message': 'Password reset email sent. Please check your inbox.'
            })
        except Exception as e:
            # Log the actual error for debugging
            import traceback
            print(f"Password reset email error: {str(e)}")
            print(traceback.format_exc())

            return Response(
                {'error': 'Failed to send reset email. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.contrib.auth import get_user_model
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str

        User = get_user_model()

        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uid, token, new_password]):
            return Response(
                {'error': 'Missing required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters long'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Decode user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)

            # Verify token
            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Invalid or expired reset link'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set new password
            user.set_password(new_password)
            user.save()

            return Response({
                'success': True,
                'message': 'Password reset successful. You can now log in with your new password.'
            })

        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Invalid reset link'},
                status=status.HTTP_400_BAD_REQUEST
            )
