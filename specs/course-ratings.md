# Feature Spec: Course Ratings & Reviews

## Overview
Allow students to rate and review courses using a 5-star system with written feedback. Provides social proof, helps prospective students, and gives instructors valuable feedback.

---

## Requirements

### Rating System
- **5-star rating** (1-5 scale, half-stars not supported for simplicity)
- **Written review** (optional, but encouraged)
- **Completion requirement:** Must complete at least 50% of course lessons before rating
- **One review per user per course** (can edit later)

### Review Display
- Show on course detail page
- Display: rating, review text, reviewer name, date posted, edited status
- Sort by: newest first (default), highest rated, lowest rated
- Show average rating and total review count

### Moderation
- Admins can hide/delete inappropriate reviews
- Admins can mark reviews as "featured" (displayed prominently)
- No user-reported flagging (admin moderation only for MVP)

### Review Editing
- Users can edit their own review anytime
- Mark as "edited" if modified after initial post
- Cannot delete (prevents gaming the system)

---

## Technical Design

### Backend Changes

**New Model: `CourseReview`**
```python
class CourseReview(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # Rating & content
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    review_text = models.TextField(blank=True, max_length=2000)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_edited = models.BooleanField(default=False)

    # Moderation
    is_hidden = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)

    class Meta:
        unique_together = ['user', 'course']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['course', 'is_hidden']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.title} ({self.rating}⭐)"

    def save(self, *args, **kwargs):
        # Mark as edited if review_text or rating changed
        if self.pk:  # Existing review
            old_review = CourseReview.objects.get(pk=self.pk)
            if (old_review.rating != self.rating or
                old_review.review_text != self.review_text):
                self.is_edited = True
        super().save(*args, **kwargs)
```

**Update `Course` Model (add aggregated rating fields):**
```python
class Course(models.Model):
    # ... existing fields ...

    # Cached rating data (updated via signal or task)
    average_rating = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True
    )
    total_reviews = models.PositiveIntegerField(default=0)

    def update_rating_cache(self):
        """Recalculate average rating and total reviews"""
        reviews = self.reviews.filter(is_hidden=False)
        self.total_reviews = reviews.count()
        if self.total_reviews > 0:
            self.average_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        else:
            self.average_rating = None
        self.save()
```

**Signal to Update Course Rating Cache:**
```python
# signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=CourseReview)
def update_course_rating_on_save(sender, instance, **kwargs):
    instance.course.update_rating_cache()

@receiver(post_delete, sender=CourseReview)
def update_course_rating_on_delete(sender, instance, **kwargs):
    instance.course.update_rating_cache()
```

**New Serializer: `CourseReviewSerializer`**
```python
class CourseReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = CourseReview
        fields = [
            'id', 'rating', 'review_text', 'user_name',
            'created_at', 'updated_at', 'is_edited',
            'is_featured', 'can_edit'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at', 'is_edited']

    def get_user_name(self, obj):
        """Format as 'A. Smith' (first initial + last name)"""
        user = obj.user
        if user.first_name and user.last_name:
            first_initial = user.first_name[0].upper()
            return f"{first_initial}. {user.last_name}"
        elif user.last_name:
            return user.last_name
        else:
            return "Anonymous User"

    def get_can_edit(self, obj):
        user = self.context['request'].user
        return obj.user == user

    def validate(self, data):
        user = self.context['request'].user
        course = self.context['course']

        # Check 50% completion requirement
        total_lessons = course.lessons.count()
        if total_lessons == 0:
            raise serializers.ValidationError("This course has no lessons yet.")

        completed_lessons = LessonProgress.objects.filter(
            user=user,
            lesson__course=course,
            is_completed=True
        ).count()

        completion_percentage = (completed_lessons / total_lessons) * 100

        if completion_percentage < 50:
            raise serializers.ValidationError(
                f"You must complete at least 50% of the course to leave a review. "
                f"Current progress: {completion_percentage:.0f}%"
            )

        return data
```

**Update `CourseSerializer`:**
```python
class CourseSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    total_reviews = serializers.IntegerField(read_only=True)
    user_review = serializers.SerializerMethodField()

    def get_user_review(self, obj):
        """Return current user's review if exists"""
        user = self.context['request'].user
        try:
            review = obj.reviews.get(user=user)
            return CourseReviewSerializer(review, context=self.context).data
        except CourseReview.DoesNotExist:
            return None
```

