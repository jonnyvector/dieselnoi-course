# Manual migration to handle thumbnail column naming
from django.db import migrations


def rename_if_exists(apps, schema_editor):
    """Rename thumbnail to thumbnail_url only if it exists"""
    with schema_editor.connection.cursor() as cursor:
        # Check if 'thumbnail' column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='core_course' AND column_name='thumbnail'
        """)
        if cursor.fetchone():
            # Rename thumbnail to thumbnail_url
            cursor.execute('ALTER TABLE core_course RENAME COLUMN thumbnail TO thumbnail_url')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_lessonprogress_core_lesson_lesson__e27728_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(rename_if_exists, reverse_code=migrations.RunPython.noop),
    ]
