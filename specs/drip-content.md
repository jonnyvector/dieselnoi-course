# Feature Spec: Drip Content

## Overview
Release course lessons on a fixed schedule to maintain engagement, prevent binging, and create structured learning rhythm.

---

## Requirements

### Scheduling Model
- **Fixed-date scheduling** - Lessons unlock on specific calendar dates
- Set by admin when creating/editing course
- Example: Lesson 1 unlocks Jan 1, Lesson 2 unlocks Jan 8, etc.

### Subscription Pause Handling
- **Paused subscription = frozen access**
  - If user pauses/cancels subscription, their lesson unlock schedule freezes
  - When they re-subscribe, schedule continues from where it left off
  - Example: User paused on Day 10, lesson 3 was supposed to unlock Day 14. When they resume on Feb 1, lesson 3 unlocks on Feb 5 (4 days later)

- **Alternative approach:** Enrollment-date-based (Days after subscription start)
  - Simpler but doesn't work well with fixed dates
  - **Rejected** - Fixed dates are clearer for marketing/launch events

### Locked Lesson Behavior
- Locked lessons are visible in course outline (greyed out)
- Show unlock date on locked lessons
- Cannot access video or comments for locked lessons
- Can still view lesson title and description

### Override Rules
- **Free preview lessons** bypass drip scheduling (always accessible)
- **Admin override** - Ability to manually unlock lessons for specific users
- **Completion-based unlocking** (optional future feature) - Unlock next lesson when previous is 100% complete

---

## Technical Design

### Backend Changes

**Update `Lesson` Model:**
```python
class Lesson(models.Model):
    # ... existing fields ...
    unlock_date = models.DateField(null=True, blank=True)
    # If null, lesson is immediately available (legacy courses)
    # If set, lesson unlocks on this date
```

**New Model: `LessonUnlock`** (for subscription pause handling)
```python
class LessonUnlock(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'lesson']
        indexes = [
            models.Index(fields=['user', 'lesson']),
        ]
```

**Update `LessonSerializer`:**
```python
def to_representation(self, instance):
    data = super().to_representation(instance)
    user = self.context['request'].user

    # Check if lesson is locked
    is_locked = self._is_lesson_locked(instance, user)
    data['is_locked'] = is_locked
    data['unlock_date'] = instance.unlock_date

    # Hide video URL if locked
    if is_locked and not instance.is_free_preview:
        data['mux_playback_id'] = None

    return data

def _is_lesson_locked(self, lesson, user):
    # Free previews are never locked
    if lesson.is_free_preview:
        return False

    # No unlock date = not using drip content
    if not lesson.unlock_date:
        return False

    # Check if lesson has been manually unlocked for this user
    if LessonUnlock.objects.filter(user=user, lesson=lesson).exists():
        return False

    # Check if unlock date has passed
    today = timezone.now().date()
    return lesson.unlock_date > today
```

**New API Endpoint:**
```python
POST /api/lessons/{id}/unlock/
# Admin-only endpoint to manually unlock lesson for a user
# Request: {user_id: 123}
# Creates LessonUnlock record
```

**Update Subscription Webhook Handler:**
```python
def handle_subscription_cancelled(subscription):
    # When subscription is cancelled/paused, we don't need to do anything
    # Locked lessons will remain locked until they resubscribe
    # LessonUnlock records persist (already unlocked lessons stay unlocked)
    pass

def handle_subscription_reactivated(subscription):
    # When reactivated, calculate new unlock dates based on pause duration
    # Option A: Shift all future unlock dates by pause duration
    # Option B: Just use global unlock dates (simpler)
    # DECISION: Use Option B (simpler, fixed dates are fixed)
    pass
```

### Admin Interface Changes

**Lesson Admin:**
- Add `unlock_date` field to Lesson form
- Date picker for setting unlock date
- Optional: Bulk action to set unlock dates (e.g., "Every 7 days starting from...")

**Bulk Scheduling Tool (Nice-to-have):**
```python
# In Django admin, add action to set drip schedule for all lessons in a course
def set_drip_schedule(modeladmin, request, queryset):
    # Form: Start date, interval (days)
    # Auto-sets unlock_date for each lesson in order
```

### Frontend Changes

