from django.core.management.base import BaseCommand
from django.conf import settings
import mux_python
from mux_python.rest import ApiException
from core.models import Lesson


class Command(BaseCommand):
    help = 'Upload a video file to Mux and associate it with a lesson'

    def add_arguments(self, parser):
        parser.add_argument('lesson_id', type=int, help='Lesson ID to upload video for')
        parser.add_argument('video_url', type=str, help='Video URL to upload (must be publicly accessible)')

    def handle(self, *args, **options):
        lesson_id = options['lesson_id']
        video_url = options['video_url']

        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Lesson with ID {lesson_id} does not exist'))
            return

        # Configure Mux API
        configuration = mux_python.Configuration()
        configuration.username = settings.MUX_TOKEN_ID
        configuration.password = settings.MUX_TOKEN_SECRET

        # Create API instances
        assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))

        try:
            self.stdout.write(f'Creating Mux asset for lesson: {lesson.title}')

            # Create an asset from a URL
            create_asset_request = mux_python.CreateAssetRequest(
                input=[mux_python.InputSettings(url=video_url)],
                playback_policy=[mux_python.PlaybackPolicy.SIGNED],  # Use signed URLs for security
                mp4_support='standard'  # Enable MP4 downloads (optional)
            )

            create_asset_response = assets_api.create_asset(create_asset_request)
            asset = create_asset_response.data

            self.stdout.write(self.style.SUCCESS(f'✓ Created Mux asset: {asset.id}'))

            # Get the playback ID
            if asset.playback_ids and len(asset.playback_ids) > 0:
                playback_id = asset.playback_ids[0].id

                # Update lesson with Mux IDs
                lesson.mux_asset_id = asset.id
                lesson.mux_playback_id = playback_id
                lesson.save()

                self.stdout.write(self.style.SUCCESS(f'✓ Updated lesson with Mux IDs'))
                self.stdout.write(self.style.SUCCESS(f'  Asset ID: {asset.id}'))
                self.stdout.write(self.style.SUCCESS(f'  Playback ID: {playback_id}'))
                self.stdout.write(self.style.SUCCESS(f''))
                self.stdout.write(self.style.SUCCESS(f'Note: Video is still processing. It will be available shortly.'))
            else:
                self.stdout.write(self.style.ERROR('No playback IDs found'))

        except ApiException as e:
            self.stdout.write(self.style.ERROR(f'Mux API error: {e}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))
