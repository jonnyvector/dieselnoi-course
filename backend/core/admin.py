from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import (
    User, Course, Lesson, Subscription, LessonProgress, LessonUnlock,
    Comment, CourseReview, CourseResource, Badge, UserBadge,
    ReferralCode, Referral, ReferralCredit, ReferralFraudCheck
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'first_name', 'last_name', 'is_staff', 'created_at']
    list_filter = ['is_staff', 'is_superuser', 'is_active']
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Additional Info', {'fields': ('stripe_customer_id',)}),
    )


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 1
    fields = ['order', 'title', 'duration_minutes', 'is_free_preview', 'unlock_date']
    ordering = ['order']


class CourseResourceInline(admin.TabularInline):
    model = CourseResource
    extra = 1
    fields = ['title', 'description', 'file', 'order']
    ordering = ['order']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'price', 'is_published', 'created_at']
    list_filter = ['difficulty', 'is_published']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [LessonInline, CourseResourceInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'duration_minutes', 'is_free_preview', 'unlock_date', 'created_at']
    list_filter = ['course', 'is_free_preview', 'unlock_date']
    search_fields = ['title', 'description', 'course__title']
    ordering = ['course', 'order']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'status', 'start_date', 'end_date', 'created_at']
    list_filter = ['status']
    search_fields = ['user__email', 'user__username', 'stripe_subscription_id']
    ordering = ['-created_at']


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'is_completed', 'completed_at', 'last_watched_at']
    list_filter = ['is_completed', 'lesson__course']
    search_fields = ['user__email', 'user__username', 'lesson__title', 'lesson__course__title']
    ordering = ['-last_watched_at']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'content_preview', 'parent', 'timestamp_seconds', 'is_edited', 'created_at']
    list_filter = ['is_edited', 'lesson__course', 'created_at']
    search_fields = ['user__email', 'user__username', 'content', 'lesson__title']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'lesson', 'parent']

    def content_preview(self, obj):
        """Show a preview of the comment content."""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'rating', 'created_at', 'is_edited', 'is_hidden', 'is_featured']
    list_filter = ['rating', 'is_hidden', 'is_featured', 'created_at']
    search_fields = ['user__email', 'user__username', 'course__title', 'review_text']
    ordering = ['-created_at']
    readonly_fields = ['user', 'course', 'created_at', 'updated_at', 'is_edited']
    raw_id_fields = ['user', 'course']

    fieldsets = (
        ('Review Details', {
            'fields': ('user', 'course', 'rating', 'review_text')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_edited')
        }),
        ('Moderation', {
            'fields': ('is_hidden', 'is_featured')
        }),
    )

    actions = ['mark_as_hidden', 'mark_as_visible', 'mark_as_featured', 'unmark_as_featured']

    def mark_as_hidden(self, request, queryset):
        """Hide selected reviews."""
        queryset.update(is_hidden=True)
        for review in queryset:
            review.course.update_rating_cache()
        self.message_user(request, f"{queryset.count()} reviews marked as hidden.")
    mark_as_hidden.short_description = "Hide selected reviews"

    def mark_as_visible(self, request, queryset):
        """Unhide selected reviews."""
        queryset.update(is_hidden=False)
        for review in queryset:
            review.course.update_rating_cache()
        self.message_user(request, f"{queryset.count()} reviews marked as visible.")
    mark_as_visible.short_description = "Show selected reviews"

    def mark_as_featured(self, request, queryset):
        """Feature selected reviews."""
        queryset.update(is_featured=True)
        self.message_user(request, f"{queryset.count()} reviews marked as featured.")
    mark_as_featured.short_description = "Feature selected reviews"

    def unmark_as_featured(self, request, queryset):
        """Unfeature selected reviews."""
        queryset.update(is_featured=False)
        self.message_user(request, f"{queryset.count()} reviews unmarked as featured.")
    unmark_as_featured.short_description = "Unfeature selected reviews"


