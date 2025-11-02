from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, login, logout
from .models import Course, Lesson, Subscription
from .serializers import (
    CourseSerializer,
    CourseDetailSerializer,
    LessonSerializer,
    SubscriptionSerializer,
    UserSerializer,
    RegisterSerializer,
)


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

        # Check if user has active subscription
        if hasattr(request.user, 'subscription'):
            return request.user.subscription.is_active

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
    ViewSet for viewing user's subscription.
    Users can only view their own subscription.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own subscription."""
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's subscription status."""
        try:
            subscription = Subscription.objects.get(user=request.user)
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {'detail': 'No active subscription found.'},
                status=status.HTTP_404_NOT_FOUND
            )


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
