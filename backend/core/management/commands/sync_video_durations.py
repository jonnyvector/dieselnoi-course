from django.core.management.base import BaseCommand
from django.conf import settings
import mux_python
import math
from core.models import Lesson


class Command(BaseCommand):
    help = 'Sync video durations from Mux for all lessons with Mux videos'

    def handle(self, *args, **options):
        # Configure Mux API
        configuration = mux_python.Configuration()
        configuration.username = settings.MUX_TOKEN_ID
        configuration.password = settings.MUX_TOKEN_SECRET

        assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))

        # Get all lessons that have a Mux asset ID
        lessons = Lesson.objects.filter(mux_asset_id__isnull=False).exclude(mux_asset_id='')

        self.stdout.write(f"Found {lessons.count()} lessons with Mux videos")

        updated_count = 0
        error_count = 0

        for lesson in lessons:
            try:
                # Fetch asset details from Mux
                asset = assets_api.get_asset(lesson.mux_asset_id)
                duration_seconds = asset.data.duration

                if duration_seconds:
                    # Convert seconds to minutes (rounding up)
                    duration_minutes = math.ceil(duration_seconds / 60)
                    old_duration = lesson.duration_minutes
                    lesson.duration_minutes = duration_minutes
                    lesson.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Updated '{lesson.title}': {old_duration}min → {duration_minutes}min ({duration_seconds:.1f}s)"
                        )
                    )
                    updated_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f"⚠ No duration found for '{lesson.title}'")
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✗ Error updating '{lesson.title}': {str(e)}")
                )
                error_count += 1

        self.stdout.write("\n" + "="*60)
        self.stdout.write(self.style.SUCCESS(f"Updated: {updated_count} lessons"))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f"Errors: {error_count} lessons"))
        self.stdout.write("="*60)
