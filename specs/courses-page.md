# Courses Page & Category System Specification

**Status:** Draft
**Created:** 2025-11-21
**Author:** Claude + Jonathan

---

## Overview

A dedicated `/courses` page for browsing, filtering, and discovering courses. Includes a robust category system for organization and an enhanced Course model to support featured content, coming soon releases, and popularity-based sorting.

---

## Backend Changes

### New Model: Category

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Display name (e.g., "Knee Techniques") |
| `slug` | SlugField | URL-friendly identifier, auto-generated |
| `description` | TextField | SEO/display description |
| `icon` | CharField(50) | Icon identifier (emoji or icon class) |
| `image` | ImageField | Optional category banner image |
| `order` | PositiveIntegerField | Custom sort order (default: 0) |
| `is_active` | BooleanField | Soft toggle for visibility (default: True) |
| `parent` | ForeignKey(self) | Optional parent category for hierarchy |
| `created_at` | DateTimeField | Auto timestamp |
| `updated_at` | DateTimeField | Auto timestamp |

**Indexes:**
- `slug` (unique)
- `is_active`, `order`
- `parent`

**Methods:**
- `get_children()` - Returns active child categories
- `get_course_count()` - Returns count of active courses
- `get_ancestors()` - Returns parent chain for breadcrumbs

---

### New Model: Tag (Optional - Phase 2)

For more granular filtering beyond categories.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(50) | Tag name |
| `slug` | SlugField | URL-friendly identifier |

---

### New Model: Instructor (Future - Phase 3)

For when platform expands beyond Dieselnoi.

| Field | Type | Description |
|-------|------|-------------|
| `name` | CharField(100) | Full name |
| `slug` | SlugField | URL identifier |
| `bio` | TextField | Biography |
| `photo` | ImageField | Profile photo |
| `achievements` | JSONField | List of achievements/titles |
| `revenue_share` | DecimalField | Percentage for revenue sharing |

---

### Course Model Updates

| Field | Type | Description |
|-------|------|-------------|
| `categories` | ManyToManyField(Category) | Course can belong to multiple categories |
| `is_featured` | BooleanField | Show in featured section (default: False) |
| `is_coming_soon` | BooleanField | Mark as coming soon (default: False) |
| `release_date` | DateTimeField | When course becomes available (nullable) |
| `popularity_score` | PositiveIntegerField | Computed score for sorting (default: 0) |
| `enrollment_count` | PositiveIntegerField | Cached count of subscriptions |
| `tags` | ManyToManyField(Tag) | Optional tags (Phase 2) |
| `instructor` | ForeignKey(Instructor) | Course instructor (Phase 3) |

**Popularity Score Calculation:**
```
score = (enrollment_count * 10) + (avg_rating * 20) + (completion_rate * 50) + (recent_views * 1)
```
Updated via management command or celery task.

---

## API Endpoints

### Categories

