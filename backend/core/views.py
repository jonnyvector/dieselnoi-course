from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import stripe
from .models import Course, Lesson, Subscription
from .serializers import (
    CourseSerializer,
    CourseDetailSerializer,
    LessonSerializer,
    SubscriptionSerializer,
    UserSerializer,
    RegisterSerializer,
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

    def get_queryset(self):
        """Return all lessons from published courses."""
        return Lesson.objects.filter(course__is_published=True).select_related('course')


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing user's subscriptions.
    Users can only view their own subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own subscriptions."""
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's subscriptions."""
        subscriptions = Subscription.objects.filter(user=request.user)
        serializer = self.get_serializer(subscriptions, many=True)
        return Response(serializer.data)


class RegisterView(APIView):
    """
    User registration endpoint.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
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
    User login endpoint using session authentication.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': 'Please provide both username and password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return Response(
                {
                    'user': UserSerializer(user).data,
                    'message': 'Login successful'
                },
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': 'Invalid credentials'},
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
