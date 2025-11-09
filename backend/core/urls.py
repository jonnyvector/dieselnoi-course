from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseViewSet,
    LessonViewSet,
    SubscriptionViewSet,
    LessonProgressViewSet,
    CommentViewSet,
    CourseReviewViewSet,
    CourseResourceViewSet,
    BadgeViewSet,
    ReferralViewSet,
    RegisterView,
    LoginView,
    LogoutView,
    CurrentUserView,
    GetCSRFToken,
    CreateCheckoutSessionView,
    CreateCustomerPortalSessionView,
    CreateMuxUploadView,
    StripeWebhookView,
    MuxWebhookView,
    AnalyticsOverviewView,
    AnalyticsCoursesView,
    AnalyticsCourseDetailView,
    AnalyticsEngagementView,
    AnalyticsUserGrowthView,
)

router = DefaultRouter()
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'lessons', LessonViewSet, basename='lesson')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'progress', LessonProgressViewSet, basename='progress')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'reviews', CourseReviewViewSet, basename='review')
router.register(r'resources', CourseResourceViewSet, basename='resource')
router.register(r'badges', BadgeViewSet, basename='badge')
router.register(r'referrals', ReferralViewSet, basename='referral')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/csrf/', GetCSRFToken.as_view(), name='csrf-token'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/user/', CurrentUserView.as_view(), name='current-user'),
    path('stripe/create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('stripe/create-portal-session/', CreateCustomerPortalSessionView.as_view(), name='create-portal-session'),
    path('stripe/webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
    path('mux/create-upload/', CreateMuxUploadView.as_view(), name='create-mux-upload'),
    path('mux/webhook/', MuxWebhookView.as_view(), name='mux-webhook'),
    path('admin/analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('admin/analytics/courses/', AnalyticsCoursesView.as_view(), name='analytics-courses'),
    path('admin/analytics/courses/<slug:course_slug>/', AnalyticsCourseDetailView.as_view(), name='analytics-course-detail'),
    path('admin/analytics/engagement/', AnalyticsEngagementView.as_view(), name='analytics-engagement'),
    path('admin/analytics/user-growth/', AnalyticsUserGrowthView.as_view(), name='analytics-user-growth'),
]
