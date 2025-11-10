# Feature Spec: Downloadable Resources

## Overview
Provide supplementary PDF materials per course (training plans, conditioning schedules, nutrition guides, technique breakdowns) to enhance learning experience.

---

## Requirements

### Resource Scope
- **Per-course resources** (not per-lesson)
  - All resources for a course are accessible from course detail page
  - Example: "8-Week Training Plan", "Nutrition Guide", "Shadowboxing Combinations"

### File Format
- **PDF only** (for MVP)
  - Consistent format, easy to view/print
  - Future: Could expand to images, videos, zip files

### Access Control
- **Subscription required** - Only active subscribers can download resources
- Same access logic as video lessons
- Resources remain accessible as long as subscription is active

### User Experience
- Resources listed on course detail page
- Each resource shows: title, description, file size
- One-click download (presigned URL)
- Resources are static (not interactive)

---

## Technical Design

### Storage Solution: **Django FileField + S3**

**Why FileField:**
- Simple, standard Django pattern
- Direct control over file handling
- Use django-storages for S3 integration
- Presigned URLs via boto3
- Cost-effective (just S3 storage + bandwidth)

**Rejected Alternative:** Mux for non-video assets
- Would be simpler (unified infrastructure)
- But adds unnecessary abstraction layer for PDFs
- FileField is more straightforward for static files

### Backend Changes

**New Model: `CourseResource`**
```python
class CourseResource(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='resources')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # File storage
    file = models.FileField(upload_to='course_resources/')

    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    order = models.PositiveIntegerField(default=0)  # For manual sorting

    class Meta:
        ordering = ['order', 'title']
        indexes = [
            models.Index(fields=['course', 'order']),
        ]

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    @property
    def file_size_mb(self):
        if self.file:
            return round(self.file.size / (1024 * 1024), 2)
        return None
```

**New Serializer: `CourseResourceSerializer`**
```python
import boto3
from django.conf import settings

class CourseResourceSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    file_size_mb = serializers.ReadOnlyField()

    class Meta:
        model = CourseResource
        fields = ['id', 'title', 'description', 'download_url', 'file_size_mb', 'uploaded_at']

    def get_download_url(self, obj):
        user = self.context['request'].user

        # Check if user has active subscription to this course
        has_access = Subscription.objects.filter(
            user=user,
            course=obj.course,
            status='active'
        ).exists()

        if not has_access:
            return None

        # Generate presigned S3 URL (expires in 1 hour)
        s3_client = boto3.client('s3')
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_STORAGE_BUCKET_NAME,
                'Key': obj.file.name
            },
            ExpiresIn=3600  # 1 hour
        )
        return url
```

**Update `CourseSerializer`:**
```python
class CourseSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    resources = CourseResourceSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [..., 'resources']
```

**New API Endpoint:**
```python
# In views.py
class CourseResourceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CourseResource.objects.all()
    serializer_class = CourseResourceSerializer
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, pk=None):
        resource = self.get_object()

        # Verify subscription
        has_subscription = Subscription.objects.filter(
            user=request.user,
            course=resource.course,
            status='active'
        ).exists()

        if not has_subscription:
            return Response(
                {'error': 'Active subscription required'},
                status=403
            )

        serializer = self.get_serializer(resource)
        return Response(serializer.data)

# In urls.py
router.register(r'resources', CourseResourceViewSet)
```

### Admin Upload Flow

**Approach: Django FileField with S3**

**Admin Interface (`admin.py`):**
```python
class CourseResourceInline(admin.TabularInline):
    model = CourseResource
    extra = 1
    fields = ['title', 'description', 'file', 'order']

class CourseAdmin(admin.ModelAdmin):
    # ... existing config ...
    inlines = [LessonInline, CourseResourceInline]
```

**Upload Process:**
1. Admin goes to Django admin → Courses
2. Edits course, scrolls to "Course Resources" inline
3. Clicks "Add another Course Resource"
4. Fills in title, description
5. Uploads PDF via file input (standard Django FileField)
6. Saves course
7. File automatically uploaded to S3 (via django-storages)
8. Resource appears on frontend for subscribers

### Frontend Changes

