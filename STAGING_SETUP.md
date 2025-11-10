# Staging Environment Setup Guide

## Overview
We now have two environments:
- **Production**: Deploys from `master` branch
- **Staging**: Deploys from `staging` branch

## Railway Setup Instructions

### 1. Create Staging Services

**Option A: Duplicate Existing Services (Recommended)**

For each service (backend, frontend):

1. Go to Railway dashboard
2. Click on the **production backend** service
3. Click the **three dots** (⋯) → **Settings**
4. Scroll down and look for **"Duplicate Service"** or manually create a new service
5. Name it: `backend-staging`
6. Repeat for frontend: `frontend-staging`
7. Create a new PostgreSQL database: `postgres-staging`

**Option B: Create New Services from Scratch**

1. Click **"+ New"** in Railway
2. Select **"GitHub Repo"**
3. Choose `dieselnoi-course` repository
4. Create services for:
   - Backend (root: `/backend`)
   - Frontend (root: `/frontend`)
   - PostgreSQL database

### 2. Configure Branch Deployment

For each staging service:

1. Click on the service (e.g., `backend-staging`)
2. Go to **Settings** tab
3. Find **"Source"** or **"GitHub"** section
4. Change **Branch** from `master` to `staging`
5. Enable **"Auto-deploy"** for staging branch
6. Save changes

### 3. Environment Variables

**Backend Staging:**
Copy all variables from production backend, but change:
- `DEBUG=True` (for easier debugging in staging)
- `ALLOWED_HOSTS=<staging-backend-url>,<staging-frontend-url>`
- `CORS_ALLOWED_ORIGINS=https://<staging-frontend-url>`
- `CSRF_TRUSTED_ORIGINS=https://<staging-frontend-url>`
- Keep Stripe test keys (don't use production keys in staging)
- Use staging database URL from `postgres-staging`

**Frontend Staging:**
- `NEXT_PUBLIC_API_URL=https://<staging-backend-url>`
- `PORT=3000`

### 4. Database Setup

**Staging database should be separate:**
- Link `postgres-staging` to `backend-staging`
- Don't connect staging to production database!

**To copy production data to staging (optional):**
```bash
# Export from production
export DATABASE_URL="<production-db-url>"
./venv/bin/python manage.py dumpdata core --indent 2 > staging_data.json

# Import to staging
export DATABASE_URL="<staging-db-url>"
./venv/bin/python manage.py loaddata staging_data.json
```

### 5. Networking

Generate public domains for staging services:
1. Go to each staging service → Settings → Networking
2. Click "Generate Domain"
3. Note the URLs:
   - Backend staging: `https://backend-staging-xxxxx.up.railway.app`
   - Frontend staging: `https://frontend-staging-xxxxx.up.railway.app`

## Workflow

### Making Changes

**For Production (Urgent fixes):**
```bash
git checkout master
# Make changes
git add -A
git commit -m "Fix: urgent production issue"
git push origin master
# Railway auto-deploys to production
```

**For New Features (Normal workflow):**
```bash
git checkout staging
# Make changes
git add -A
git commit -m "Feature: new feature"
git push origin staging
# Railway auto-deploys to staging

# Test on staging environment
# If tests pass, merge to master:
git checkout master
git merge staging
git push origin master
# Railway auto-deploys to production
```

### Testing in Staging

1. Make changes on `staging` branch
2. Push to GitHub
3. Railway auto-deploys to staging environment
4. Test at `https://frontend-staging-xxxxx.up.railway.app`
5. If everything works, merge `staging` → `master`
6. Production automatically deploys from `master`

## URLs Reference

**Production:**
- Frontend: https://dieselnoi-course-production-a386.up.railway.app
- Backend: https://dieselnoi-course-production.up.railway.app

**Staging:**
- Frontend: (generate after setup)
- Backend: (generate after setup)

## Important Notes

1. **Never push directly to `master`** - always test in staging first
2. **Staging uses test Stripe keys** - no real payments
3. **Staging database is separate** - safe to test destructive operations
4. **Environment variables differ** - double-check before deploying
5. **Always test in staging before merging to master**

## Troubleshooting

**Staging not deploying:**
- Check Railway service settings → Branch is set to `staging`
- Check auto-deploy is enabled
- Check GitHub webhook is connected

**Environment variables not working:**
- Railway bakes `NEXT_PUBLIC_*` variables at build time
- Change requires redeploy, not just variable update

**CORS errors:**
- Update `CORS_ALLOWED_ORIGINS` in backend-staging
- Update `CSRF_TRUSTED_ORIGINS` in backend-staging
- Use correct frontend URL (staging, not production)
