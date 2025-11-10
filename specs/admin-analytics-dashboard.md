# Admin Analytics Dashboard - Specification

## Overview
Build a comprehensive analytics dashboard for admin users to track business metrics, user engagement, and course performance.

## Goals
1. Provide actionable insights for business decisions
2. Track course and user engagement metrics
3. Monitor revenue and subscription health
4. Identify popular content and areas for improvement

## User Stories

**As an admin**, I want to:
- See an overview of key business metrics at a glance
- Track course enrollment and completion rates
- Understand user engagement with video content
- Monitor subscription health and revenue
- Identify which courses are performing best
- See which lessons have the highest drop-off rates

## Technical Approach

### Backend (Django)
**New API Endpoints:**

1. `GET /api/admin/analytics/overview/` - Dashboard overview stats
2. `GET /api/admin/analytics/courses/` - Per-course analytics
3. `GET /api/admin/analytics/courses/{slug}/` - Single course detailed analytics
4. `GET /api/admin/analytics/users/` - User growth and retention metrics
5. `GET /api/admin/analytics/engagement/` - Content engagement metrics

**Permissions:** `IsAdminUser` - only staff users can access

### Frontend (Next.js)
**New Page:** `/admin/analytics`

**Components:**
- `StatCard` - Display individual metrics with icon and trend
- `CourseAnalyticsTable` - Sortable table of course performance
- `EngagementChart` - Line/bar charts for trends
- `RecentActivityFeed` - Recent signups, subscriptions, completions

---

## Dashboard Layout

### 1. Overview Section (Top of Page)

**Key Metrics (4-card grid):**