**Update Course Detail Page (`courses/[slug]/page.tsx`):**
```typescript
interface CourseResource {
  id: number
  title: string
  description: string
  download_url: string | null
  file_size_mb: number
  uploaded_at: string
}

interface Course {
  // ... existing fields ...
  resources: CourseResource[]
}

// In course detail page rendering:
<section className="mt-8">
  <h2 className="text-2xl font-bold mb-4">Course Resources</h2>
  {course.resources.length > 0 ? (
    <div className="space-y-4">
      {course.resources.map(resource => (
        <div key={resource.id} className="border rounded-lg p-4">
          <h3 className="font-semibold">{resource.title}</h3>
          <p className="text-gray-600 text-sm">{resource.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {resource.file_size_mb} MB
            </span>
            {resource.download_url ? (
              <a
                href={resource.download_url}
                download
                className="btn btn-primary"
              >
                Download PDF
              </a>
            ) : (
              <button disabled className="btn btn-disabled">
                Subscription Required
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="text-gray-500">No resources available yet.</p>
  )}
</section>
```

---

## User Flow

### For Students:
1. Navigate to course detail page
2. Scroll to "Course Resources" section
3. See list of available PDFs with descriptions
4. Click "Download PDF" button
5. Browser downloads PDF (or opens in new tab)
6. Can re-download anytime while subscribed

### For Admins:
1. Go to Django admin → Courses
2. Edit existing course
3. Scroll to "Course Resources" inline section
4. Add new resource:
   - Enter title (e.g., "8-Week Training Plan")
   - Enter description (e.g., "Progressive strength and conditioning schedule")
   - Upload PDF via FileField
   - Set order (for sorting)
5. Save course
6. Resource appears on course detail page for subscribers

---

## Example Resources for Dieselnoi Courses

**Beginner Course:**
- "Fundamental Techniques Checklist" - Reference sheet for all basic strikes
- "Week-by-Week Training Plan" - 8-week progression for beginners
- "Shadowboxing Routine" - 10-minute shadowboxing combinations

**Intermediate Course:**
- "Clinch Techniques Breakdown" - Illustrated guide to clinch positions
- "Conditioning Workout Schedule" - 12-week strength & cardio plan
- "Combination Library" - 50 advanced striking combinations

**Advanced Course:**
- "Fight Camp Template" - 8-week pre-fight training plan
- "Sparring Drills" - Partner drills for timing and distance
- "Mental Preparation Guide" - Pre-fight psychology and visualization

---

## Security Considerations

1. **Presigned URLs**
   - URLs expire after 1 hour (prevent sharing)
   - Tied to user session (can't share link)

2. **Subscription Validation**
   - Check subscription status on every download request
   - Return 403 if subscription expired

3. **Rate Limiting**
   - Limit downloads per user per hour (prevent abuse)
   - Django REST framework throttling

4. **File Validation**
   - Validate PDF format on upload
   - Scan for malware (future: VirusTotal integration)
   - Max file size: 50MB

---

## Open Questions

1. **Versioning?**
   - If admin updates a PDF, do we keep old version?
   - Recommendation: Overwrite (simpler), add version number to title if needed

2. **Download tracking?**
   - Track which users downloaded which resources?
   - Analytics: most downloaded resources
   - Recommendation: Phase 2 feature

3. **Lesson-specific resources?**
   - Should some resources be tied to specific lessons instead of course-wide?
   - Example: "Drill video transcript" for a specific lesson
   - Recommendation: Start course-wide, add lesson-level later if needed

4. **Mobile app?**
   - How do resources work in a future mobile app?
   - Recommendation: Presigned URLs work the same, mobile can download to device

---

## Success Metrics

- % of subscribers who download at least one resource
- Most downloaded resources (informs future content)
- Correlation between resource downloads and course completion
- User feedback on resource quality/usefulness

---

## Implementation Phases

**Phase 1: MVP**
- CourseResource model with Django FileField
- S3 integration via django-storages
- Admin inline for uploading PDFs
- Course detail page resources section
- Subscription-gated downloads with presigned URLs

**Phase 2: Enhanced Features**
- Download tracking and analytics
- Most downloaded resources metrics
- File validation (size limits, PDF only)

**Phase 3: Advanced Features**
- Lesson-specific resources (in addition to course-wide)
- Resource versioning (track updates)
- Mobile app support
- Video resources (workout follow-alongs, etc.)
- Migrate to Mux if unified asset management becomes valuable

---

## Migration Notes

**S3 Configuration (if not using Mux):**
```python
# settings.py
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = 'dieselnoi-course-resources'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Use django-storages for S3 integration
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

**Presigned URL Generation:**
```python
import boto3
from botocore.exceptions import NoCredentialsError

def generate_presigned_url(file_key, expiration=3600):
    s3_client = boto3.client('s3')
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.AWS_STORAGE_BUCKET_NAME, 'Key': file_key},
            ExpiresIn=expiration
        )
        return url
    except NoCredentialsError:
        return None
```
