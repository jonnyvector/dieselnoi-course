from django.core.management.base import BaseCommand
from core.models import Course

class Command(BaseCommand):
    help = 'Generate course thumbnails from first lesson Mux video'

    def handle(self, *args, **options):
        courses = Course.objects.all()
        
        for course in courses:
            first_lesson = course.lessons.order_by('order').first()
            
            if first_lesson and first_lesson.mux_playback_id:
                # Use Mux thumbnail API
                thumbnail_url = f"https://image.mux.com/{first_lesson.mux_playback_id}/thumbnail.jpg?time=1"
                course.thumbnail_url = thumbnail_url
                course.save()
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Generated thumbnail for: {course.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'✗ No video found for: {course.title}')
                )
        
        self.stdout.write(self.style.SUCCESS('\nDone!'))
