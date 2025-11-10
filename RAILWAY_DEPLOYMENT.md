# Railway Deployment Guide

## Prerequisites
- GitHub account
- Railway account (sign up at railway.app)
- Your code pushed to GitHub

## Step 1: Push Code to GitHub

```bash
cd /Users/jonathanhicks/dev/dieselnoi-course
git add .
git commit -m "Prepare for Railway deployment"
git push origin master
```

## Step 2: Create Railway Account

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub repositories

## Step 3: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `dieselnoi-course` repository
4. Railway will detect it's a monorepo

## Step 4: Deploy Backend (Django)

### 4a. Add Backend Service
1. Click "Add Service" → "GitHub Repo"
2. Select your repo again
3. In settings, set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn backend.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --threads 2 --timeout 120`

### 4b. Add PostgreSQL Database
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway automatically creates database
3. Database credentials are automatically added to backend environment variables

### 4c. Set Backend Environment Variables
Click on backend service → "Variables" → Add these:

```
DEBUG=False
DJANGO_SECRET_KEY=<generate-strong-random-key>
ALLOWED_HOSTS=${{RAILWAY_PUBLIC_DOMAIN}}
CORS_ALLOWED_ORIGINS=https://${{FRONTEND_DOMAIN}}
CSRF_TRUSTED_ORIGINS=https://${{FRONTEND_DOMAIN}}
FRONTEND_URL=https://${{FRONTEND_DOMAIN}}

# Stripe (use LIVE keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mux
MUX_TOKEN_ID=<your-mux-token-id>
MUX_TOKEN_SECRET=<your-mux-token-secret>
MUX_WEBHOOK_SECRET=<your-mux-webhook-secret>

# Email
EMAIL_HOST_USER=<your-email>
EMAIL_HOST_PASSWORD=<your-app-password>
DEFAULT_FROM_EMAIL=<your-email>
```

**To generate Django secret key:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 4d. Generate Public Domain
1. Click "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://backend-production-xxxx.up.railway.app`)

## Step 5: Deploy Frontend (Next.js)

### 5a. Add Frontend Service
1. Click "New" → "GitHub Repo"
2. Select your repo
3. In settings, set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Install Command**: `npm install`

### 5b. Set Frontend Environment Variables
Click on frontend service → "Variables" → Add these:

```
NEXT_PUBLIC_API_URL=<your-backend-railway-url>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### 5c. Generate Public Domain
1. Click "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://frontend-production-xxxx.up.railway.app`)

### 5d. Update Backend Environment Variables
Go back to backend service → "Variables" and update:
```
FRONTEND_URL=<your-frontend-railway-url>
CORS_ALLOWED_ORIGINS=<your-frontend-railway-url>
CSRF_TRUSTED_ORIGINS=<your-frontend-railway-url>
```

## Step 6: Run Database Migrations

1. Go to backend service
2. Click "Deployments" → Latest deployment → "View Logs"
3. Migrations should run automatically via the Procfile
4. If not, you can run manually in Railway CLI

## Step 7: Create Admin User

### Option A: Via Railway CLI
```bash
railway login
railway link
cd backend
railway run python manage.py createsuperuser
```

### Option B: Via Django Shell in Railway
1. Backend service → "Settings" → "Add New Command"
2. Run: `python manage.py createsuperuser --username admin --email admin@example.com`

## Step 8: Update Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add Endpoint"
3. URL: `https://your-backend.railway.app/api/stripe/webhook/`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook secret
6. Update `STRIPE_WEBHOOK_SECRET` in Railway backend variables

## Step 9: Update Mux Webhooks

1. Go to Mux Dashboard → Settings → Webhooks
2. Add webhook URL: `https://your-backend.railway.app/api/mux/webhook/`
3. Copy the webhook secret
4. Update `MUX_WEBHOOK_SECRET` in Railway backend variables

## Step 10: Test Your Deployment

1. Visit your frontend URL
2. Test signup/login
3. Test video playback
4. Test subscription checkout (use Stripe test mode first)
5. Check Railway logs for any errors

## Monitoring

### View Logs
- Backend logs: Backend service → "Deployments" → Click deployment → "View Logs"
- Frontend logs: Frontend service → "Deployments" → Click deployment → "View Logs"

### Check Metrics
- Each service shows CPU, Memory, Network usage in Railway dashboard

## Troubleshooting

### Static Files Not Loading
```bash
# In Railway backend, run:
python manage.py collectstatic --noinput
```

### Database Connection Issues
- Check that DATABASE_URL is set (Railway sets this automatically)
- Check backend logs for connection errors

### CORS Errors
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL
- Verify `CSRF_TRUSTED_ORIGINS` includes your frontend URL
- Check that both use `https://` (not `http://`)

### 500 Errors
- Check backend logs
- Verify `DEBUG=False` and `ALLOWED_HOSTS` is set correctly
- Verify all environment variables are set

## Cost Estimate

- Backend service: $5-10/month
- Frontend service: $5/month
- PostgreSQL database: $5-10/month
- **Total: ~$20-30/month**

## Custom Domain (Optional)

### Add Custom Domain to Backend
1. Backend service → Settings → Networking → Custom Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Update DNS records as shown by Railway
4. Update `ALLOWED_HOSTS` to include custom domain

### Add Custom Domain to Frontend
1. Frontend service → Settings → Networking → Custom Domains
2. Add your domain (e.g., `dieselnoi.com`)
3. Update DNS records as shown by Railway
4. Update backend `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`

## Next Steps

1. Set up AWS S3 for media file storage (course resources)
2. Configure email service (SendGrid) for production emails
3. Add monitoring/alerting (Sentry for error tracking)
4. Set up automated database backups

