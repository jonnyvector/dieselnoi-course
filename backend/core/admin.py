from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Course, Lesson, Subscription


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
