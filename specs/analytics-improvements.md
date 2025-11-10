# Analytics Improvements Specification

## Problem Statement
Current analytics dashboard shows aggregated data across all courses, making it difficult to:
- Identify which specific courses are performing well
- Track active subscribers per individual course
- Monitor engagement metrics per course
- Make data-driven decisions about individual course content

## Goals
1. **Per-course detailed analytics** - Individual course performance tracking
2. **Active subscriber tracking** - Current active subscribers per course (not just total enrollments)
3. **Granular engagement metrics** - Watch time, completion rates, drop-off points per course
4. **Revenue tracking** - MRR and revenue breakdown by course
5. **Trend analysis** - Historical data showing course performance over time

---

## Required Data Points (Per Course)

### Subscription Metrics
- **Active Subscribers** - Count of users with `status='active'` subscription to this course
- **Total Enrollments** - All-time subscribers (including cancelled/expired)
- **New Subscribers (7d/30d)** - Recent subscription growth
- **Churn Rate** - Percentage of subscribers who cancelled
- **Subscriber Growth Trend** - Daily/weekly active subscriber counts over last 30 days

### Engagement Metrics
- **Total Watch Time** - Cumulative hours watched across all lessons in course
- **Avg Watch Time per User** - Average hours per active subscriber
- **Completion Rate** - Percentage of active subscribers who completed the course
- **Avg Progress** - Average completion percentage across all active subscribers
- **Drop-off Points** - Which lessons have highest abandonment rates

### Revenue Metrics
- **Monthly Recurring Revenue (MRR)** - Active subs × course price
- **Total Revenue** - All-time revenue from this course
- **Revenue Trend** - MRR over last 30 days
- **Average Revenue Per User (ARPU)** - MRR / active subscribers

### Content Metrics
- **Lesson Count** - Total lessons in course
- **Total Duration** - Sum of all lesson durations
- **Most Watched Lessons** - Top 5 by watch time
- **Least Watched Lessons** - Bottom 5 by watch time
- **Most Commented Lessons** - Lessons with highest engagement

---

## UI Requirements

### 1. Course Analytics Overview (Main Dashboard)
**Location:** `/admin/analytics`

**Table Columns:**
- Course Title
- **Active Subscribers** (new - currently shows "enrollments")
- Total Enrollments (all-time)
- Completion Rate
- Avg Progress
- Total Watch Time
- **Avg Watch Time/User** (new)
- **MRR** (currently shows "monthly_revenue")
- **Churn Rate** (new)

**Sorting:** Allow sorting by any column

**Actions:** Click course row to view detailed course analytics

### 2. Individual Course Detail Page (New)
**Location:** `/admin/analytics/courses/[slug]`

**Sections:**

#### A. Course Header
- Course title, difficulty, price
- Quick stats: Active subs, MRR, completion rate

#### B. Subscriber Metrics
- Active Subscribers (current count)
- Total Enrollments (all-time)
- New Subscribers (7d, 30d)
- Cancelled Subscribers (7d, 30d)
- Churn Rate
- **Chart:** Active subscribers trend (last 30 days)

#### C. Engagement Metrics
- Total Watch Time
- Avg Watch Time per User
- Completion Rate
- Avg Progress
- **Chart:** Daily watch time (last 30 days)
- **Chart:** Completion funnel (lesson 1 → lesson N)

#### D. Revenue Metrics
- MRR (current)
- Total Revenue (all-time)
- ARPU
- **Chart:** MRR trend (last 30 days)

#### E. Lesson Performance Table
**Columns:**
- Lesson Title
- Order
- Duration
- Unique Viewers
- Total Watch Time
- Avg Watch Time
- Completion Rate
- Comment Count
- Drop-off Rate

**Features:**
- Sortable columns
- Identify problem lessons (high drop-off, low completion)
- Click to view lesson-specific analytics

#### F. User Activity List
**Table showing recent activity:**
- Username
- Last Watched
- Progress %
- Watch Time
- Subscription Status
- Subscription Start Date

---

## API Endpoints

### Existing Endpoints to Modify

#### 1. `GET /api/analytics/courses/`
**Current:** Returns aggregated course list
**Change:** Add `active_subscribers` field

**Response:**
```json
{
  "courses": [
    {
      "course_slug": "fundamentals",
      "title": "Muay Thai Fundamentals",
      "lesson_count": 12,
      "enrollments": 150,           // Total all-time
      "active_subscribers": 120,    // NEW - Currently active
      "total_subscribers": 150,     // Same as enrollments
      "completion_rate": 45.5,
      "avg_progress": 67.2,
      "total_watch_time_hours": 1250,
      "avg_watch_time_per_user": 10.4,  // NEW
      "monthly_revenue": 3000.00,
      "churn_rate": 12.5             // NEW
    }
  ]
}
```

### New Endpoints

#### 2. `GET /api/analytics/courses/{slug}/` (New Detail Endpoint)
**Purpose:** Get detailed analytics for specific course