**New ViewSet: `CourseReviewViewSet`**
```python
class CourseReviewViewSet(viewsets.ModelViewSet):
    serializer_class = CourseReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.request.query_params.get('course_id')
        queryset = CourseReview.objects.filter(is_hidden=False)

        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # Sorting
        sort = self.request.query_params.get('sort', 'newest')
        if sort == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort == 'lowest':
            queryset = queryset.order_by('rating', '-created_at')
        else:  # newest
            queryset = queryset.order_by('-created_at')

        return queryset

    def perform_create(self, serializer):
        course_id = self.request.data.get('course_id')
        course = Course.objects.get(id=course_id)

        # Verify subscription
        has_subscription = Subscription.objects.filter(
            user=self.request.user,
            course=course,
            status='active'
        ).exists()

        if not has_subscription:
            raise PermissionDenied("Active subscription required to review this course.")

        serializer.save(user=self.request.user, course=course)

    def perform_update(self, serializer):
        # Only allow editing own reviews
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You can only edit your own reviews.")

        serializer.save()

    def perform_destroy(self, instance):
        # Only admins can delete reviews
        if not self.request.user.is_staff:
            raise PermissionDenied("Only administrators can delete reviews.")

        instance.delete()

# In urls.py
router.register(r'reviews', CourseReviewViewSet, basename='review')
```

**API Endpoints:**
- `GET /api/reviews/?course_id=1&sort=newest` - List reviews for a course
- `POST /api/reviews/` - Create a review
  - Request: `{course_id: 1, rating: 5, review_text: "Great course!"}`
- `PUT /api/reviews/{id}/` - Update own review
- `DELETE /api/reviews/{id}/` - Delete review (admin only)

### Admin Interface Changes

**Admin (`admin.py`):**
```python
@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'course', 'rating', 'created_at', 'is_edited', 'is_hidden', 'is_featured']
    list_filter = ['rating', 'is_hidden', 'is_featured', 'created_at']
    search_fields = ['user__email', 'course__title', 'review_text']
    readonly_fields = ['user', 'course', 'created_at', 'updated_at', 'is_edited']

    fieldsets = (
        ('Review Details', {
            'fields': ('user', 'course', 'rating', 'review_text')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'is_edited')
        }),
        ('Moderation', {
            'fields': ('is_hidden', 'is_featured')
        }),
    )

    actions = ['mark_as_hidden', 'mark_as_visible', 'mark_as_featured']

    def mark_as_hidden(self, request, queryset):
        queryset.update(is_hidden=True)
        for review in queryset:
            review.course.update_rating_cache()

    def mark_as_visible(self, request, queryset):
        queryset.update(is_hidden=False)
        for review in queryset:
            review.course.update_rating_cache()

    def mark_as_featured(self, request, queryset):
        queryset.update(is_featured=True)
```

### Frontend Changes

**Update Course Detail Page (`courses/[slug]/page.tsx`):**
```typescript
interface CourseReview {
  id: number
  rating: number
  review_text: string
  user_name: string
  created_at: string
  updated_at: string
  is_edited: boolean
  is_featured: boolean
  can_edit: boolean
}

interface Course {
  // ... existing fields ...
  average_rating: number
  total_reviews: number
  user_review: CourseReview | null
}

// In course detail page:
<section className="mt-8">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-2xl font-bold">Student Reviews</h2>
      {course.average_rating && (
        <div className="flex items-center mt-2">
          <StarRating rating={course.average_rating} />
          <span className="ml-2 text-lg font-semibold">{course.average_rating.toFixed(1)}</span>
          <span className="ml-2 text-gray-600">({course.total_reviews} reviews)</span>
        </div>
      )}
    </div>

    {/* Write Review Button */}
    {!course.user_review && canReview && (
      <button onClick={openReviewModal} className="btn btn-primary">
        Write a Review
      </button>
    )}
  </div>

  {/* User's Review (if exists) */}
  {course.user_review && (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">Your Review</p>
          <StarRating rating={course.user_review.rating} />
          <p className="mt-2">{course.user_review.review_text}</p>
          {course.user_review.is_edited && (
            <p className="text-xs text-gray-500 mt-1">Edited</p>
          )}
        </div>
        <button onClick={editReview} className="btn btn-sm">Edit</button>
      </div>
    </div>
  )}

  {/* All Reviews */}
  <ReviewList courseId={course.id} />
</section>
```

