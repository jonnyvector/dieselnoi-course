# Claude Context: Dieselnoi Muay Thai Platform

## Project Overview
A subscription-based Muay Thai training platform featuring courses by legendary fighter Dieselnoi. The platform will eventually incorporate computer vision for real-time form correction during shadowboxing and conditioning exercises.

**Target Audience**: Serious martial arts practitioners seeking authentic "Golden Era" Muay Thai technique and structured training.

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

### Video Delivery: Mux (recommended) or Bunny Stream
**Why Mux:**
- Built specifically for video platforms
- Signed URLs for security (prevents unauthorized sharing)
- Automatic adaptive bitrate streaming
- Excellent analytics (watch time, engagement, drop-off)
- Simple API, great DX
- Cost: ~$0.005 per minute streamed

**Alternative: Bunny Stream**
- 60% cheaper than Mux
- Still has signed URLs and good quality
- Less polished but solid for MVP

**Avoid:**
- Self-hosting (bandwidth costs, complexity)
- Direct S3/CloudFront (too complex for MVP)
- Vimeo (expensive at scale)

## Architecture Pattern

### Separated Frontend-Backend (Hybrid Architecture)
- **Backend (Django)**: Handles auth, subscriptions, database, business logic
- **Frontend (Next.js)**: Handles UI, video display, client-side processing
- **Communication**: RESTful API with CORS configured
- **Why this pattern**: Clean separation allows computer vision to run client-side (in browser) using MediaPipe/TensorFlow.js for better performance and privacy

## Key Models & Relationships

### User (Custom Django User)
- Extends AbstractUser
- Has `stripe_customer_id` for Stripe integration
- OneToOne relationship with Subscription

### Course
- Represents a full Muay Thai training course
- Has difficulty levels: beginner, intermediate, advanced
- Has monthly subscription price
- Auto-generates slug from title
- Has many Lessons (ForeignKey relationship)

### Lesson
- Belongs to one Course
- Has `video_url` (CharField - will store Mux/Bunny URL)
- Has `order` field for sequencing
- Has `is_free_preview` boolean (allows non-subscribers to view)
- Unique constraint on (course, order)

### Subscription
- OneToOne with User
- Status: active, past_due, cancelled, trialing
- Has `stripe_subscription_id` for Stripe webhook handling
- Has `is_active` property for quick checks

## Access Control Logic

### Video URL Protection
- Implemented in `LessonSerializer.to_representation()`
- Returns `video_url: null` if:
  - User doesn't have active subscription AND
  - Lesson is not a free preview
- This prevents unauthorized users from accessing video URLs

### API Permissions
- All endpoints require authentication (`IsAuthenticated`)
- Custom permission `IsSubscriberOrReadOnly`:
  - Free preview lessons: accessible to all authenticated users
  - Full lessons: only accessible to users with active subscriptions
  - Read-only for all (no POST/PUT/DELETE)

## Important Implementation Notes

### Django Settings
- **CORS**: Configured for `http://localhost:3000` (Next.js dev server)
- **AUTH_USER_MODEL**: Set to `'core.User'` (custom user model)
- **Database**: PostgreSQL (not SQLite) - ensures production readiness
- **REST_FRAMEWORK**: SessionAuthentication enabled, IsAuthenticated by default

### Next.js Configuration
- **API URL**: Set via `NEXT_PUBLIC_API_URL` environment variable
- **withCredentials**: Set to `true` in axios for session cookies
- **App Router**: Using Next.js 14 app router (not pages router)
- **Tailwind**: Configured with custom primary color (red theme for Muay Thai)

### Video URLs
- Currently stored as CharField in Lesson model
- When integrating Mux/Bunny:
  - Store playback IDs, not direct URLs
  - Generate signed URLs server-side for security
  - Implement time-limited access tokens
  - Never expose raw video URLs to frontend

## Future Development Phases

