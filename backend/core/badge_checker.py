"""
Badge checking and awarding logic.
"""
from django.db import models
from django.db.models import Count, F, Q
from .models import Badge, UserBadge, LessonProgress, Comment, Course


def check_and_award_badges(user):
    """
    Check all badge criteria for a user and award any newly earned badges.
    Returns a list of newly awarded badges.
    """
    newly_awarded = []
    
    # Check lesson count badges
    completed_lessons_count = LessonProgress.objects.filter(
        user=user,
        is_completed=True
    ).count()
    
    lesson_badges = Badge.objects.filter(
        category='starter',
        requirement_value__lte=completed_lessons_count
    )
    
    for badge in lesson_badges:
        awarded = award_badge(user, badge)
        if awarded:
            newly_awarded.append(badge)
    
    # Check course completion badges
    # Count how many courses user has fully completed
    completed_courses_count = 0
    for course in Course.objects.filter(is_published=True).prefetch_related('lessons'):
        total_lessons = course.lessons.count()
        if total_lessons == 0:
            continue

        completed_lessons = LessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            is_completed=True
        ).count()

        if completed_lessons == total_lessons:
            completed_courses_count += 1
    
    if completed_courses_count > 0:
        course_complete_badge = Badge.objects.filter(
            name='Course Complete'
        ).first()
        if course_complete_badge:
            awarded = award_badge(user, course_complete_badge)
            if awarded:
                newly_awarded.append(course_complete_badge)
    
    # Check completionist (all courses)
    total_published_courses = Course.objects.filter(is_published=True).count()
    if total_published_courses > 0 and completed_courses_count >= total_published_courses:
        completionist_badge = Badge.objects.filter(name='Completionist').first()
        if completionist_badge:
            awarded = award_badge(user, completionist_badge)
            if awarded:
                newly_awarded.append(completionist_badge)
    
    # Check comment badges
    comment_count = Comment.objects.filter(user=user).count()
    comment_badges = Badge.objects.filter(
        category='engagement',
        requirement_value__lte=comment_count
    )
    
    for badge in comment_badges:
        awarded = award_badge(user, badge)
        if awarded:
            newly_awarded.append(badge)
    
    return newly_awarded


def award_badge(user, badge):
    """
    Award a specific badge to a user if they don't already have it.
    Returns True if newly awarded, False if already had it.
    """
    user_badge, created = UserBadge.objects.get_or_create(
        user=user,
        badge=badge
    )
    return created


def get_user_badge_progress(user):
    """
    Get progress toward all badges for a user.
    Returns dict with badge info and progress.
    """
    # Get user's earned badges
    earned_badge_ids = UserBadge.objects.filter(user=user).values_list('badge_id', flat=True)
    
    # Get all badges with earned status
    all_badges = Badge.objects.all()
    
    # Calculate current values
    completed_lessons = LessonProgress.objects.filter(user=user, is_completed=True).count()
    comment_count = Comment.objects.filter(user=user).count()

    # Count how many courses user has fully completed
    completed_courses = 0
    for course in Course.objects.filter(is_published=True).prefetch_related('lessons'):
        total_lessons = course.lessons.count()
        if total_lessons == 0:
            continue

        completed_lessons_in_course = LessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            is_completed=True
        ).count()

        if completed_lessons_in_course == total_lessons:
            completed_courses += 1
    
    total_published_courses = Course.objects.filter(is_published=True).count()
    
    badge_data = []
    for badge in all_badges:
        earned = badge.id in earned_badge_ids
        
        # Calculate progress
        current_value = 0
        target_value = badge.requirement_value or 0
        
        if badge.category == 'starter':
            current_value = completed_lessons
        elif badge.category == 'completion':
            if badge.name == 'Course Complete':
                current_value = completed_courses
                target_value = 1
            elif badge.name == 'Completionist':
                current_value = completed_courses
                target_value = total_published_courses
        elif badge.category == 'engagement':
            current_value = comment_count
        
        progress_percentage = 0
        if target_value > 0:
            progress_percentage = min(100, int((current_value / target_value) * 100))

        # Cap current_value at target_value for display
        display_current = min(current_value, target_value) if target_value > 0 else current_value

        badge_data.append({
            'id': badge.id,
            'name': badge.name,
            'description': badge.description,
            'icon': badge.icon,
            'category': badge.category,
            'earned': earned,
            'earned_at': UserBadge.objects.filter(user=user, badge=badge).first().earned_at if earned else None,
            'progress': {
                'current': display_current,
                'target': target_value,
                'percentage': progress_percentage
            }
        })
    
    return badge_data
