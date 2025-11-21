# Claude Context: Dieselnoi Muay Thai Platform

## Project Overview
A subscription-based Muay Thai training platform featuring courses by legendary fighter Dieselnoi. The platform will eventually incorporate computer vision for real-time form correction during shadowboxing and conditioning exercises.

**Target Audience**: Serious martial arts practitioners seeking authentic "Golden Era" Muay Thai technique and structured training.

**Business Model**: Per-course subscriptions with revenue sharing for individual fighters.

---

## Tech Stack Decisions

### Backend: Django + Django REST Framework
**Why Django:**
- Excellent for structured data (courses, lessons, subscriptions)
- Built-in authentication system
- Strong ORM for PostgreSQL
- Easy Stripe webhook handling
- Robust admin interface for content management
- Python ecosystem enables future ML/analytics integration

### Frontend: Next.js (not plain React or Astro)
**Why Next.js:**
- This is an **interactive web application**, not a content site
- Authenticated user dashboards require dynamic, stateful UI
- Video player + progress tracking needs React state management
- Future computer vision integration requires client-side React components
- Better SEO than plain React (helpful for marketing pages)
- Built-in API routes if middleware is needed

**Why NOT Astro:**
- Astro is optimized for content-heavy, mostly-static sites
- Our app requires extensive interactivity and user state
- Video streaming and CV features need full React capabilities

### Database: PostgreSQL
- Reliable, mature, handles complex relationships
- Good for user data, subscriptions, and course structure
- **Note**: Currently using SQLite in development; switch to PostgreSQL before production

### Video Delivery: Mux
**Why Mux:**
- Built specifically for video platforms
- Direct Upload API for admin video uploads
- Automatic adaptive bitrate streaming
- Excellent analytics (watch time, engagement, drop-off)
- Simple API, great DX
- Cost: ~$0.005 per minute streamed

**Alternative considered: Bunny Stream** (60% cheaper but less polished)

---

## Architecture Pattern

### Separated Frontend-Backend (Hybrid Architecture)
- **Backend (Django)**: Handles auth, subscriptions, database, business logic
- **Frontend (Next.js)**: Handles UI, video display, client-side processing
- **Communication**: RESTful API with CORS configured
- **Why this pattern**: Clean separation allows computer vision to run client-side (in browser) using MediaPipe/TensorFlow.js for better performance and privacy

---

## Key Models & Relationships

### User (Custom Django User)
- Extends AbstractUser
- Has `stripe_customer_id` for Stripe integration
- Has many Subscriptions (ForeignKey relationship)

### Course
- Represents a full Muay Thai training course
- Has difficulty levels: beginner, intermediate, advanced
- Has monthly subscription price (per-course pricing model)
- Auto-generates slug from title
- Has many Lessons (ForeignKey relationship)

### Lesson
- Belongs to one Course
- Has `mux_asset_id` and `mux_playback_id` for video streaming
- Has `order` field for sequencing
- Has `is_free_preview` boolean (allows non-subscribers to view)
- Unique constraint on (course, order)
- Has `duration_minutes` synced from Mux

### Subscription
- **ForeignKey to User** (user can have multiple subscriptions)
- **ForeignKey to Course** (subscription is course-specific)
- **Unique constraint**: (user, course) - one subscription per course per user
- Status: active, past_due, cancelled, trialing
- Has `stripe_subscription_id` for Stripe webhook handling
- Has `is_active` property for quick checks

### LessonProgress
- Tracks user progress through lessons
- Fields: is_completed, completed_at, last_watched_at, watch_time_seconds
- **Unique constraint**: (user, lesson)
- Auto-updated when user watches 90%+ or completes video

### Comment
- Comments on lessons with threaded reply support
- Fields: user, lesson, content, parent (for replies), timestamp_seconds, is_edited
- Supports video timestamp references
- Indexed on (lesson, created_at) and (parent)

---

## Access Control Logic

### Video URL Protection
- Implemented in `LessonSerializer.to_representation()`
- Returns `mux_playback_id: null` if:
  - User doesn't have active subscription to **that specific course** AND
  - Lesson is not a free preview
- This prevents unauthorized users from accessing video URLs

### API Permissions
- All endpoints require authentication (`IsAuthenticated`)
- Custom permission `IsSubscriberOrReadOnly`:
  - Free preview lessons: accessible to all authenticated users
  - Full lessons: only accessible to users with active subscription **to that course**
  - Read-only for all (no POST/PUT/DELETE via API)

### Per-Course Subscription Model
- Users can subscribe to multiple courses independently
- Each subscription is tied to a specific course
- Access control checks course-specific subscription, not global subscription
- Enables revenue sharing with individual fighters

