# Dieselnoi Muay Thai Platform (MVP)

A custom, subscription-based web application offering high-quality, structured Muay Thai training courses with legendary fighter Dieselnoi.

## Tech Stack

- **Backend**: Django 5.0 + Django REST Framework
- **Frontend**: Next.js 14 (React, TypeScript, Tailwind CSS)
- **Database**: PostgreSQL
- **Payment Processing**: Stripe (ready for integration)
- **Video Hosting**: Ready for Mux or Bunny Stream integration

## Project Structure

```
dieselnoi-course/
├── backend/          # Django REST API
│   ├── backend/      # Django project settings
│   ├── core/         # Main app (models, views, serializers)
│   ├── manage.py
│   └── requirements.txt
└── frontend/         # Next.js application
    ├── src/
    │   ├── app/      # Next.js app router
    │   ├── components/
    │   └── lib/      # API utilities
    ├── package.json
    └── next.config.js
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

1. **Create and activate a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Create PostgreSQL database**:
   ```bash
   createdb dieselnoi_db
   ```

4. **Create a `.env` file** in the `backend/` directory:
   ```env
   DEBUG=True
   DJANGO_SECRET_KEY=your-secret-key-here
   DB_NAME=dieselnoi_db
   DB_USER=postgres
   DB_PASSWORD=your-db-password
   DB_HOST=localhost
   DB_PORT=5432
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   STRIPE_SECRET_KEY=your-stripe-secret-key
   STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
   STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
   ```

5. **Run migrations**:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create a superuser**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Start the development server**:
   ```bash
   python manage.py runserver
   ```

   The API will be available at `http://localhost:8000/api/`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **The `.env.local` file is already created** with:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## API Endpoints

### Courses
- `GET /api/courses/` - List all published courses
- `GET /api/courses/{slug}/` - Get course details with lessons
- `GET /api/courses/{slug}/lessons/` - Get all lessons for a course

### Lessons
- `GET /api/lessons/` - List all lessons (filtered by subscription)
- `GET /api/lessons/{id}/` - Get specific lesson

### Subscriptions
- `GET /api/subscriptions/me/` - Get current user's subscription

## Features Implemented

### Backend
✅ Custom User model with Stripe customer ID
✅ Course, Lesson, and Subscription models
✅ DRF serializers with subscription-based access control
✅ ViewSets for read-only API endpoints
✅ CORS configuration for Next.js frontend
✅ Admin interface for content management

### Frontend
✅ Next.js 14 with TypeScript
✅ Tailwind CSS styling
✅ CourseList component with API integration
✅ Responsive design
✅ Loading and error states

## Next Steps for Full MVP

1. **Authentication**:
   - Add JWT or session authentication
   - Login/signup pages
   - Protected routes

2. **Video Integration**:
   - Integrate Mux or Bunny Stream
   - Signed URL generation for security
   - Video player component

3. **Stripe Integration**:
   - Subscription checkout flow
   - Webhook handling for subscription events
   - Customer portal

4. **User Dashboard**:
   - Course progress tracking
   - Video watch history
   - Subscription management

5. **Computer Vision (Phase 2)**:
   - MediaPipe/TensorFlow.js integration
   - Form analysis during shadowboxing
   - Real-time feedback system

## Development Notes

- Backend runs on port 8000
- Frontend runs on port 3000
- Make sure PostgreSQL is running before starting the backend
- Access Django admin at `http://localhost:8000/admin/`

## License

Private - All Rights Reserved
# dieselnoi-course
