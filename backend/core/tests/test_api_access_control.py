"""Tests for subscription-based access control (CRITICAL for revenue)."""
import pytest
from django.utils import timezone
from rest_framework import status


@pytest.mark.django_db
class TestCourseAccess:
    """Tests for course listing and detail access."""
    
    def test_list_courses_unauthenticated(self, api_client, course):
        response = api_client.get('/api/courses/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_list_courses_authenticated(self, authenticated_client, course):
        response = authenticated_client.get('/api/courses/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_course_detail(self, api_client, course, lesson):
        response = api_client.get(f'/api/courses/{course.slug}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == course.title
        assert 'lessons' in response.data


@pytest.mark.django_db
class TestVideoAccessControl:
    """CRITICAL: Tests that video URLs are protected based on subscription."""
    
    def test_free_preview_accessible_without_subscription(self, authenticated_client, course, free_lesson):
        """Free preview lessons should show video URL to all authenticated users."""
        response = authenticated_client.get(f'/api/lessons/{free_lesson.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mux_playback_id'] is not None
        assert response.data['mux_playback_id'] == 'test-playback-id-free'
    
    def test_paid_lesson_blocked_without_subscription(self, authenticated_client, course, lesson):
        """Paid lessons should be blocked (403) for non-subscribers."""
        response = authenticated_client.get(f'/api/lessons/{lesson.id}/')

        # More secure: block entire access, not just hide video URL
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_paid_lesson_accessible_with_subscription(self, authenticated_client, lesson, subscription):
        """Active subscribers should see video URL for paid lessons."""
        response = authenticated_client.get(f'/api/lessons/{lesson.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mux_playback_id'] is not None  # ALLOWED
        assert response.data['mux_playback_id'] == 'test-playback-id'
    
    def test_cancelled_subscription_blocks_access(self, authenticated_client, lesson, subscription):
        """Cancelled subscriptions should block access to videos."""
        # Cancel the subscription
        subscription.status = 'cancelled'
        subscription.save()

        response = authenticated_client.get(f'/api/lessons/{lesson.id}/')

        # Should return 403 for cancelled subscriptions
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_different_course_subscription_blocks_access(self, authenticated_client, user):
        """Subscription to Course A should not grant access to Course B's videos."""
        from core.models import Course, Lesson, Subscription
        
        # Create two separate courses
        course_a = Course.objects.create(
            title='Course A',
            slug='course-a',
            difficulty='beginner',
            price=29.99,
            is_published=True
        )
        course_b = Course.objects.create(
            title='Course B',
            slug='course-b',
            difficulty='beginner',
            price=29.99,
            is_published=True
        )
        
        lesson_a = Lesson.objects.create(
            course=course_a,
            title='Lesson A',
            order=1,
            mux_playback_id='playback-a'
        )
        lesson_b = Lesson.objects.create(
            course=course_b,
            title='Lesson B',
            order=1,
            mux_playback_id='playback-b'
        )
        
        # Subscribe to Course A only
        Subscription.objects.create(
            user=user,
            course=course_a,
            status='active',
            start_date=timezone.now()
        )
        
        # Should have access to Course A
        response_a = authenticated_client.get(f'/api/lessons/{lesson_a.id}/')
        assert response_a.status_code == status.HTTP_200_OK
        assert response_a.data['mux_playback_id'] == 'playback-a'

        # Should NOT have access to Course B (403 Forbidden)
        response_b = authenticated_client.get(f'/api/lessons/{lesson_b.id}/')
        assert response_b.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestSubscriptionAPI:
    """Tests for subscription endpoints."""
    
    def test_get_my_subscriptions(self, authenticated_client, subscription):
        response = authenticated_client.get('/api/subscriptions/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        assert response.data[0]['status'] == 'active'
    
    def test_subscriptions_require_auth(self, api_client):
        response = api_client.get('/api/subscriptions/me/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCourseFiltering:
    """Tests for course filtering and sorting."""
    
    def test_filter_by_category(self, api_client, course, category):
        response = api_client.get(f'/api/courses/?category={category.slug}')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_filter_by_difficulty(self, api_client, course):
        response = api_client.get('/api/courses/?difficulty=intermediate')

        assert response.status_code == status.HTTP_200_OK
        # Handle both paginated and non-paginated responses
        courses = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert len(courses) >= 1
        assert all(c['difficulty'] == 'intermediate' for c in courses)
    
    def test_filter_free_courses(self, api_client, free_course):
        response = api_client.get('/api/courses/?price=free')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
    
    def test_sort_by_newest(self, api_client, course):
        response = api_client.get('/api/courses/?sort=newest')
        
        assert response.status_code == status.HTTP_200_OK