### Phase 1 (Current MVP Foundation)
- ✅ Django models and API
- ✅ Next.js structure
- ✅ Course listing component
- 🔲 Authentication (JWT or session-based)
- 🔲 Login/signup pages
- 🔲 Protected routes

### Phase 2 (Video & Payments)
- 🔲 Mux/Bunny integration
- 🔲 Stripe checkout flow
- 🔲 Stripe webhook handlers
- 🔲 Video player component
- 🔲 Course progress tracking

### Phase 3 (Computer Vision)
- 🔲 MediaPipe integration (client-side)
- 🔲 Pose detection during shadowboxing
- 🔲 Form analysis and feedback
- 🔲 Real-time correction suggestions
- 🔲 Progress visualization

## Critical Security Considerations

### Video Protection
- **Never** serve videos directly from Django
- **Always** use signed URLs with expiration
- **Consider** watermarking for piracy prevention
- **Implement** rate limiting on video endpoints

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

### Testing API Endpoints
- Use Django admin to create Courses and Lessons
- Use browser or Postman to test API endpoints
- Ensure authentication is working before testing protected endpoints

## Common Issues & Solutions

### CORS Errors
- Ensure `CORS_ALLOWED_ORIGINS` includes frontend URL
- Check `CORS_ALLOW_CREDENTIALS = True` is set
- Verify `withCredentials: true` in axios config

### Video URL Returns Null
- Expected behavior for non-subscribers on non-preview lessons
- Create test user with active subscription to test full access
- Mark some lessons as `is_free_preview=True` for testing

### Database Connection Errors
- Ensure PostgreSQL is running: `brew services start postgresql` (Mac)
- Check database exists: `psql -l | grep dieselnoi`
- Verify credentials in `.env` file

## File Structure Reference

### Backend Core Files
- `backend/core/models.py` - Database models
- `backend/core/serializers.py` - DRF serializers with access control
- `backend/core/views.py` - API ViewSets
- `backend/core/admin.py` - Django admin configuration
- `backend/backend/settings.py` - Django settings (CORS, DB, DRF)

### Frontend Key Files
- `frontend/src/app/page.tsx` - Homepage
- `frontend/src/components/CourseList.tsx` - Course display component
- `frontend/src/lib/api.ts` - API client with TypeScript types
- `frontend/src/app/globals.css` - Tailwind styles

## Design Decisions Log

### Why Separated Backend/Frontend?
- Computer vision needs to run in browser (client-side)
- Easier to scale frontend and backend independently
- Better separation of concerns
- Allows using best tool for each job

### Why Session Auth Instead of JWT?
- Simpler for MVP
- Built into Django
- Can switch to JWT later if needed for mobile apps

### Why ReadOnly ViewSets?
- Content management through Django admin (simpler)
- API is only for consumption, not creation
- Reduces attack surface

### Why OneToOne for Subscription?
- One user = one subscription (business rule)
- Simpler queries: `user.subscription.is_active`
- May need to change if offering multiple subscription tiers

## Notes for Future Claude Sessions

1. **Don't change the separation architecture** - Computer vision requires client-side processing
2. **Video URLs must stay protected** - Never bypass the serializer access control
3. **Subscription model is intentionally simple** - One subscription per user for MVP
4. **Admin is the content management interface** - Don't build separate CMS unless requested
5. **Course progress tracking not yet implemented** - Will need separate model in future
6. **No user-generated content** - All content is admin-created (Dieselnoi's courses)

## Product Vision

**Core Differentiator**: Computer vision-powered form correction during training
**Business Model**: Monthly subscription ($X/month for all courses)
**Content Strategy**: Expert-led, structured curriculum (not user-generated)
**Technical Edge**: Client-side ML for real-time feedback without server load

## Contact & Resources

- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions/overview
- **Mux Docs**: https://docs.mux.com/
- **MediaPipe Pose**: https://google.github.io/mediapipe/solutions/pose
- **Next.js App Router**: https://nextjs.org/docs/app
- **DRF Docs**: https://www.django-rest-framework.org/
