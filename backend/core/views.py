from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited
import stripe
import mux_python
from mux_python.rest import ApiException
from django.db.models import Count, Q, Max
from django.utils import timezone
from .models import Course, Lesson, Subscription, LessonProgress, Comment
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
)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


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
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'slug'

    def get_queryset(self):
        """Only show published courses."""
        return Course.objects.filter(is_published=True).prefetch_related('lessons')

    def get_serializer_class(self):
        """Use detailed serializer for retrieve action."""
        if self.action == 'retrieve':
            return CourseDetailSerializer
        return CourseSerializer

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

        serializer = self.get_serializer(progress)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        # Get all courses user has subscriptions for
        subscribed_courses = Course.objects.filter(
            subscriptions__user=request.user,
            subscriptions__status__in=['active', 'trialing']
        ).distinct()

        progress_data = []
        for course in subscribed_courses:
            total_lessons = course.lessons.count()
            completed_lessons = LessonProgress.objects.filter(
                user=request.user,
                lesson__course=course,
                is_completed=True
            ).count()

            # Get last watched time
            last_progress = LessonProgress.objects.filter(
                user=request.user,
                lesson__course=course
            ).order_by('-last_watched_at').first()

            completion_percentage = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0

            progress_data.append({
                'course_id': course.id,
                'course_title': course.title,
                'course_slug': course.slug,
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'completion_percentage': round(completion_percentage, 1),
                'last_watched_at': last_progress.last_watched_at if last_progress else None
            })

        serializer = CourseProgressSerializer(progress_data, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def recently_watched(self, request):
        """Get recently watched lessons for continue watching."""
        # Get recent lesson progress, excluding completed ones
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

            # Only include if user has active subscription to this course
            has_subscription = request.user.subscriptions.filter(
                course=course,
                status__in=['active', 'trialing']
            ).exists()

            if not has_subscription:
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

        queryset = Comment.objects.select_related('user', 'lesson').prefetch_related('replies__user').order_by('-created_at')

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

        # Apply progressive delay based on previous failed attempts
        LoginAttemptTracker.apply_delay(username, ip_address)

        # Attempt authentication
        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Successful login - clear failed attempts
            LoginAttemptTracker.clear_attempts(username, ip_address)
            login(request, user)

            return Response(
                {
                    'user': UserSerializer(user).data,
                    'message': 'Login successful'
                },
                status=status.HTTP_200_OK
            )
        else:
            # Failed login - record attempt
            LoginAttemptTracker.record_failed_attempt(username, ip_address)

            # Get current attempt counts for informative error message
            user_attempts, ip_attempts = LoginAttemptTracker.get_attempt_count(username, ip_address)
            max_attempts = max(user_attempts, ip_attempts)

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


class GetCSRFToken(APIView):
    """
    Get CSRF token for frontend requests.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.middleware.csrf import get_token
        return Response({'csrfToken': get_token(request)})


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe checkout session for subscription.
    """
    permission_classes = [permissions.IsAuthenticated]

    @method_decorator(ratelimit(key='user', rate='20/h', method='POST', block=True))
    def post(self, request):
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

            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=user.stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
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
                mode='subscription',
                success_url=settings.FRONTEND_URL + '/subscription/success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=settings.FRONTEND_URL + '/subscription/cancelled',
                metadata={
                    'user_id': user.id,
                    'course_slug': course_slug if course_slug else 'all-access',
                }
            )

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