---

## Important Implementation Notes

### Django Settings
- **CORS**: Configured for `http://localhost:3000` (Next.js dev server)
- **AUTH_USER_MODEL**: Set to `'core.User'` (custom user model)
- **Database**: Currently SQLite (dev), switch to PostgreSQL for production
- **REST_FRAMEWORK**: SessionAuthentication enabled, IsAuthenticated by default
- **Stripe**: API keys loaded via python-dotenv from `.env`
- **Mux**: API keys loaded via python-dotenv from `.env`

### Next.js Configuration
- **API URL**: Set via `NEXT_PUBLIC_API_URL` environment variable
- **withCredentials**: Set to `true` in axios for session cookies
- **App Router**: Using Next.js 14 app router (not pages router)
- **Tailwind**: Configured with custom primary color (red theme for Muay Thai)

### Video Handling
- Mux Direct Upload for admin video uploads
- Stores `mux_asset_id` and `mux_playback_id` in Lesson model
- Webhook integration syncs video status and duration
- Frontend uses @mux/mux-player-react for playback
- **Note**: Mux Player has built-in keyboard shortcuts (space, arrows, etc.) - don't suggest adding custom ones
- **Security**: Video access controlled via subscription check, not signed URLs (TODO for production)

### Progress Tracking
- Automatic: Marks lessons complete at 90% watched or video end
- Uses React refs to prevent duplicate API calls
- Server-side calculation of completion percentages
- Optimistic UI updates for instant feedback

### Comments System
- Threaded replies (2 levels shown in UI: top-level + direct replies)
- Video timestamps stored as seconds
- Edit tracking with is_edited boolean
- IsOwnerOrReadOnly permission (can only edit/delete own comments)

---

## Critical Security Considerations

### Video Protection
- **Current**: Subscription check controls access to playback IDs
- **TODO for Production**: Implement Mux signed URLs with expiration tokens
- **Consider**: Watermarking for piracy prevention
- **Implement**: Rate limiting on video endpoints

### Subscription Verification
- Webhook verification is critical (use `STRIPE_WEBHOOK_SECRET`)
- Always verify subscription status server-side before granting access
- Handle subscription state changes (cancelled, past_due, etc.)
- Implement grace periods for payment failures

### User Data
- Store minimal PII
- Never log sensitive data (credit cards, passwords)
- Implement proper session management
- Use HTTPS in production

---

## Development Workflow

### Backend Development
```bash
# Activate venv
source backend/venv/bin/activate

# Make migrations after model changes
python manage.py makemigrations
python manage.py migrate

# Create test data via admin
python manage.py createsuperuser
python manage.py runserver
# Access admin at http://localhost:8000/admin/
```

### Frontend Development
```bash
cd frontend
npm run dev
# Access at http://localhost:3000
```

### Testing Stripe Webhooks
```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook/
```

### Testing Mux Webhooks
Configure webhook URL in Mux dashboard: `http://localhost:8000/api/mux/webhook/`

### Syncing Video Durations
```bash
python manage.py sync_video_durations
```

---

## Common Issues & Solutions