**Response:**
```json
{
  "course": {
    "slug": "fundamentals",
    "title": "Muay Thai Fundamentals",
    "difficulty": "beginner",
    "price": 25.00,
    "lesson_count": 12,
    "total_duration_minutes": 360
  },
  "subscribers": {
    "active": 120,
    "total_all_time": 150,
    "new_7d": 5,
    "new_30d": 18,
    "cancelled_7d": 2,
    "cancelled_30d": 8,
    "churn_rate": 12.5,
    "trend": [
      {"date": "2025-01-01", "active_count": 115},
      {"date": "2025-01-02", "active_count": 117},
      ...
    ]
  },
  "engagement": {
    "total_watch_time_hours": 1250,
    "avg_watch_time_per_user": 10.4,
    "completion_rate": 45.5,
    "avg_progress": 67.2,
    "daily_watch_time": [
      {"date": "2025-01-01", "hours": 42},
      {"date": "2025-01-02", "hours": 38},
      ...
    ]
  },
  "revenue": {
    "mrr": 3000.00,
    "total_all_time": 12500.00,
    "arpu": 25.00,
    "trend": [
      {"date": "2025-01-01", "mrr": 2875.00},
      {"date": "2025-01-02", "mrr": 2900.00},
      ...
    ]
  },
  "lessons": [
    {
      "lesson_id": 1,
      "title": "Stance and Footwork",
      "order": 1,
      "duration_minutes": 30,
      "unique_viewers": 118,
      "total_watch_time_hours": 58,
      "avg_watch_time_minutes": 29.5,
      "completion_rate": 95.2,
      "comment_count": 24,
      "dropout_rate": 4.8
    },
    ...
  ],
  "recent_activity": [
    {
      "user_id": 123,
      "username": "john_doe",
      "email": "john@example.com",
      "progress_percentage": 75.0,
      "total_watch_time_hours": 9.5,
      "subscription_status": "active",
      "subscription_start_date": "2024-12-01",
      "last_watched_at": "2025-01-10T14:32:00Z",
      "last_lesson_watched": "Roundhouse Kick Technique"
    },
    ...
  ]
}
```

#### 3. `GET /api/analytics/courses/{slug}/lessons/{lesson_id}/` (Future)
**Purpose:** Deep dive into individual lesson performance
**Status:** Phase 2 - Not required for MVP

---

## Backend Implementation

### Database Queries

#### Active Subscribers Count
```python
# For a specific course
active_subs = Subscription.objects.filter(
    course=course,
    status='active'
).count()
```

#### Active Subscribers Trend (30 days)
```python
# For each day in last 30 days, count active subscriptions
# Need to check: subscription.created_at <= day AND (cancelled_at > day OR status='active')
```

#### Watch Time per User
```python
# Sum watch time for all lessons in course, divide by active subscribers
total_watch_time = LessonProgress.objects.filter(
    lesson__course=course,
    user__subscriptions__course=course,
    user__subscriptions__status='active'
).aggregate(total=Sum('watch_time_seconds'))['total'] or 0

avg_per_user = total_watch_time / active_subs if active_subs > 0 else 0
```

#### Churn Rate
```python
# Subscribers who cancelled in last 30 days / active subs 30 days ago
cancelled_count = Subscription.objects.filter(
    course=course,
    status__in=['cancelled', 'past_due'],
    updated_at__gte=timezone.now() - timedelta(days=30)
).count()

churn_rate = (cancelled_count / active_subs_30d_ago) * 100 if active_subs_30d_ago > 0 else 0
```

### Performance Considerations
- **Caching:** Cache analytics data for 1 hour (low real-time requirement)
- **Background Jobs:** Pre-calculate daily trends via scheduled task
- **Indexing:** Add indexes on `(subscription.course, subscription.status)`, `(lessonprogress.lesson__course)`
- **Pagination:** Limit recent_activity to 50 rows, paginate if needed

---

## Frontend Implementation

### New Pages
1. **`/admin/analytics/courses/[slug]/page.tsx`** - Individual course detail view

### Modified Pages
1. **`/admin/analytics/page.tsx`** - Update table to show active subscribers, add click handlers

### New Components
1. **`CourseAnalyticsChart.tsx`** - Reusable chart component for trends
2. **`LessonPerformanceTable.tsx`** - Sortable lesson table
3. **`SubscriberActivityTable.tsx`** - Recent user activity table

### Libraries
- **recharts** - Already installed for charts
- **date-fns** - For date formatting and manipulation

---

## Success Metrics

### Must Have (MVP)
- ✅ Show active subscribers per course (not just enrollments)
- ✅ Display watch time per course
- ✅ Individual course detail page with all metrics
- ✅ Subscriber trend chart (30 days)
- ✅ Lesson performance breakdown

### Nice to Have (Phase 2)
- 📊 Revenue trend charts
- 📊 Cohort analysis (retention by signup month)
- 📊 Lesson-specific deep dive analytics
- 📊 Export analytics to CSV
- 📊 Email reports (weekly/monthly summaries)

---

## Implementation Plan

### Phase 1: Backend (Active Subscribers & Watch Time)
1. Update `AnalyticsService.get_course_analytics()` to include `active_subscribers` and `avg_watch_time_per_user`
2. Add endpoint: `GET /api/analytics/courses/{slug}/` with detailed metrics
3. Optimize queries with select_related/prefetch_related
4. Add caching layer

### Phase 2: Frontend (Course Detail Page)
1. Create `/admin/analytics/courses/[slug]/page.tsx`
2. Build UI sections: subscribers, engagement, revenue, lessons
3. Add charts for trends
4. Make course table clickable on main analytics page

### Phase 3: Polish & Optimization
1. Add loading states and error handling
2. Implement data caching on frontend
3. Add export functionality
4. Performance testing with large datasets

---

## Questions to Resolve
1. Should "active subscribers" include `trialing` status or only `active`?
2. Do we want to track historical MRR changes (requires new model/table)?
3. Should we show individual user data (privacy considerations)?
4. What's the retention period for analytics data (all-time vs last 90 days)?

---

## Timeline Estimate
- **Phase 1 (Backend):** 4-6 hours
- **Phase 2 (Frontend):** 6-8 hours
- **Phase 3 (Polish):** 2-3 hours
- **Total:** 12-17 hours

---

## Notes
- Current analytics table shows `enrollments` and `total_subscribers` (same value) - this is confusing
- Need to distinguish between "ever subscribed" vs "currently subscribed"
- Watch time should exclude cancelled users unless analyzing churn patterns
