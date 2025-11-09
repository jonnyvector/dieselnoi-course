"""
Analytics calculation functions for admin dashboard.
Provides metrics on users, courses, subscriptions, and engagement.
"""

from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import User, Course, Subscription, Lesson, LessonProgress, Comment


class AnalyticsService:
    """Service class for calculating analytics metrics."""

    @staticmethod
    def get_overview_stats():
        """
        Get dashboard overview statistics.
        Returns key business metrics including users, subscriptions, revenue, engagement.
        """
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        # User metrics
        total_users = User.objects.count()
        new_users_7d = User.objects.filter(created_at__gte=seven_days_ago).count()
        new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()

        # Subscription metrics
        active_subs = Subscription.objects.filter(status__in=['active', 'trialing']).count()

        # Previous period for growth calculation
        fourteen_days_ago = now - timedelta(days=14)
        users_previous_week = User.objects.filter(
            created_at__gte=fourteen_days_ago,
            created_at__lt=seven_days_ago
        ).count()

        active_subs_7d_ago = Subscription.objects.filter(
            created_at__lte=seven_days_ago,
            status__in=['active', 'trialing']
        ).count()

        # Course metrics
        total_courses = Course.objects.count()
        published_courses = Course.objects.filter(is_published=True).count()

        # Completion rate (average across all enrolled students)
        enrolled_users = Subscription.objects.filter(
            status__in=['active', 'trialing']
        ).values('user', 'course').distinct()

        total_completion_percentage = 0
        enrolled_count = 0

        for enrollment in enrolled_users:
            user_id = enrollment['user']
            course_id = enrollment['course']

            course = Course.objects.get(id=course_id)
            total_lessons = course.lessons.count()

            if total_lessons > 0:
                completed_lessons = LessonProgress.objects.filter(
                    user_id=user_id,
                    lesson__course_id=course_id,
                    is_completed=True
                ).count()

                completion_pct = (completed_lessons / total_lessons) * 100
                total_completion_percentage += completion_pct
                enrolled_count += 1

        avg_completion_rate = (total_completion_percentage / enrolled_count) if enrolled_count > 0 else 0

        # Watch time metrics
        total_watch_seconds = LessonProgress.objects.aggregate(
            total=Sum('watch_time_seconds')
        )['total'] or 0
        total_watch_time_hours = round(total_watch_seconds / 3600, 1)

        # Comment metrics
        comments_30d = Comment.objects.filter(created_at__gte=thirty_days_ago).count()

        # Revenue metrics (MRR = Monthly Recurring Revenue)
        estimated_mrr = Decimal('0.00')
        active_subscriptions = Subscription.objects.filter(
            status__in=['active', 'trialing']
        ).select_related('course')

        for sub in active_subscriptions:
            estimated_mrr += sub.course.price

        # Growth metrics
        users_growth_7d = 0
        if users_previous_week > 0:
            users_growth_7d = ((new_users_7d - users_previous_week) / users_previous_week) * 100
        elif new_users_7d > 0:
            users_growth_7d = 100

        subs_growth_7d = 0
        if active_subs_7d_ago > 0:
            subs_growth_7d = ((active_subs - active_subs_7d_ago) / active_subs_7d_ago) * 100

        return {
            'total_users': total_users,
            'active_subscriptions': active_subs,
            'total_courses': total_courses,
            'published_courses': published_courses,
            'avg_completion_rate': round(avg_completion_rate, 1),
            'total_watch_time_hours': total_watch_time_hours,
            'comments_last_30_days': comments_30d,
            'new_users_last_7_days': new_users_7d,
            'new_users_last_30_days': new_users_30d,
            'estimated_mrr': float(estimated_mrr),
            'growth_metrics': {
                'users_growth_7d': round(users_growth_7d, 1),
                'subs_growth_7d': round(subs_growth_7d, 1),
            }
        }

    @staticmethod
    def get_course_analytics():
        """
        Get analytics for all courses.
        Returns list of course performance metrics.
        """
        courses = Course.objects.filter(is_published=True).prefetch_related(
            'lessons',
            'subscriptions'
        )

        course_data = []

        for course in courses:
            # Enrollment metrics
            active_subs = course.subscriptions.filter(status__in=['active', 'trialing']).count()
            total_subs = course.subscriptions.count()

            # Lesson count
            lesson_count = course.lessons.count()

            # Completion metrics
            if active_subs > 0 and lesson_count > 0:
                total_completion = 0
                total_progress = 0
                users_with_progress = 0

                for sub in course.subscriptions.filter(status__in=['active', 'trialing']):
                    user_id = sub.user_id

                    completed = LessonProgress.objects.filter(
                        user_id=user_id,
                        lesson__course=course,
                        is_completed=True
                    ).count()

                    progress_pct = (completed / lesson_count) * 100
                    total_progress += progress_pct
                    users_with_progress += 1

                    if completed == lesson_count:
                        total_completion += 1

                completion_rate = (total_completion / active_subs) * 100 if active_subs > 0 else 0
                avg_progress = total_progress / users_with_progress if users_with_progress > 0 else 0
            else:
                completion_rate = 0
                avg_progress = 0

            # Watch time
            total_watch_seconds = LessonProgress.objects.filter(
                lesson__course=course
            ).aggregate(total=Sum('watch_time_seconds'))['total'] or 0
            total_watch_time_hours = round(total_watch_seconds / 3600, 1)

            # Comment count
            comment_count = Comment.objects.filter(lesson__course=course).count()

            # Revenue
            monthly_revenue = float(course.price * active_subs)

            course_data.append({
                'course_slug': course.slug,
                'title': course.title,
                'difficulty': course.difficulty,
                'price': float(course.price),
                'enrollments': active_subs,
                'total_subscribers': total_subs,
                'completion_rate': round(completion_rate, 1),
                'avg_progress': round(avg_progress, 1),
                'total_watch_time_hours': total_watch_time_hours,
                'comment_count': comment_count,
                'lesson_count': lesson_count,
                'monthly_revenue': round(monthly_revenue, 2),
            })

        return {'courses': course_data}

    @staticmethod
    def get_course_detail_analytics(course_slug):
        """
        Get detailed analytics for a specific course including per-lesson metrics.
        """
        try:
            course = Course.objects.get(slug=course_slug, is_published=True)
        except Course.DoesNotExist:
            return None

        # Overall course metrics
        active_subs = course.subscriptions.filter(status__in=['active', 'trialing']).count()
        total_subs = course.subscriptions.count()
        lesson_count = course.lessons.count()

        # Course-level completion
        total_completion = 0
        total_progress = 0
        users_with_progress = 0

        for sub in course.subscriptions.filter(status__in=['active', 'trialing']):
            user_id = sub.user_id

            completed = LessonProgress.objects.filter(
                user_id=user_id,
                lesson__course=course,
                is_completed=True
            ).count()

            if lesson_count > 0:
                progress_pct = (completed / lesson_count) * 100
                total_progress += progress_pct
                users_with_progress += 1

                if completed == lesson_count:
                    total_completion += 1

        completion_rate = (total_completion / active_subs) * 100 if active_subs > 0 else 0
        avg_progress = total_progress / users_with_progress if users_with_progress > 0 else 0

        # Watch time
        total_watch_seconds = LessonProgress.objects.filter(
            lesson__course=course
        ).aggregate(total=Sum('watch_time_seconds'))['total'] or 0
        total_watch_time_hours = round(total_watch_seconds / 3600, 1)

        avg_watch_time_per_user = (total_watch_time_hours / active_subs) if active_subs > 0 else 0

        # Comment count
        comment_count = Comment.objects.filter(lesson__course=course).count()

        # Revenue
        monthly_revenue = float(course.price * active_subs)

        # Per-lesson analytics
        lesson_analytics = []
        for lesson in course.lessons.all():
            # Watch count (unique users)
            watch_count = LessonProgress.objects.filter(lesson=lesson).count()

            # Completion metrics
            completed_count = LessonProgress.objects.filter(
                lesson=lesson,
                is_completed=True
            ).count()

            lesson_completion_rate = (completed_count / watch_count) * 100 if watch_count > 0 else 0

            # Watch time for this lesson
            lesson_watch_seconds = LessonProgress.objects.filter(
                lesson=lesson
            ).aggregate(total=Sum('watch_time_seconds'))['total'] or 0
            lesson_watch_hours = round(lesson_watch_seconds / 3600, 1)

            # Average watch percentage
            if watch_count > 0 and lesson.duration_minutes > 0:
                avg_watch_seconds = lesson_watch_seconds / watch_count
                expected_seconds = lesson.duration_minutes * 60
                avg_watch_percentage = (avg_watch_seconds / expected_seconds) * 100 if expected_seconds > 0 else 0
            else:
                avg_watch_percentage = 0

            # Comments
            lesson_comment_count = Comment.objects.filter(lesson=lesson).count()

            # Drop-off rate
            drop_off_rate = 100 - lesson_completion_rate

            lesson_analytics.append({
                'lesson_id': lesson.id,
                'title': lesson.title,
                'order': lesson.order,
                'watch_count': watch_count,
                'completion_rate': round(lesson_completion_rate, 1),
                'avg_watch_percentage': round(avg_watch_percentage, 1),
                'total_watch_time_hours': lesson_watch_hours,
                'comment_count': lesson_comment_count,
                'drop_off_rate': round(drop_off_rate, 1),
            })

        return {
            'course_slug': course.slug,
            'title': course.title,
            'enrollments': active_subs,
            'total_subscribers': total_subs,
            'completion_rate': round(completion_rate, 1),
            'avg_progress': round(avg_progress, 1),
            'total_watch_time_hours': total_watch_time_hours,
            'avg_watch_time_per_user': round(avg_watch_time_per_user, 1),
            'comment_count': comment_count,
            'lesson_count': lesson_count,
            'monthly_revenue': round(monthly_revenue, 2),
            'lesson_analytics': lesson_analytics,
        }

    @staticmethod
    def get_engagement_metrics():
        """
        Get content engagement metrics including top lessons and drop-off rates.
        """
        # Top lessons by watch time
        top_by_watch_time = LessonProgress.objects.values(
            'lesson__id',
            'lesson__title',
            'lesson__course__title'
        ).annotate(
            total_watch_seconds=Sum('watch_time_seconds'),
            unique_watchers=Count('user', distinct=True)
        ).order_by('-total_watch_seconds')[:10]

        top_lessons_by_watch_time = [
            {
                'lesson_id': item['lesson__id'],
                'lesson_title': item['lesson__title'],
                'course_title': item['lesson__course__title'],
                'total_watch_time_hours': round(item['total_watch_seconds'] / 3600, 1),
                'unique_watchers': item['unique_watchers'],
            }
            for item in top_by_watch_time
        ]

        # Top lessons by comments
        top_by_comments = Comment.objects.values(
            'lesson__id',
            'lesson__title',
            'lesson__course__title'
        ).annotate(
            comment_count=Count('id'),
            unique_commenters=Count('user', distinct=True)
        ).order_by('-comment_count')[:10]

        top_lessons_by_comments = [
            {
                'lesson_id': item['lesson__id'],
                'lesson_title': item['lesson__title'],
                'course_title': item['lesson__course__title'],
                'comment_count': item['comment_count'],
                'unique_commenters': item['unique_commenters'],
            }
            for item in top_by_comments
        ]

        # Highest completion lessons
        lesson_completion = []
        for lesson in Lesson.objects.filter(course__is_published=True).select_related('course'):
            total_progress = LessonProgress.objects.filter(lesson=lesson).count()
            if total_progress >= 5:  # Only include lessons with at least 5 watchers
                completed = LessonProgress.objects.filter(
                    lesson=lesson,
                    is_completed=True
                ).count()
                completion_rate = (completed / total_progress) * 100

                if completion_rate >= 90:
                    lesson_completion.append({
                        'lesson_id': lesson.id,
                        'lesson_title': lesson.title,
                        'course_title': lesson.course.title,
                        'completion_rate': round(completion_rate, 1),
                        'watch_count': total_progress,
                    })

        highest_completion_lessons = sorted(
            lesson_completion,
            key=lambda x: x['completion_rate'],
            reverse=True
        )[:10]

        # Highest dropout lessons
        dropout_lessons = []
        for lesson in Lesson.objects.filter(course__is_published=True).select_related('course'):
            total_progress = LessonProgress.objects.filter(lesson=lesson).count()
            if total_progress >= 5:  # Only include lessons with at least 5 watchers
                completed = LessonProgress.objects.filter(
                    lesson=lesson,
                    is_completed=True
                ).count()
                completion_rate = (completed / total_progress) * 100
                dropout_rate = 100 - completion_rate

                if completion_rate < 50:
                    dropout_lessons.append({
                        'lesson_id': lesson.id,
                        'lesson_title': lesson.title,
                        'course_title': lesson.course.title,
                        'completion_rate': round(completion_rate, 1),
                        'dropout_rate': round(dropout_rate, 1),
                        'watch_count': total_progress,
                    })

        highest_dropout_lessons = sorted(
            dropout_lessons,
            key=lambda x: x['dropout_rate'],
            reverse=True
        )[:10]

        return {
            'top_lessons_by_watch_time': top_lessons_by_watch_time,
            'top_lessons_by_comments': top_lessons_by_comments,
            'highest_completion_lessons': highest_completion_lessons,
            'highest_dropout_lessons': highest_dropout_lessons,
        }

    @staticmethod
    def get_user_growth_metrics():
        """
        Get user growth and retention metrics over time.
        """
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # Daily signups for last 30 days
        daily_signups = []
        for i in range(30):
            date = (thirty_days_ago + timedelta(days=i)).date()
            next_date = date + timedelta(days=1)

            count = User.objects.filter(
                created_at__date=date
            ).count()

            daily_signups.append({
                'date': str(date),
                'count': count,
            })

        # Active users trend (users with active subscriptions)
        active_users_trend = []
        for i in range(30):
            date = (thirty_days_ago + timedelta(days=i)).date()
            next_date = date + timedelta(days=1)

            # Count users with active subs on that date
            active_count = User.objects.filter(
                subscriptions__status__in=['active', 'trialing'],
                subscriptions__created_at__lte=date
            ).distinct().count()

            active_users_trend.append({
                'date': str(date),
                'count': active_count,
            })

        # Retention rate (% still subscribed after 30 days)
        sixty_days_ago = now - timedelta(days=60)
        cohort_users = Subscription.objects.filter(
            created_at__gte=sixty_days_ago,
            created_at__lt=thirty_days_ago
        ).values_list('user_id', flat=True).distinct()

        cohort_count = len(cohort_users)

        # Only calculate retention if we have a cohort to measure
        if cohort_count > 0:
            still_active = Subscription.objects.filter(
                user_id__in=cohort_users,
                status__in=['active', 'trialing']
            ).values_list('user_id', flat=True).distinct().count()

            retention_rate = (still_active / cohort_count) * 100
            churn_rate = 100 - retention_rate
        else:
            # Not enough historical data - return None to indicate N/A
            retention_rate = None
            churn_rate = None

        return {
            'daily_signups': daily_signups,
            'active_users_trend': active_users_trend,
            'retention_rate': round(retention_rate, 1) if retention_rate is not None else None,
            'churn_rate': round(churn_rate, 1) if churn_rate is not None else None,
        }
