"""Pytest fixtures and configuration for tests."""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from core.models import Course, Lesson, Category, Subscription

User = get_user_model()


@pytest.fixture
def api_client():
    """Return API client for making requests."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return API client with authenticated user."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def category(db):
    """Create a test category."""
    return Category.objects.create(
        name='Fundamentals',
        slug='fundamentals',
        description='Basic Muay Thai techniques',
        icon='🥊',
        is_active=True
    )


@pytest.fixture
def course(db, category):
    """Create a test course."""
    course = Course.objects.create(
        title='Dieselnoi Teep Mastery',
        slug='dieselnoi-teep-mastery',
        description='Master the teep kick',
        difficulty='intermediate',
        price=29.99,
        is_published=True
    )
    course.categories.add(category)
    return course


@pytest.fixture
def free_course(db):
    """Create a free test course."""
    return Course.objects.create(
        title='Free Introduction',
        slug='free-introduction',
        description='Free intro course',
        difficulty='beginner',
        price=0,
        is_published=True,
        is_free=True
    )


@pytest.fixture
def coming_soon_course(db):
    """Create a coming soon course."""
    return Course.objects.create(
        title='Advanced Combinations',
        slug='advanced-combinations',
        description='Coming soon',
        difficulty='advanced',
        price=49.99,
        is_published=False,
        is_coming_soon=True
    )


@pytest.fixture
def lesson(db, course):
    """Create a test lesson."""
    return Lesson.objects.create(
        course=course,
        title='Introduction to Teep',
        description='Learn the basics',
        order=1,
        mux_playback_id='test-playback-id',
        duration_minutes=10,
        is_free_preview=False
    )


@pytest.fixture
def free_lesson(db, course):
    """Create a free preview lesson."""
    return Lesson.objects.create(
        course=course,
        title='Free Preview',
        description='Free preview lesson',
        order=0,
        mux_playback_id='test-playback-id-free',
        duration_minutes=5,
        is_free_preview=True
    )


@pytest.fixture
def subscription(db, user, course):
    """Create an active subscription."""
    return Subscription.objects.create(
        user=user,
        course=course,
        status='active',
        stripe_subscription_id='sub_test123',
        start_date=timezone.now()
    )
