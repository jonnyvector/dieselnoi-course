from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Course, Lesson, Subscription, LessonProgress, Comment


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
    fields = ['order', 'title', 'duration_minutes', 'is_free_preview']
    ordering = ['order']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'price', 'is_published', 'created_at']
    list_filter = ['difficulty', 'is_published']
    search_fields = ['title', 'description']
    prepopulated_fields = {'slug': ('title',)}
    inlines = [LessonInline]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'duration_minutes', 'is_free_preview', 'created_at']
    list_filter = ['course', 'is_free_preview']
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
