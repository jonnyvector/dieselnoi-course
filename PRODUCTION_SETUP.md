# Production Setup Guide

This guide covers all critical setup steps for deploying Dieselnoi Muay Thai platform to production.

## 📋 Pre-Deployment Checklist

### 1. Mux Signed URLs (CRITICAL - Revenue Protection)

**Why**: Prevents users from sharing video URLs. Without signed URLs, anyone with a playback ID can stream your videos indefinitely.

**Setup**:
1. Go to [Mux Dashboard > Settings > Signing Keys](https://dashboard.mux.com/settings/signing-keys)
2. Click "Generate new key pair"
3. Save the **Signing Key ID** and **Private Key** (base64 encoded)
4. Add to Railway environment variables:
   ```
   MUX_SIGNING_KEY_ID=your-key-id
   MUX_SIGNING_KEY_PRIVATE=your-base64-private-key
   ```

**Verify**: Check `backend/core/serializers.py` lines 142-155 - signed URLs are already implemented in code.

---

### 2. Sentry Error Tracking (CRITICAL - Know When Things Break)

**Why**: Get instant alerts when errors occur. Without monitoring, you won't know users are experiencing issues.

**Setup**:
1. Create free account at [sentry.io](https://sentry.io)
2. Create new project → Select "Django"
3. Copy the DSN (looks like `https://abc123@o123.ingest.sentry.io/456`)
4. Add to Railway environment variables:
   ```
   SENTRY_DSN=your-sentry-dsn
   SENTRY_ENVIRONMENT=production
   ```

**Verify**: Sentry will automatically capture errors once deployed with DEBUG=False.

---

### 3. Redis Caching (HIGH PRIORITY - Performance)

**Why**: Dramatically improves performance for repeated requests (course lists, user lookups, session storage).

**Setup on Railway**:
1. In your Railway project, click "New" → "Database" → "Add Redis"
2. Railway automatically provides `REDIS_URL` environment variable
3. No code changes needed - already configured in `settings.py`

**Verify**:
```bash
# Check Redis is being used
curl https://your-api.railway.app/api/health/detailed/
# Should show cache: {"status": "healthy"}
```

---

### 4. Email Verification (RECOMMENDED - Reduce Spam)

**Why**: Prevents fake signups and ensures you can contact users.

**Current Status**: Disabled for easier onboarding (`ACCOUNT_EMAIL_VERIFICATION = 'none'`)

**To Enable for Production**:

Edit `backend/backend/settings.py`:
```python
# Change from:
ACCOUNT_EMAIL_VERIFICATION = 'none'

# To:
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'  # Users must verify before accessing courses
# OR
ACCOUNT_EMAIL_VERIFICATION = 'optional'   # Users can access immediately but should verify
```

**Email Provider Setup** (choose one):

**Option A: SendGrid (Recommended)**
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Create API key with "Mail Send" permissions
3. Add to Railway:
   ```
   SENDGRID_API_KEY=SG.your-api-key
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

**Option B: Gmail SMTP (Development Only)**
1. Enable 2FA on your Gmail account
2. Generate App Password: [Google Account > Security > App Passwords](https://myaccount.google.com/apppasswords)
3. Add to Railway:
   ```
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USE_TLS=True
   EMAIL_HOST_USER=your-email@gmail.com
   EMAIL_HOST_PASSWORD=your-16-char-app-password
   DEFAULT_FROM_EMAIL=your-email@gmail.com
   ```

---

### 5. Database Backups (CRITICAL - Data Protection)

**Railway Automatic Backups**:
- Railway Pro plan includes automatic daily backups
- Backups retained for 7 days
- Restore via Railway dashboard

**Manual Backup Strategy**:
```bash
# Create manual backup
railway run pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
railway run psql $DATABASE_URL < backup-20250122.sql
```

**Recommended Schedule**:
- Daily automatic backups (Railway Pro)
- Weekly manual backups before major deployments
- Monthly backups stored off-site (S3, Google Drive, etc.)

---

### 6. Health Check Monitoring

**Setup**:

Health check endpoints are now available:
- Basic: `https://your-api.railway.app/api/health/`
- Detailed: `https://your-api.railway.app/api/health/detailed/`

**Monitoring Services** (choose one):

**Option A: UptimeRobot (Free)**
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-api.railway.app/api/health/`
   - Interval: 5 minutes
3. Set up email/SMS alerts

**Option B: Railway Built-in (Pro Plan)**
- Railway provides uptime monitoring on Pro plan
- Access via Railway dashboard

**Option C: Sentry Cron Monitoring**
- Sentry automatically tracks endpoint performance
- Set up alerts for slow response times

---

## 🔐 Security Checklist

### Required Before Going Live

- [ ] `DEBUG=False` in production environment
- [ ] Strong `DJANGO_SECRET_KEY` (generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- [ ] Mux signed URLs configured (`MUX_SIGNING_KEY_ID` and `MUX_SIGNING_KEY_PRIVATE`)
- [ ] Rate limiting active (already implemented in `auth_security.py`)
- [ ] HTTPS enabled (Railway does this automatically)
- [ ] CORS restricted to your frontend domain only
- [ ] Stripe webhook secret configured
- [ ] Mux webhook secret configured

### Optional Security Enhancements

- [ ] Email verification enabled
- [ ] Two-factor authentication promoted to users (already implemented)
- [ ] Content Security Policy headers (already configured in `next.config.js`)
- [ ] Regular dependency updates (`pip list --outdated`)

---

## 🚀 Deployment Steps

### Backend (Railway)

1. **Set Environment Variables**:
   ```bash
   # Required
   DEBUG=False
   DJANGO_SECRET_KEY=your-secret-key
   ALLOWED_HOSTS=your-backend.railway.app,your-domain.com
   CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app
   CSRF_TRUSTED_ORIGINS=https://your-frontend.railway.app
   FRONTEND_URL=https://your-frontend.railway.app

   # Stripe
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Mux
   MUX_TOKEN_ID=...
   MUX_TOKEN_SECRET=...
   MUX_WEBHOOK_SECRET=...
   MUX_SIGNING_KEY_ID=...  # CRITICAL
   MUX_SIGNING_KEY_PRIVATE=...  # CRITICAL

   # Sentry
   SENTRY_DSN=https://...@sentry.io/...

   # Email (choose one)
   SENDGRID_API_KEY=SG.your-key
   DEFAULT_FROM_EMAIL=noreply@yourdomain.com
   ```

2. **Add Redis Database**:
   - Railway Dashboard → Add Database → Redis
   - `REDIS_URL` is automatically set

3. **Run Migrations**:
   ```bash
   railway run python manage.py migrate
   ```

4. **Create Superuser**:
   ```bash
   railway run python manage.py createsuperuser
   ```

5. **Collect Static Files**:
   ```bash
   railway run python manage.py collectstatic --noinput
   ```

### Frontend (Vercel/Railway)

1. **Set Environment Variables**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```

2. **Build and Deploy**:
   - Push to main branch (auto-deploys)
   - Or manual: `npm run build && npm start`

---

## 🧪 Post-Deployment Verification

### 1. Test Health Checks
```bash
curl https://your-api.railway.app/api/health/
# Expected: {"status": "healthy", "timestamp": ...}

curl https://your-api.railway.app/api/health/detailed/
# Expected: All checks show "healthy"
```

### 2. Test Video Protection
1. Log in as non-subscribed user
2. Try to access a paid lesson
3. Verify: `mux_playback_id` should be `null` in API response
4. Log in as subscribed user
5. Verify: `mux_playback_id` returns signed URL with `?token=...&exp=...`

### 3. Test Rate Limiting
```bash
# Try 10 failed logins rapidly
for i in {1..10}; do
  curl -X POST https://your-api.railway.app/api/auth/login/ \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# Expected: Progressive delays, then "Rate limit exceeded"
```

### 4. Test Stripe Webhooks
1. Go to Stripe Dashboard → Webhooks
2. Send test webhook event
3. Check Sentry for any errors
4. Verify subscription created in Django admin

### 5. Test Error Tracking
```bash
# Trigger a test error
railway run python manage.py shell
>>> from sentry_sdk import capture_message
>>> capture_message("Production deployment test")
```
Check Sentry dashboard for the test message.

---

## 📊 Monitoring Dashboard Setup

### Daily Checks
- [ ] Sentry: Check for new errors
- [ ] UptimeRobot: Verify 100% uptime
- [ ] Stripe Dashboard: Review failed payments
- [ ] Railway Metrics: Check memory/CPU usage

### Weekly Checks
- [ ] Database size (Railway dashboard)
- [ ] Redis memory usage
- [ ] User growth metrics (Django admin analytics)
- [ ] Video bandwidth costs (Mux dashboard)

### Monthly Checks
- [ ] Review Sentry error trends
- [ ] Audit failed payment subscriptions
- [ ] Check for outdated dependencies
- [ ] Review and rotate API keys

---

## 🆘 Troubleshooting

### Videos Won't Play
1. Check Mux signing keys are set correctly
2. Verify subscription is active in database
3. Check browser console for CORS errors
4. Test playback ID directly: `https://stream.mux.com/{playback_id}.m3u8`

### Emails Not Sending
1. Check `EMAIL_BACKEND` setting
2. Verify SendGrid API key or Gmail app password
3. Check Sentry for email errors
4. Test: `railway run python manage.py shell` → `from django.core.mail import send_mail`

### Slow Performance
1. Verify Redis is connected (health check)
2. Check database connection pool settings
3. Review Sentry performance monitoring
4. Add database indexes if needed

### High Costs
1. Mux: Check video bandwidth (consider lower quality presets)
2. Railway: Optimize database queries (use `django-debug-toolbar` in staging)
3. Stripe: Review refund/chargeback rates

---

## 📝 Environment Variables Reference

See `.env.example` for all available variables.

**Critical Variables** (platform won't work without these):
- `DJANGO_SECRET_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`
- `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE` ⚠️ REQUIRED FOR PRODUCTION
- `DATABASE_URL` (auto-provided by Railway)

**Recommended Variables**:
- `SENTRY_DSN` (error tracking)
- `REDIS_URL` (caching)
- `SENDGRID_API_KEY` (email)

**Optional Variables**:
- `AWS_ACCESS_KEY_ID` (S3 for media files)
- `SENTRY_ENVIRONMENT` (default: 'production')

---

## 🎯 Success Criteria

Your platform is production-ready when:

- ✅ Health checks return 200 OK
- ✅ Videos require active subscription (test with non-subscriber)
- ✅ Signed URLs expire after 2 hours
- ✅ Sentry captures errors
- ✅ Rate limiting blocks brute force attacks
- ✅ Uptime monitoring is active
- ✅ Email verification works (if enabled)
- ✅ Stripe webhooks process successfully
- ✅ Database backups are scheduled
- ✅ Redis caching is active

---

## 📞 Support

If you encounter issues:
1. Check Sentry for error details
2. Review Railway logs: `railway logs`
3. Test health endpoints
4. Check this guide's troubleshooting section

For Mux, Stripe, or Railway issues, contact their support teams - they're very responsive.
