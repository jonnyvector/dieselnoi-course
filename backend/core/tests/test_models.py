"""Tests for core models."""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models import Course, Lesson, Subscription, Category, VideoChapter, LessonProgress

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests for custom User model."""
    
    def test_create_user(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.stripe_customer_id is None
    
    def test_user_string_representation(self):
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        assert str(user) == 'test@example.com'


@pytest.mark.django_db
class TestCategoryModel:
    """Tests for Category model."""
    
    def test_create_category(self, category):
        assert category.name == 'Fundamentals'
        assert category.slug == 'fundamentals'
        assert category.is_active is True
    
    def test_category_auto_slug(self):
        cat = Category.objects.create(name='Advanced Techniques')
        assert cat.slug == 'advanced-techniques'
    
    def test_category_hierarchy(self):
        parent = Category.objects.create(name='Parent', slug='parent')
        child = Category.objects.create(name='Child', slug='child', parent=parent)
        
        assert child.parent == parent
        assert str(child) == 'Parent → Child'
        assert child in parent.get_children()


@pytest.mark.django_db
class TestCourseModel:
    """Tests for Course model."""
    
    def test_create_course(self, course):
        assert course.title == 'Dieselnoi Teep Mastery'
        assert course.slug == 'dieselnoi-teep-mastery'
        assert course.difficulty == 'intermediate'
        assert course.price == 29.99
        assert course.is_published is True
    
    def test_course_auto_slug(self):
        course = Course.objects.create(
            title='Test Course Title',
            difficulty='beginner',
            price=19.99
        )
        assert course.slug == 'test-course-title'
    
    def test_course_categories(self, course, category):
        assert category in course.categories.all()
    
    def test_lesson_count(self, course, lesson):
        assert course.lessons.count() == 1


@pytest.mark.django_db
class TestLessonModel:
    """Tests for Lesson model."""
    
    def test_create_lesson(self, lesson):
        assert lesson.title == 'Introduction to Teep'
        assert lesson.order == 1
        assert lesson.is_free_preview is False
    
    def test_lesson_ordering(self, course):
        lesson1 = Lesson.objects.create(course=course, title='L1', order=1)
        lesson2 = Lesson.objects.create(course=course, title='L2', order=2)
        lesson3 = Lesson.objects.create(course=course, title='L3', order=3)
        
        lessons = list(course.lessons.all())
        assert lessons == [lesson1, lesson2, lesson3]
    
    def test_unique_course_order(self, course):
        Lesson.objects.create(course=course, title='L1', order=1)
        
        # Should not allow duplicate order in same course
        with pytest.raises(Exception):
            Lesson.objects.create(course=course, title='L2', order=1)


@pytest.mark.django_db
class TestVideoChapterModel:
    """Tests for VideoChapter model."""
    
    def test_create_chapter(self, lesson):
        chapter = VideoChapter.objects.create(
            lesson=lesson,
            title='Setup',
            timestamp_seconds=30,
            description='Learn the setup'
        )
        assert chapter.title == 'Setup'
        assert chapter.timestamp_seconds == 30
    
    def test_formatted_timestamp(self, lesson):
        chapter = VideoChapter.objects.create(
            lesson=lesson,
            title='Test',
            timestamp_seconds=125  # 2:05
        )
        assert chapter.formatted_timestamp == '2:05'
        
        # Test with hours
        chapter2 = VideoChapter.objects.create(
            lesson=lesson,
            title='Test2',
            timestamp_seconds=3665  # 1:01:05
        )
        assert chapter2.formatted_timestamp == '1:01:05'


@pytest.mark.django_db
class TestSubscriptionModel:
    """Tests for Subscription model."""
    
    def test_create_subscription(self, subscription):
        assert subscription.status == 'active'
        assert subscription.is_active is True
    
    def test_inactive_subscription(self, user, course):
        sub = Subscription.objects.create(
            user=user,
            course=course,
            status='cancelled',
            start_date=timezone.now()
        )
        assert sub.is_active is False

    def test_unique_user_course(self, user, course):
        Subscription.objects.create(user=user, course=course, status='active', start_date=timezone.now())

        # Should not allow duplicate subscription
        with pytest.raises(Exception):
            Subscription.objects.create(user=user, course=course, status='active', start_date=timezone.now())


@pytest.mark.django_db
class TestLessonProgressModel:
    """Tests for LessonProgress model."""
    
    def test_create_progress(self, user, lesson):
        progress = LessonProgress.objects.create(
            user=user,
            lesson=lesson,
            watch_time_seconds=60
        )
        assert progress.watch_time_seconds == 60
        assert progress.is_completed is False
    
    def test_mark_completed(self, user, lesson):
        progress = LessonProgress.objects.create(
            user=user,
            lesson=lesson,
            is_completed=True,
            completed_at=timezone.now()
        )
        assert progress.is_completed is True
        assert progress.completed_at is not None
