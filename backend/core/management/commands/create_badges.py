# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from core.models import Badge


class Command(BaseCommand):
    help = 'Create initial achievement badges'

    def handle(self, *args, **options):
        badges = [
            # Starter Badges
            {
                'name': 'First Steps',
                'description': 'Complete your first lesson',
                'icon': 'gi-white-belt',
                'category': 'starter',
                'requirement_value': 1,
            },
            {
                'name': 'Getting Started',
                'description': 'Complete 5 lessons',
                'icon': 'books',
                'category': 'starter',
                'requirement_value': 5,
            },
            {
                'name': 'Committed Learner',
                'description': 'Complete 10 lessons',
                'icon': 'muscle',
                'category': 'starter',
                'requirement_value': 10,
            },

            # Course Completion Badges
            {
                'name': 'Course Complete',
                'description': 'Complete any course (100%)',
                'icon': 'check-circle',
                'category': 'completion',
                'requirement_value': 1,
            },
            {
                'name': 'Completionist',
                'description': 'Complete all available courses',
                'icon': 'trophy',
                'category': 'completion',
                'requirement_value': None,  # Special logic needed
            },

            # Engagement Badges
            {
                'name': 'Conversation Starter',
                'description': 'Leave your first comment',
                'icon': 'chat',
                'category': 'engagement',
                'requirement_value': 1,
            },
            {
                'name': 'Active Member',
                'description': 'Leave 10 comments',
                'icon': 'chat-dots',
                'category': 'engagement',
                'requirement_value': 10,
            },
        ]

        created_count = 0
        updated_count = 0

        for badge_data in badges:
            badge, created = Badge.objects.update_or_create(
                name=badge_data['name'],
                defaults=badge_data
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created badge: {badge.icon} {badge.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated badge: {badge.icon} {badge.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nTotal: {created_count} created, {updated_count} updated'
            )
        )
