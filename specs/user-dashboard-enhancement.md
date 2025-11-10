# Feature: User Dashboard Enhancement

## Overview

Build a comprehensive user dashboard that serves as the central hub for subscribers. The dashboard will display all active subscriptions, course progress, continue watching functionality, and provide quick access to billing management via Stripe Customer Portal.

**Why**: Currently users have no central place to view their subscriptions and progress. This creates friction and makes the platform feel incomplete.

## User Stories

- As a subscribed user, I want to see all my active subscriptions in one place so I can quickly access my courses
- As a user, I want to see my progress for each course so I know how far I've come
- As a user, I want to continue watching from where I left off so I don't waste time finding my place
- As a user, I want to manage my billing and subscriptions so I can update payment methods or cancel if needed
- As a new visitor, I want clear prompts to explore available courses if I'm not subscribed to anything

## User Flows

### Subscribed User
1. User navigates to `/dashboard`
2. Dashboard loads with:
   - "Continue Watching" section (most recent incomplete lessons)
   - Active subscriptions grid (course cards with progress rings)
   - Quick stats (total courses, total lessons completed, total watch time)
3. User clicks "Continue Watching" → goes to that lesson page
4. User clicks course card → goes to course detail page
5. User clicks "Manage Billing" → redirects to Stripe Customer Portal

### Non-Subscribed User
1. User navigates to `/dashboard`
2. Dashboard shows:
   - Empty state message: "You don't have any active subscriptions yet"
   - CTA button: "Browse Courses"
3. User clicks "Browse Courses" → goes to homepage

## API Changes

### New Endpoints

#### GET `/api/dashboard/summary/`
Returns comprehensive dashboard data for current user.

**Response:**
```json
{
  "active_subscriptions": [
    {
      "id": 1,
      "course": {
        "id": 1,
        "title": "Dieselnoi's Knee Techniques",
        "slug": "dieselnoi-knee-techniques",
        "thumbnail_url": "...",
        "difficulty_level": "intermediate",
        "total_lessons": 12
      },
      "progress": {
        "completed_lessons": 5,
        "total_lessons": 12,
        "percentage": 41.67,
        "last_watched_lesson": {
          "id": 6,
          "title": "The Rising Knee",
          "order": 6
        },
        "last_watched_at": "2025-11-07T14:30:00Z"
      },
      "subscription": {
        "status": "active",
        "current_period_end": "2025-12-07T00:00:00Z",
        "cancel_at_period_end": false
      }
    }
  ],
  "continue_watching": [
    {
      "lesson_id": 6,
      "lesson_title": "The Rising Knee",
      "course_title": "Dieselnoi's Knee Techniques",
      "course_slug": "dieselnoi-knee-techniques",
      "thumbnail_url": "...",
      "progress_seconds": 145,
      "duration_seconds": 420,
      "last_watched_at": "2025-11-07T14:30:00Z"
    }
  ],
  "stats": {
    "total_courses": 1,
    "total_lessons_completed": 5,
    "total_watch_time_minutes": 127
  }
}
```

**Authentication**: Required (IsAuthenticated)

**Implementation Notes:**
- Optimize with `select_related` and `prefetch_related` to avoid N+1 queries
- Continue watching should only include lessons with >30s watch time but <90% completion
- Sort continue watching by `last_watched_at` DESC, limit to 5 most recent

#### POST `/api/stripe/create-portal-session/`
Creates a Stripe Customer Portal session and returns the URL.

**Request:**
```json
{
  "return_url": "https://yourdomain.com/dashboard"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/..."
}
```

**Authentication**: Required (IsAuthenticated)

**Error Cases:**
- User has no stripe_customer_id → Return 400 with message "No billing account found"
- Stripe API error → Return 503 with message "Billing portal unavailable"

## Database Changes

**No schema changes required** - all data exists in current models:
- Subscription model (subscriptions)
- LessonProgress model (watch time, completion)
- Course/Lesson models (content data)

**Potential optimization:**
- Add database index on `LessonProgress.last_watched_at` for faster queries

## Frontend Changes

### New Components

#### `src/app/dashboard/page.tsx`
Main dashboard page component.

**States:**
- Loading: Show skeleton loaders
- Empty: Show empty state with CTA
- Populated: Show full dashboard

#### `src/components/dashboard/SubscriptionCard.tsx`
Course card with progress ring visualization.

**Props:**
- `subscription` object (from API)
- Shows: thumbnail, title, progress ring, lesson count

#### `src/components/dashboard/ContinueWatchingRow.tsx`
Horizontal scrollable row of lesson thumbnails.

**Props:**
- `lessons` array (from API)
- Shows: thumbnail with play icon overlay, time remaining

#### `src/components/dashboard/DashboardStats.tsx`
Stats cards showing totals.

**Props:**
- `stats` object (from API)

### Modified Components

**None** - this is a new feature in its own route

### Styling

- Use existing Tailwind theme (red primary color)
- Progress rings: Use gradient from red-600 to red-400
- Cards: Consistent with existing course cards
- Empty state: Center-aligned with gray text and prominent CTA button

## Integration Points

### Stripe Customer Portal