```
┌─────────────────────┬─────────────────────┬─────────────────────┬─────────────────────┐
│  Total Users        │  Active Subs        │  Total Courses      │  Completion Rate    │
│  [number]           │  [number]           │  [number]           │  [percentage]       │
│  +X% from last week │  +X% from last week │  X published        │  Avg across courses │
└─────────────────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

**Additional Overview Metrics:**
- Total watch time (hours)
- Comments posted (last 30 days)
- New users (last 7/30 days)
- Revenue estimate (active subs × price)

### 2. Course Performance Table

**Columns:**
- Course Title
- Enrollments (active subscriptions)
- Completion Rate (% of students who finished)
- Avg Progress (% across all students)
- Total Watch Time
- Comment Count
- Revenue (price × active subs)
- Actions (View Details)

**Features:**
- Sortable by any column
- Click course row to see detailed analytics
- Color-coded completion rates (red < 30%, yellow < 70%, green >= 70%)

### 3. Engagement Insights

**Charts:**
- User signups over time (last 30 days) - Line chart
- Active subscriptions over time - Line chart
- Course enrollment distribution - Bar chart

**Top Lists:**
- Most watched lessons (by total watch time)
- Most commented lessons
- Highest completion rate lessons
- Lessons with highest drop-off (low completion)

### 4. Recent Activity Feed

**Show last 20 activities:**
- User signed up
- New subscription started
- Course completed
- High-value comment posted (> 100 chars)

---

## Data Models & Calculations

### Overview Stats

```python
{
  "total_users": User.objects.count(),
  "active_subscriptions": Subscription.objects.filter(status__in=['active', 'trialing']).count(),
  "total_courses": Course.objects.filter(is_published=True).count(),
  "avg_completion_rate": # Avg % of lessons completed across all enrolled students
  "total_watch_time_hours": # Sum of all watch_time_seconds / 3600
  "comments_last_30_days": Comment.objects.filter(created_at__gte=30_days_ago).count(),
  "new_users_last_7_days": User.objects.filter(created_at__gte=7_days_ago).count(),
  "estimated_mrr": # Sum of (course.price * active_subs_for_course)
}
```

### Per-Course Analytics

```python
{
  "course_slug": "fundamental-techniques",
  "title": "Fundamental Techniques",
  "enrollments": 45,  # Active subscriptions
  "total_subscribers": 62,  # All-time subscribers (including cancelled)
  "completion_rate": 34.5,  # % who completed all lessons
  "avg_progress": 67.2,  # Average % of lessons completed
  "total_watch_time_hours": 234.5,
  "avg_watch_time_per_user": 5.2,  # hours
  "comment_count": 128,
  "lesson_count": 12,
  "monthly_revenue": 1349.55,  # price * active_subs
  "lesson_analytics": [
    {
      "lesson_id": 1,
      "title": "Intro to Stance",
      "watch_count": 58,  # Unique users who watched
      "completion_rate": 94.5,  # % who finished video
      "avg_watch_percentage": 87.3,
      "total_watch_time_hours": 12.3,
      "comment_count": 8,
      "drop_off_rate": 5.5  # % who didn't finish
    },
    # ... more lessons
  ]
}
```

### User Growth Metrics

```python
{
  "daily_signups": [
    {"date": "2025-11-01", "count": 5},
    {"date": "2025-11-02", "count": 8},
    # ... last 30 days
  ],
  "active_users_trend": [
    {"date": "2025-11-01", "count": 45},
    # ... last 30 days
  ],
  "retention_rate": 78.5,  # % of users still subscribed after 30 days
  "churn_rate": 21.5  # % of subscriptions cancelled
}
```

### Engagement Metrics

```python
{
  "top_lessons_by_watch_time": [
    {
      "lesson_id": 5,
      "course_title": "Advanced Clinch",
      "lesson_title": "Knee Techniques",
      "total_watch_time_hours": 45.2,
      "unique_watchers": 38
    },
    # ... top 10
  ],
  "top_lessons_by_comments": [
    {
      "lesson_id": 3,
      "course_title": "Fundamental Techniques",
      "lesson_title": "Roundhouse Kick Form",
      "comment_count": 24,
      "unique_commenters": 18
    },
    # ... top 10
  ],
  "highest_completion_lessons": [
    # ... lessons with > 90% completion rate
  ],
  "highest_dropout_lessons": [
    # ... lessons with < 50% completion rate
  ]
}
```

---

## UI Design

### Color Scheme
- **Success/Good**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Danger/Bad**: Red (#ef4444)
- **Neutral**: Gray (#6b7280)
- **Primary**: Brand red (#dc2626)

### Stat Cards

```
┌─────────────────────────────────┐
│ 👥 Total Users                  │
│                                 │
│     1,234                       │
│     ↗ +12% from last week       │
└─────────────────────────────────┘
```

### Data Table

```
╔════════════════════╤═══════╤═════════════╤══════════╤═════════╗
║ Course             │ Enrol │ Completion  │ Progress │ Revenue ║
╠════════════════════╪═══════╪═════════════╪══════════╪═════════╣
║ Fundamentals       │  45   │ 🟢 78.5%   │   84.2%  │ $1,349  ║
║ Advanced Clinch    │  32   │ 🟡 54.3%   │   67.8%  │ $1,599  ║
║ Golden Era Style   │  18   │ 🔴 32.1%   │   45.6%  │ $1,350  ║
╚════════════════════╧═══════╧═════════════╧══════════╧═════════╝
```

---

## Implementation Plan

### Phase 1: Backend (2-3 hours)
1. Create analytics service module (`backend/core/analytics.py`)
2. Implement calculation functions for each metric type
3. Create API viewsets with proper permissions
4. Add caching for expensive queries (Redis or Django cache)
5. Write tests for analytics calculations

### Phase 2: Frontend (2-3 hours)
1. Create analytics page at `/admin/analytics`
2. Build StatCard component with icon and trend indicator
3. Implement data fetching with loading states
4. Build sortable course performance table
5. Add charts using Recharts or Chart.js
6. Implement recent activity feed

### Phase 3: Polish (1 hour)
1. Add dark mode support
2. Mobile responsive design
3. Loading skeletons
4. Error handling
5. Export to CSV functionality (bonus)

**Total Estimate:** 5-7 hours

---

## API Response Examples

### GET /api/admin/analytics/overview/

```json
{
  "total_users": 1234,
  "active_subscriptions": 456,
  "total_courses": 8,
  "published_courses": 6,
  "avg_completion_rate": 64.5,
  "total_watch_time_hours": 2345.7,
  "comments_last_30_days": 387,
  "new_users_last_7_days": 42,
  "new_users_last_30_days": 156,
  "estimated_mrr": 18234.50,
  "growth_metrics": {
    "users_growth_7d": 12.3,
    "subs_growth_7d": 8.7
  }
}
```

### GET /api/admin/analytics/courses/

```json
{
  "courses": [
    {
      "course_slug": "fundamental-techniques",
      "title": "Fundamental Techniques",
      "difficulty": "beginner",
      "price": "29.99",
      "enrollments": 45,
      "total_subscribers": 62,
      "completion_rate": 78.5,
      "avg_progress": 84.2,
      "total_watch_time_hours": 234.5,
      "comment_count": 128,
      "lesson_count": 12,
      "monthly_revenue": 1349.55
    },
    // ... more courses
  ]
}
```

---

## Future Enhancements

1. **Export functionality** - Download analytics as CSV/PDF
2. **Date range filters** - View metrics for custom time periods
3. **Revenue forecasting** - Predict MRR based on trends
4. **Cohort analysis** - Track user cohorts over time
5. **A/B testing metrics** - If we implement feature flags
6. **Email reports** - Scheduled analytics summaries
7. **Alerts** - Notify when metrics cross thresholds
8. **Funnel analysis** - Signup → Subscribe → Complete conversion

---

## Security & Performance

**Security:**
- Restrict access to `IsAdminUser` permission
- No sensitive user PII exposed (use aggregated data only)
- Rate limit analytics endpoints

**Performance:**
- Cache expensive calculations (30-minute TTL)
- Paginate large result sets
- Index database queries on frequently filtered fields
- Consider read replicas for analytics queries in production

**Monitoring:**
- Log slow queries (> 1 second)
- Track analytics endpoint response times
- Alert on high database load from analytics

---

## Success Metrics

The analytics dashboard will be successful if:
1. Admins use it at least weekly to make decisions
2. Query response times < 2 seconds for overview
3. Insights lead to actionable improvements (e.g., fixing high drop-off lessons)
4. Revenue tracking is accurate within 1%
5. No performance impact on user-facing features

---

## Notes

- This is v1 - start simple, iterate based on actual usage
- Focus on actionable metrics, not vanity metrics
- Consider adding "Insights" section with automated recommendations
- May want to add coach/fighter-specific dashboards later (for revenue sharing)