### CORS Errors
- Ensure `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check `CORS_ALLOW_CREDENTIALS = True` is set
- Verify `withCredentials: true` in axios config

### Video Playback ID Returns Null
- Expected behavior for non-subscribers on non-preview lessons
- Create test user with active subscription **to that specific course** to test full access
- Mark some lessons as `is_free_preview=True` for testing

### Database Connection Errors
- Ensure PostgreSQL is running: `brew services start postgresql` (Mac)
- Check database exists: `psql -l | grep dieselnoi`
- Verify credentials in `.env` file

### Stripe Webhook Not Firing
- Check Stripe CLI is running: `stripe listen --forward-to localhost:8000/api/stripe/webhook/`
- Verify `STRIPE_WEBHOOK_SECRET` in `.env` matches CLI output
- Check Django logs for webhook errors

---

## File Structure Reference

### Backend Core Files
- `backend/core/models.py` - Database models (User, Course, Lesson, Subscription, LessonProgress, Comment)
- `backend/core/serializers.py` - DRF serializers with access control logic
- `backend/core/views.py` - API ViewSets and webhook handlers
- `backend/core/admin.py` - Django admin configuration with Mux Direct Upload
- `backend/core/permissions.py` - Custom permissions (IsSubscriberOrReadOnly)
- `backend/backend/settings.py` - Django settings (CORS, DB, DRF, Stripe, Mux)

### Frontend Key Files
- `frontend/src/app/page.tsx` - Homepage with course listings
- `frontend/src/app/courses/[slug]/page.tsx` - Course detail page
- `frontend/src/app/courses/[slug]/lessons/[id]/page.tsx` - Lesson detail page with video player
- `frontend/src/app/dashboard/page.tsx` - User dashboard with subscriptions
- `frontend/src/components/CourseList.tsx` - Course display component
- `frontend/src/components/Comments.tsx` - Comments component with threaded replies
- `frontend/src/lib/api.ts` - API client with TypeScript types
- `frontend/src/contexts/AuthContext.tsx` - Authentication context provider

### Management Commands
- `backend/core/management/commands/sync_video_durations.py` - Syncs video durations from Mux

---

## Design Decisions Log

### Why Separated Backend/Frontend?
- Computer vision needs to run in browser (client-side)
- Easier to scale frontend and backend independently
- Better separation of concerns
- Allows using best tool for each job

### Why Session Auth Instead of JWT?
- Simpler for MVP
- Built into Django
- Works well with CORS and credentials
- Can switch to JWT later if needed for mobile apps

### Why ReadOnly ViewSets?
- Content management through Django admin (simpler)
- API is only for consumption, not creation
- Reduces attack surface
- Admin provides rich interface for course management

### Why Per-Course Subscriptions (Not All-Access)?
- Enables revenue sharing with individual golden era fighters
- Each fighter receives percentage of their specific course subscriptions
- More flexible pricing (courses can have different prices)
- Users can choose which courses they want

### Why ForeignKey Instead of OneToOne for Subscriptions?
- Users can subscribe to multiple courses
- Unique constraint on (user, course) prevents duplicates
- Queries: `user.subscriptions.filter(course=course, status='active')`
- More flexible than OneToOne model

---

## Notes for Future Claude Sessions

1. **Don't change the separation architecture** - Computer vision requires client-side processing
2. **Video URLs must stay protected** - Never bypass the serializer access control
3. **Subscription model is per-course** - Always check course-specific subscription, not global
4. **Admin is the content management interface** - Don't build separate CMS unless requested
5. **Progress tracking is automatic** - Don't manually mark lessons complete
6. **No user-generated content** - All content is admin-created (Dieselnoi's courses)
7. **Session logs are in SESSIONS.md** - Don't add session logs to CLAUDE.md
8. **Roadmap is in TODO.md** - Don't add TODO items to CLAUDE.md

---

## API Endpoints Reference

### Authentication
- POST `/api/register/` - User registration
- POST `/api/login/` - User login
- POST `/api/logout/` - User logout
- GET `/api/csrf/` - Get CSRF token
- GET `/api/user/` - Get current user info

### Courses & Lessons
- GET `/api/courses/` - List all published courses
- GET `/api/courses/{slug}/` - Get course detail
- GET `/api/lessons/{id}/` - Get lesson detail

### Subscriptions
- GET `/api/subscriptions/me/` - Get current user's subscriptions (array)
- POST `/api/create-checkout-session/` - Create Stripe checkout session
- POST `/api/stripe/webhook/` - Stripe webhook handler (internal)

### Progress Tracking
- POST `/api/progress/mark_complete/` - Mark lesson as complete
- POST `/api/progress/update_watch_time/` - Update watch time
- GET `/api/progress/course_progress/` - Get summary of all courses
- GET `/api/progress/course/{slug}/` - Get detailed progress for specific course

### Comments
- GET `/api/comments/?lesson_id={id}` - Get comments for a lesson
- POST `/api/comments/` - Create a comment
- PUT `/api/comments/{id}/` - Update a comment (own only)
- DELETE `/api/comments/{id}/` - Delete a comment (own only)

### Admin Video Upload
- POST `/api/admin/upload-video/` - Create Mux Direct Upload URL (admin only)
- POST `/api/mux/webhook/` - Mux webhook handler (internal)

---

## Product Vision

**Core Differentiator**: Computer vision-powered form correction during training (Phase 3)
**Business Model**: Per-course subscriptions with revenue sharing for fighters
**Content Strategy**: Expert-led, structured curriculum (not user-generated)
**Technical Edge**: Client-side ML for real-time feedback without server load

---

## Resources

- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/overview
- **Mux Docs**: https://docs.mux.com/
- **Mux Direct Upload**: https://docs.mux.com/guides/video/upload-files-directly
- **MediaPipe Pose**: https://google.github.io/mediapipe/solutions/pose
- **Next.js App Router**: https://nextjs.org/docs/app
- **DRF Docs**: https://www.django-rest-framework.org/
- **Session Logs**: See `SESSIONS.md` for development history
- **Roadmap & TODO**: See `TODO.md` for current status and next steps
