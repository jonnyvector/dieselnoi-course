# TODO & Roadmap

## Current Phase Status

### Phase 1: MVP Foundation ✅ COMPLETE

- ✅ Django models and API
- ✅ Next.js structure
- ✅ Course listing component
- ✅ Authentication (session-based + Google OAuth)
- ✅ Login/signup pages
- ✅ Protected routes (implemented with redirects)
- ✅ Course detail pages
- ✅ Lesson detail pages

### Phase 2: Video & Payments 🔄 IN PROGRESS

- ✅ Stripe integration (checkout flow complete)
- ✅ Per-course subscription model implemented
- ✅ Webhook handlers configured (Stripe + Mux)
- ✅ Mux video integration (Direct Upload + playback)
- ✅ Video player with progress tracking
- ✅ Lesson progress tracking system
- ✅ Comments system with threaded replies
- 🔲 Production webhook setup (needs Stripe Dashboard configuration)
- 🔲 User dashboard for subscription management
- 🔲 Stripe customer portal for billing management

### Phase 3: Computer Vision 🔲 NOT STARTED

- 🔲 MediaPipe integration (client-side)
- 🔲 Pose detection during shadowboxing
- 🔲 Form analysis and feedback
- 🔲 Real-time correction suggestions
- 🔲 Progress visualization

---

## Immediate Next Steps (Priority Order)

### 1. User Dashboard Enhancement

**Priority: HIGH**

- [ ] Build comprehensive dashboard page
  - Show all active subscriptions with course cards
  - Display progress for each subscribed course
  - Show recent activity / continue watching section
  - Add quick links to courses
- [ ] Integrate Stripe Customer Portal
  - Add "Manage Billing" button
  - Link to Stripe-hosted portal for subscription management
  - Handle cancellations and payment method updates

### 2. Production Readiness

**Priority: HIGH**

- [ ] Set up production webhooks in Stripe Dashboard
- [ ] Switch from SQLite to PostgreSQL
- [ ] Configure production environment variables
- [ ] Set up HTTPS/SSL certificates
- [ ] Implement rate limiting for video endpoints
- [ ] Add Django session security settings
- [ ] Configure CORS for production domain

### 3. Video Player Enhancements

**Priority: MEDIUM**

- [ ] Add keyboard shortcuts (space = play/pause, arrow keys = seek, f = fullscreen)
- [ ] Implement video quality selector (if Mux supports multiple qualities)
- [ ] Add playback speed controls (0.5x, 1x, 1.25x, 1.5x, 2x)
- [ ] Save playback position (resume where user left off)
- [ ] Add video bookmarking feature

### 4. UX Improvements

**Priority: MEDIUM**

- [ ] Add loading skeletons instead of spinners
- [ ] Implement optimistic UI for all mutations
- [ ] Add error boundaries for better error handling
- [ ] Improve mobile responsiveness
- [ ] Add success/error toast notifications
- [ ] Implement "Next Lesson" auto-advance option

### 5. Admin Improvements

**Priority: LOW**

- [ ] Create bulk upload for lessons
- [ ] Add course preview/publish workflow
- [ ] Implement lesson ordering drag-and-drop in admin
- [ ] Add analytics dashboard in admin (view counts, completion rates)

---

## Optional Enhancements (Future Consideration)

### Community Features

- [ ] Comment notifications (email or in-app)
- [ ] Like/upvote comments
- [ ] User profiles with avatar uploads
- [ ] Course reviews and ratings
- [ ] Discussion forums per course

### Marketing & Growth

- [ ] Landing page optimization
- [ ] Free trial period (7-day trial)
- [ ] Referral program
- [ ] Coupon/promo code system
- [ ] Email marketing integration (Mailchimp/SendGrid)

### Analytics & Insights

- [ ] Track video engagement metrics (drop-off points, rewatch rate)
- [ ] User retention dashboard
- [ ] Course completion funnels
- [ ] Revenue analytics per course (for fighters)

### Technical Improvements

- [ ] Move to React Query for data fetching
- [ ] Implement service worker for offline support
- [ ] Add Sentry for error tracking
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add E2E tests (Playwright)
- [ ] Implement proper logging (structured JSON logs)

---

## Known Issues & Tech Debt

### Critical

- None currently

### Non-Critical

- [ ] Stripe CLI webhook forwarding limitation (use production webhooks)
- [ ] SQLite in use (switch to PostgreSQL before production)
- [ ] No pagination on comments (will need pagination with scale)
- [ ] Video URLs could be more secure (implement signed URLs with expiration)

### Design Debt

- [ ] Inconsistent spacing in some components
- [ ] Need proper design system/component library
- [ ] Dark mode support (future consideration)

---

## Questions to Resolve

1. **Revenue Sharing**: How exactly will payouts to fighters be calculated/distributed?
2. **Content Strategy**: How many courses are planned for launch?
3. **Pricing Strategy**: Are the current prices ($29.99, $49.99, $750) final?
4. **Computer Vision Timeline**: When should Phase 3 begin?
5. **Mobile Apps**: Are native iOS/Android apps planned, or web-only?

---

## Development Environment Setup

### Quick Start Commands

**Backend:**

```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Frontend:**

```bash
cd frontend
npm run dev
```

**Stripe Webhook Testing:**

```bash
stripe listen --forward-to localhost:8000/api/stripe/webhook/
```

**Mux Webhook Testing:**

```bash
# Configure webhook URL in Mux dashboard: http://localhost:8000/api/mux/webhook/
```

### Test Credentials

- Admin: `admin` / (check backend .env or create via `createsuperuser`)
- Test User: `testuser` / `testpass123`
- Stripe: Use test card `4242 4242 4242 4242`

---

**Last Updated:** 2025-11-04