**Setup Required:**
1. Configure portal in Stripe Dashboard
2. Set allowed features: Update payment method, Cancel subscription, View invoices
3. Set branding (logo, colors)

**Backend Implementation:**
```python
import stripe

def create_portal_session(user, return_url):
    if not user.stripe_customer_id:
        raise ValueError("No Stripe customer ID")

    session = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=return_url
    )
    return session.url
```

**Frontend Implementation:**
```typescript
const handleManageBilling = async () => {
  const { data } = await api.post('/api/stripe/create-portal-session/', {
    return_url: window.location.origin + '/dashboard'
  })
  window.location.href = data.url
}
```

### Continue Watching Logic

**Backend Query:**
```python
LessonProgress.objects.filter(
    user=request.user,
    watch_time_seconds__gte=30,  # Watched at least 30 seconds
    is_completed=False           # Not completed
).select_related('lesson__course').order_by('-last_watched_at')[:5]
```

## Security Considerations

1. **Portal Session Security**
   - Always verify `stripe_customer_id` belongs to authenticated user
   - Never accept customer_id from client
   - Use HTTPS for return URLs

2. **Data Access Control**
   - Dashboard endpoint must only return data for authenticated user
   - No query parameters for user_id (always use request.user)

3. **Rate Limiting**
   - Dashboard endpoint: 30 requests/minute per user
   - Portal session creation: 10 requests/minute per user (prevent abuse)

## Performance Considerations

1. **Database Optimization**
   - Use `select_related('course')` for subscriptions
   - Use `prefetch_related('lessons')` for course lesson counts
   - Consider caching dashboard data for 60 seconds

2. **Frontend Optimization**
   - Lazy load course thumbnails (use Next.js Image component)
   - Implement skeleton loaders for perceived performance
   - Consider using React Query for automatic background refetching

3. **API Response Size**
   - Limit continue watching to 5 items
   - Limit active subscriptions to 20 items (pagination if user has >20)
   - Only include necessary fields in nested objects

## Testing Checklist

### Backend Tests
- [ ] Dashboard endpoint returns correct data for user with subscriptions
- [ ] Dashboard endpoint returns empty data for user without subscriptions
- [ ] Dashboard endpoint requires authentication (401 if not logged in)
- [ ] Portal session creation returns valid Stripe URL
- [ ] Portal session creation fails gracefully if no stripe_customer_id
- [ ] Continue watching excludes completed lessons
- [ ] Continue watching excludes lessons with <30s watch time

### Frontend Tests
- [ ] Dashboard renders loading state initially
- [ ] Dashboard renders empty state for non-subscribed users
- [ ] Dashboard renders subscription cards with progress rings
- [ ] Progress ring calculates percentage correctly
- [ ] Continue watching row scrolls horizontally on mobile
- [ ] "Manage Billing" button redirects to Stripe portal
- [ ] Error handling displays user-friendly messages

### Integration Tests
- [ ] Complete flow: Dashboard → Stripe Portal → Cancel subscription → Return to dashboard (shows cancelled status)
- [ ] Complete flow: Dashboard → Continue watching → Watch lesson → Return to dashboard (updates progress)
- [ ] Mobile responsive on iOS Safari and Chrome
- [ ] Works with multiple active subscriptions

## Design Assets Needed

- Empty state illustration (or use hero icon)
- Progress ring animation (CSS or SVG)
- "Continue watching" thumbnail overlays

## Success Metrics

- **User Engagement**: 70%+ of users visit dashboard within first week
- **Session Duration**: Average 20+ seconds on dashboard (indicates engagement)
- **Portal Usage**: 10%+ of users access Stripe portal in first month
- **Continue Watching CTR**: 40%+ click-through rate on continue watching items

## Open Questions

1. Should we show cancelled subscriptions with a "Resubscribe" button?
2. Should continue watching include free preview lessons from non-subscribed courses?
3. Should we send weekly email with dashboard summary (progress report)?
4. Should progress rings animate on page load?
5. How should we handle users with 20+ subscriptions (pagination vs. "View All")?

## Implementation Order

1. **Backend**: Create dashboard summary endpoint with tests (1-2 hours)
2. **Backend**: Create portal session endpoint (30 min)
3. **Backend**: Configure Stripe Customer Portal in dashboard (15 min)
4. **Frontend**: Build dashboard page with loading/empty states (1 hour)
5. **Frontend**: Build subscription card component with progress rings (1-2 hours)
6. **Frontend**: Build continue watching component (1 hour)
7. **Frontend**: Build stats cards (30 min)
8. **Frontend**: Integrate portal session flow (30 min)
9. **Testing**: Manual QA on all flows (1 hour)
10. **Polish**: Animations, mobile responsive tweaks (1 hour)

**Total Estimated Time**: 8-10 hours

## References

- Stripe Customer Portal Docs: https://stripe.com/docs/billing/subscriptions/integrating-customer-portal
- TODO.md: Line 41-53 (User Dashboard Enhancement section)
- CLAUDE.md: Architecture Pattern section (API-based communication)

---

**Status**: Draft
**Author**: Claude
**Created**: 2025-11-07
**Last Updated**: 2025-11-07