**Course Detail Page (`courses/[slug]/page.tsx`):**
```typescript
interface Lesson {
  // ... existing fields ...
  is_locked: boolean
  unlock_date: string | null
}

// In lesson list rendering:
{lessons.map(lesson => (
  <div className={lesson.is_locked ? 'opacity-50' : ''}>
    <h3>{lesson.title}</h3>
    {lesson.is_locked && (
      <div className="text-sm text-gray-500">
        🔒 Unlocks on {formatDate(lesson.unlock_date)}
      </div>
    )}
  </div>
))}
```

**Lesson Detail Page (`courses/[slug]/lessons/[id]/page.tsx`):**
```typescript
// If lesson is locked, show unlock message instead of video player
{lesson.is_locked ? (
  <div className="text-center py-12">
    <LockIcon className="w-16 h-16 mx-auto mb-4" />
    <h2>This lesson unlocks on {formatDate(lesson.unlock_date)}</h2>
    <p>Check back soon!</p>
  </div>
) : (
  <MuxPlayer playbackId={lesson.mux_playback_id} />
)}
```

---

## User Flow

### For Students:
1. User subscribes to course with drip content enabled
2. Sees full course outline with some lessons locked
3. Each lesson shows unlock date
4. On unlock date, lesson becomes accessible
5. If user pauses subscription, locked lessons remain locked
6. When user resubscribes, lessons unlock according to original schedule

### For Admins:
1. Create course in Django admin
2. Create lessons
3. Set unlock dates for each lesson (or use bulk tool)
4. Publish course
5. Students see drip schedule automatically
6. Admin can manually unlock lessons for specific users if needed

---

## Subscription Pause Scenarios

**Scenario 1: User pauses before any lessons unlock**
- User subscribes Jan 1
- Lesson 1 unlocks Jan 7
- User pauses Jan 3
- User resubscribes Feb 1
- **Result:** Lesson 1 still unlocks Jan 7 (already passed, so unlocks immediately)

**Scenario 2: User pauses mid-course**
- User subscribes Jan 1
- Lesson 1 unlocks Jan 7 (accessed)
- Lesson 2 unlocks Jan 14
- User pauses Jan 10
- User resubscribes Feb 1
- **Result:** Lesson 2 already unlocked (Jan 14 passed), immediately accessible

**Scenario 3: Future unlock dates**
- User subscribes Jan 1
- Lesson 5 unlocks Mar 1
- User pauses Jan 15
- User resubscribes Feb 1
- **Result:** Lesson 5 still unlocks Mar 1 (fixed date)

**Key Decision:** Fixed dates mean lessons unlock on calendar dates regardless of pause. This is simpler and clearer for marketing ("New lesson every Monday").

---

## Edge Cases

1. **No unlock date set** - Lesson is immediately available (backward compatible)
2. **Free preview + unlock date** - Free preview wins, always accessible
3. **User changes timezone** - Use server timezone for unlock date checks
4. **Lesson deleted** - No impact, drip schedule continues for remaining lessons
5. **Manual unlock then re-lock** - Delete LessonUnlock record to re-lock
6. **Subscription expires** - User loses access to all lessons (existing behavior)

---

## Open Questions

1. **Time of day for unlocks?**
   - Unlock at midnight? Or specific time (e.g., 9am)?
   - Recommendation: Midnight server time (simple, clear)

2. **Notification when lesson unlocks?**
   - Email notification when new lesson is available?
   - Phase 2 feature

3. **Course-level toggle?**
   - Some courses use drip, others don't?
   - Recommendation: Yes, implicit (if no unlock dates, no drip)

4. **Drip for new lessons added later?**
   - If course is live and admin adds lesson 20, what's the unlock date?
   - Recommendation: Admin must set manually (no auto-schedule)

---

## Success Metrics

- Course completion rates (should increase with drip)
- Subscription retention (structured rhythm keeps users engaged)
- Lesson unlock notifications opened (if implemented)
- Avg time between subscription start and course completion

---

## Implementation Phases

**Phase 1: Core Functionality (MVP)**
- Add `unlock_date` to Lesson model
- Update serializer to check unlock status
- Frontend locked lesson UI
- Admin interface to set unlock dates

**Phase 2: Admin Tools**
- Bulk scheduling tool
- Manual unlock override
- Analytics: upcoming unlocks, locked lesson metrics

**Phase 3: Student Experience**
- Email notifications for new lesson unlocks
- Countdown timer for next unlock
- "Binge mode" toggle (admin can disable drip for specific users)

---

## Migration Notes

**Backward Compatibility:**
- Existing courses have no unlock dates → immediately available (no change)
- New courses can opt-in to drip by setting unlock dates
- No data migration required