**New Component: `ReviewList.tsx`**
```typescript
export default function ReviewList({ courseId }: { courseId: number }) {
  const [reviews, setReviews] = useState<CourseReview[]>([])
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetch(`/api/reviews/?course_id=${courseId}&sort=${sort}`)
      .then(res => res.json())
      .then(data => setReviews(data))
  }, [courseId, sort])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="highest">Highest Rated</option>
          <option value="lowest">Lowest Rated</option>
        </select>
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className={`border rounded-lg p-4 ${review.is_featured ? 'border-yellow-400 bg-yellow-50' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center">
                  <StarRating rating={review.rating} />
                  <span className="ml-2 font-semibold">{review.user_name}</span>
                  {review.is_featured && (
                    <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">Featured</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {formatDate(review.created_at)}
                  {review.is_edited && ' (edited)'}
                </p>
              </div>
            </div>
            {review.review_text && (
              <p className="mt-2">{review.review_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**New Component: `StarRating.tsx`**
```typescript
export default function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`w-5 h-5 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}
```

**Review Modal Component:**
```typescript
function ReviewModal({ course, existingReview, onClose, onSubmit }) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '')

  const handleSubmit = async () => {
    const method = existingReview ? 'PUT' : 'POST'
    const url = existingReview
      ? `/api/reviews/${existingReview.id}/`
      : '/api/reviews/'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        course_id: course.id,
        rating,
        review_text: reviewText
      })
    })

    if (response.ok) {
      onSubmit()
      onClose()
    } else {
      const error = await response.json()
      alert(error.detail || 'Failed to submit review')
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-bold mb-4">
        {existingReview ? 'Edit Review' : 'Write a Review'}
      </h2>

      <div className="mb-4">
        <label className="block mb-2">Your Rating</label>
        <div className="flex">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-2">Your Review (Optional)</label>
        <textarea
          value={reviewText}
          onChange={e => setReviewText(e.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full border rounded p-2"
          placeholder="Share your experience with this course..."
        />
        <p className="text-sm text-gray-500 mt-1">
          {reviewText.length}/2000 characters
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={rating === 0}
          className="btn btn-primary"
        >
          {existingReview ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </Modal>
  )
}
```

---

## User Flow

### Writing a Review:
1. Student completes 50%+ of course
2. "Write a Review" button appears on course detail page
3. Student clicks button → review modal opens
4. Student selects 1-5 star rating (required)
5. Student writes review text (optional)
6. Student submits review
7. Review appears on course page immediately
8. Course average rating updates

### Editing a Review:
1. Student sees their review highlighted on course page
2. Clicks "Edit" button
3. Review modal opens with existing rating/text
4. Student modifies rating or text
5. Submits → review updates with "edited" flag

### Admin Moderation:
1. Admin receives report of inappropriate review (via email/support)
2. Admin goes to Django admin → Course Reviews
3. Finds review, marks as "is_hidden=True"
4. Review disappears from frontend
5. Course average rating recalculates

---

## Edge Cases

1. **User completes 50% then subscription expires**
   - Can still edit existing review (they earned it)
   - Cannot create new review after resubscribing (would be duplicate)

2. **Course has 0 lessons**
   - Cannot review (validation error)

3. **User deletes account**
   - Reviews remain but show "[Deleted User]" (preserve social proof)
   - Implement in User model: `on_delete=SET_NULL` with nullable FK

4. **Admin deletes course**
   - Reviews are cascade deleted (no orphan reviews)

5. **Spam/abuse reviews**
   - Admin hides review
   - Future: Add report button, automated spam detection

---

## Open Questions

1. **Review helpfulness voting?**
   - "Was this review helpful?" thumbs up/down
   - Recommendation: Phase 2 feature

2. **Respond to reviews?**
   - Should instructors/admins be able to respond to reviews?
   - Recommendation: Phase 2 feature (creates engagement)

3. **Photo/video reviews?**
   - Allow users to upload progress photos with review?
   - Recommendation: Future consideration (high value for martial arts)

4. **Review incentives?**
   - Offer discount code for leaving review?
   - Recommendation: No (could bias ratings)

---

## Success Metrics

- % of eligible students (50%+ completion) who leave reviews
- Average rating across all courses
- Correlation between high ratings and course completion
- Review length (longer reviews = more engaged students)
- Conversion rate: prospective students who view reviews vs subscribe

---

## Implementation Phases

**Phase 1: Core Functionality (MVP)**
- CourseReview model and API
- 50% completion validation
- Write/edit review flow
- Display reviews on course page
- Admin moderation (hide/feature)
- Average rating display

**Phase 2: Enhanced Engagement**
- Review helpfulness voting
- Instructor responses to reviews
- Email notifications (new review, featured review)
- Review sorting by helpfulness

**Phase 3: Advanced Features**
- Photo/video reviews
- Review analytics dashboard (for admins)
- Automated spam detection
- Review reporting by users
- Review highlights on homepage (best courses)

---

## Migration Notes

**Populating Average Rating for Existing Courses:**
```python
# Management command to backfill ratings
from django.core.management.base import BaseCommand
from core.models import Course

class Command(BaseCommand):
    def handle(self, *args, **options):
        for course in Course.objects.all():
            course.update_rating_cache()
            self.stdout.write(f"Updated ratings for {course.title}")
```