@admin.register(CourseResource)
class CourseResourceAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'file_size_display', 'order', 'uploaded_at']
    list_filter = ['course', 'uploaded_at']
    search_fields = ['title', 'description', 'course__title']
    ordering = ['course', 'order', 'title']
    readonly_fields = ['uploaded_at', 'file_size_display']

    fieldsets = (
        ('Resource Details', {
            'fields': ('course', 'title', 'description')
        }),
        ('File', {
            'fields': ('file', 'file_size_display')
        }),
        ('Display', {
            'fields': ('order', 'uploaded_at')
        }),
    )


@admin.register(LessonUnlock)
class LessonUnlockAdmin(admin.ModelAdmin):
    list_display = ['user', 'lesson', 'lesson_course', 'unlocked_at']
    list_filter = ['lesson__course', 'unlocked_at']
    search_fields = ['user__username', 'user__email', 'lesson__title', 'lesson__course__title']
    ordering = ['-unlocked_at']
    autocomplete_fields = ['user', 'lesson']

    def lesson_course(self, obj):
        return obj.lesson.course.title
    lesson_course.short_description = 'Course'


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name', 'category', 'requirement_value', 'earner_count', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['category', 'requirement_value']
    readonly_fields = ['created_at']

    def earner_count(self, obj):
        return obj.earners.count()
    earner_count.short_description = 'Earners'


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    list_filter = ['badge__category', 'earned_at']
    search_fields = ['user__username', 'user__email', 'badge__name']
    ordering = ['-earned_at']
    readonly_fields = ['earned_at']
    autocomplete_fields = ['user', 'badge']


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'created_at']
    search_fields = ['user__username', 'user__email', 'code']
    readonly_fields = ['created_at']
    autocomplete_fields = ['user']


class ReferralFraudCheckInline(admin.StackedInline):
    model = ReferralFraudCheck
    extra = 0
    can_delete = False
    readonly_fields = ['fraud_score', 'same_ip', 'same_device', 'rapid_signup', 'disposable_email', 'created_at', 'updated_at']
    fields = ['fraud_score', 'status', 'same_ip', 'same_device', 'rapid_signup', 'disposable_email', 'reviewed_by', 'reviewed_at', 'notes', 'created_at', 'updated_at']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['referrer', 'referee', 'code_used', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['referrer__username', 'referee__username', 'code_used']
    readonly_fields = ['clicked_at', 'signed_up_at', 'first_subscription_at', 'created_at', 'updated_at']
    autocomplete_fields = ['referrer', 'referee']
    inlines = [ReferralFraudCheckInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('referrer', 'referee', 'fraud_check')


@admin.register(ReferralCredit)
class ReferralCreditAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'used', 'earned_at', 'expires_at']
    list_filter = ['used', 'earned_at', 'expires_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['earned_at', 'used_at']
    autocomplete_fields = ['user', 'referral', 'used_for_subscription']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('user', 'referral')


@admin.register(ReferralFraudCheck)
class ReferralFraudCheckAdmin(admin.ModelAdmin):
    list_display = ['referral', 'fraud_score', 'status', 'same_ip', 'same_device', 'created_at']
    list_filter = ['status', 'same_ip', 'same_device', 'rapid_signup', 'disposable_email']
    search_fields = ['referral__referrer__username', 'referral__referee__username']
    readonly_fields = ['fraud_score', 'same_ip', 'same_device', 'rapid_signup', 'disposable_email', 'created_at', 'updated_at']
    autocomplete_fields = ['referral', 'reviewed_by']

    actions = ['approve_referrals', 'reject_referrals']

    def approve_referrals(self, request, queryset):
        queryset.update(status='approved', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'{queryset.count()} referrals approved.')
    approve_referrals.short_description = 'Approve selected referrals'

    def reject_referrals(self, request, queryset):
        queryset.update(status='rejected', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'{queryset.count()} referrals rejected.')
    reject_referrals.short_description = 'Reject selected referrals'