**GET /api/categories/**
```json
[
  {
    "id": 1,
    "name": "Striking",
    "slug": "striking",
    "description": "Master the art of Muay Thai strikes",
    "icon": "🥊",
    "course_count": 5,
    "children": [
      {"id": 2, "name": "Knees", "slug": "knees", "course_count": 2},
      {"id": 3, "name": "Elbows", "slug": "elbows", "course_count": 1}
    ]
  }
]
```

### Courses (Enhanced)

**GET /api/courses/**

Query Parameters:
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category slug |
| `difficulty` | string | Filter by difficulty (beginner, intermediate, advanced) |
| `price` | string | Filter: "free" or "paid" |
| `featured` | boolean | Only featured courses |
| `coming_soon` | boolean | Only coming soon courses |
| `search` | string | Search title/description |
| `sort` | string | Sort by: newest, popular, price_asc, price_desc, difficulty |
| `page` | int | Pagination |

Response includes:
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "title": "Fundamentals of Muay Thai",
      "slug": "fundamentals-of-muay-thai",
      "description": "...",
      "thumbnail": "...",
      "difficulty": "beginner",
      "price": "29.99",
      "categories": [{"name": "Fundamentals", "slug": "fundamentals"}],
      "is_featured": true,
      "is_coming_soon": false,
      "release_date": null,
      "enrollment_count": 1500,
      "avg_rating": 4.8,
      "lesson_count": 12,
      "total_duration_minutes": 180,
      "user_progress": 45,  // if authenticated
      "is_subscribed": true  // if authenticated
    }
  ],
  "filters": {
    "categories": [{"slug": "striking", "name": "Striking", "count": 5}],
    "difficulties": [{"value": "beginner", "count": 3}]
  }
}
```

---

## Frontend: /courses Page

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Navigation                                                   │
├─────────────────────────────────────────────────────────────┤
│ Hero Section (optional - if featured course exists)          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Featured Course Banner                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Page Header                                                  │
│ "All Courses" + Course count + Search bar                   │
├─────────────────────────────────────────────────────────────┤
│ Filter Bar                                                   │
│ [All] [Striking] [Clinch] [Defense] | Difficulty ▼ | Sort ▼ │
├─────────────────────────────────────────────────────────────┤
│ Continue Learning (authenticated users with progress)        │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ Course  │ │ Course  │ │ Course  │                        │
│ │ 45%     │ │ 20%     │ │ 80%     │                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
├─────────────────────────────────────────────────────────────┤
│ Course Grid                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │         │ │         │ │         │ │ COMING  │           │
│ │ Course  │ │ Course  │ │ Course  │ │ SOON    │           │
│ │         │ │ SUBSCRIBED│         │ │         │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │         │ │         │ │         │ │         │           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│ Pagination                                                   │
└─────────────────────────────────────────────────────────────┘
```

### Course Card States

1. **Default** - Available for purchase
2. **Subscribed** - Shows progress bar, "Continue" button
3. **Coming Soon** - Grayed overlay, release date, "Notify Me" button
4. **Featured** - Gold border/badge

### Filter Behavior

- Filters update URL query params (shareable/bookmarkable)
- Instant filtering (no page reload)
- Show active filter count
- "Clear all" button when filters active
- Mobile: Filters in slide-out drawer

### Search

- Debounced search (300ms)
- Searches title, description, instructor name
- Highlights matching text (nice-to-have)

### Empty States

- No courses match filters: "No courses found. Try adjusting your filters."
- No courses at all: "Courses coming soon! Sign up to be notified."

---

## Component Breakdown

### New Components

| Component | Description |
|-----------|-------------|
| `CoursesPage` | Main page component |
| `CourseFilters` | Filter bar with category pills, dropdowns |
| `CourseSearch` | Search input with debounce |
| `CourseGrid` | Responsive grid of course cards |
| `CourseCardEnhanced` | Updated card with progress, badges |
| `ContinueLearning` | Horizontal scroll of in-progress courses |
| `FeaturedCourseBanner` | Hero banner for featured course |
| `ComingSoonCard` | Special card variant for unreleased |
| `FilterDrawer` | Mobile filter slide-out |

### Reused Components

- `Navigation`
- `Skeleton` (loading states)
- `Pagination`

---

## Implementation Phases

### Phase 1: MVP (This Sprint)
- [ ] Category model + migration
- [ ] Course model updates (categories, is_featured, is_coming_soon)
- [ ] Category API endpoint
- [ ] Enhanced courses API with filtering
- [ ] Basic /courses page with grid
- [ ] Category filter pills
- [ ] Difficulty dropdown
- [ ] Sort dropdown
- [ ] Search bar
- [ ] Subscribed/progress badges on cards

### Phase 2: Enhanced UX
- [ ] Featured course hero banner
- [ ] Continue Learning section
- [ ] Coming Soon cards with notify
- [ ] Mobile filter drawer
- [ ] URL query param sync
- [ ] Popularity score calculation

### Phase 3: Scale Features
- [ ] Tag system
- [ ] Instructor model
- [ ] Advanced search (Elasticsearch?)
- [ ] Personalized recommendations
- [ ] Recently viewed courses

---

## Questions to Resolve

1. **Initial categories?**

   **Technique Categories (Phase 1):**
   - Fundamentals
   - Striking (→ Punches, Kicks, Knees, Elbows)
   - Clinch
   - Defense
   - Conditioning
   - Strategy & Fight IQ

   **Fighting Style Categories (Phase 3 - Multi-Instructor):**
   - Muay Khao (Knee Fighter) - e.g., Dieselnoi
   - Muay Femur (Technician) - e.g., Samart, Somrak
   - Muay Mat (Puncher) - e.g., Anuwat, Sagat
   - Muay Tae (Kicker) - e.g., Apidej, Samson
   - Muay Sok (Elbow Specialist) - e.g., Yodkhunpon

2. **"Notify Me" for coming soon** - ✅ Email capture. Store in `CourseNotification` model (user, course, created_at). Send email when course releases.

3. **Free courses** - ✅ Yes, free preview courses will exist. Add `is_free` boolean to Course model (price = 0 auto-sets this, or manual override).

4. **Course bundles** - ✅ Plan for Phase 2/3. New `Bundle` model:
   - name, slug, description
   - courses (M2M)
   - original_price (sum of courses)
   - bundle_price (discounted)
   - discount_percentage (computed)
   - is_active

---

## Success Metrics

- Time to find desired course < 10 seconds
- Filter usage rate
- Search usage rate
- Conversion from browse → course detail → subscribe

---

## References

- Current CourseList component: `frontend/src/components/CourseList.tsx`
- Course model: `backend/core/models.py`
- Course API: `backend/core/views.py` (CourseViewSet)
