"""Tests for lesson progress tracking."""
import pytest
from rest_framework import status
from core.models import LessonProgress


@pytest.mark.django_db
class TestLessonProgressTracking:
    """Tests for tracking lesson completion and watch time."""
    
    def test_mark_lesson_complete(self, authenticated_client, lesson, subscription):
        """Test marking a lesson as complete."""
        data = {'lesson_id': lesson.id}
        response = authenticated_client.post('/api/progress/mark_complete/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_completed'] is True
        
        # Verify in database
        progress = LessonProgress.objects.get(user=authenticated_client.handler._force_user, lesson=lesson)
        assert progress.is_completed is True
        assert progress.completed_at is not None
    
    def test_update_watch_time(self, authenticated_client, lesson, subscription):
        """Test updating watch time for a lesson."""
        data = {
            'lesson_id': lesson.id,
            'watch_time_seconds': 300
        }
        response = authenticated_client.post('/api/progress/update_watch_time/', data)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify in database
        progress = LessonProgress.objects.get(user=authenticated_client.handler._force_user, lesson=lesson)
        assert progress.watch_time_seconds == 300
    
    def test_get_course_progress(self, authenticated_client, course, lesson, subscription):
        """Test getting progress for a specific course."""
        # Mark lesson as complete
        LessonProgress.objects.create(
            user=authenticated_client.handler._force_user,
            lesson=lesson,
            is_completed=True
        )
        
        response = authenticated_client.get(f'/api/progress/course/{course.slug}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'lessons' in response.data
        assert response.data['total_lessons'] >= 1
        assert response.data['completed_lessons'] >= 1
    
    def test_progress_without_subscription(self, authenticated_client, free_lesson):
        """Test that progress tracking works for free preview lessons."""
        data = {'lesson_id': free_lesson.id}
        response = authenticated_client.post('/api/progress/mark_complete/', data)

        # Progress tracking is allowed for free previews
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_completed'] is True


@pytest.mark.django_db
class TestCourseProgressSummary:
    """Tests for course progress summary."""
    
    def test_get_all_course_progress(self, authenticated_client, course, lesson, subscription):
        """Test getting progress summary for all courses."""
        response = authenticated_client.get('/api/progress/course_progress/')
        
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list)
