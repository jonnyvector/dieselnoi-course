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
    GenerateCertificateView,
    TwoFactorStatusView,
    TwoFactorSetupView,
    TwoFactorVerifyView,
    TwoFactorVerifyLoginView,
    TwoFactorDisableView,
    TwoFactorCancelSetupView,
    TwoFactorBackupCodesView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    UpdateProfileView,
    ChangePasswordView,
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
    path('certificates/generate/', GenerateCertificateView.as_view(), name='generate-certificate'),
    path('admin/analytics/overview/', AnalyticsOverviewView.as_view(), name='analytics-overview'),
    path('admin/analytics/courses/', AnalyticsCoursesView.as_view(), name='analytics-courses'),
    path('admin/analytics/courses/<slug:course_slug>/', AnalyticsCourseDetailView.as_view(), name='analytics-course-detail'),
    path('admin/analytics/engagement/', AnalyticsEngagementView.as_view(), name='analytics-engagement'),
    path('admin/analytics/user-growth/', AnalyticsUserGrowthView.as_view(), name='analytics-user-growth'),
    path('auth/2fa/status/', TwoFactorStatusView.as_view(), name='2fa-status'),
    path('auth/2fa/setup/', TwoFactorSetupView.as_view(), name='2fa-setup'),
    path('auth/2fa/verify/', TwoFactorVerifyView.as_view(), name='2fa-verify'),
    path('auth/2fa/verify-login/', TwoFactorVerifyLoginView.as_view(), name='2fa-verify-login'),
    path('auth/2fa/cancel-setup/', TwoFactorCancelSetupView.as_view(), name='2fa-cancel-setup'),
    path('auth/2fa/disable/', TwoFactorDisableView.as_view(), name='2fa-disable'),
    path('auth/2fa/backup-codes/', TwoFactorBackupCodesView.as_view(), name='2fa-backup-codes'),
    path('auth/password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('auth/profile/update/', UpdateProfileView.as_view(), name='profile-update'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
]
