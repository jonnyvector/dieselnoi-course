# Email Verification & Google OAuth Setup Guide

## Overview

Your Dieselnoi platform now includes:
- ✅ **Email verification** for new user registrations
- ✅ **Google OAuth** ("Sign in with Google") support
- ✅ **Email backend** configured (currently using console for development)

## Current State

### Email Verification
- **Status**: Configured and ready to use
- **Development Mode**: Emails print to the Django console (terminal where server runs)
- **Verification Required**: Users must verify their email before accessing the platform
- **Expiration**: Verification links expire after 3 days

### Google OAuth
- **Status**: Configured but needs Google Cloud credentials
- **Setup Required**: You need to create a Google Cloud project and add credentials

---

## How Email Verification Works Right Now

### For Development (Current Setup)
1. User signs up at `/signup`
2. **Verification email prints to the Django server console** (not sent via email)
3. User clicks the verification link from the console output
4. Email is verified, user can log in

### Example Console Output
```
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Subject: Please Confirm Your E-mail Address
From: noreply@dieselnoi.com
To: user@example.com

Hello from Dieselnoi Muay Thai!

You're receiving this e-mail because user@example.com was used to sign up for an account.

To confirm this is correct, go to http://localhost:8000/accounts/confirm-email/ABC123XYZ/

Thank you!
```

---

## Production Email Setup (Gmail)

When you're ready to send real emails:

### 1. Get a Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Select **Security**
3. Under "How you sign in to Google," select **2-Step Verification**
4. At the bottom, select **App passwords**
5. Select **Mail** and **Other (Custom name)**
6. Name it "Dieselnoi Platform"
7. Copy the 16-character password

### 2. Update `.env` File

```env
# Comment out console backend
# EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Enable SMTP backend
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop  # The 16-character app password
DEFAULT_FROM_EMAIL=noreply@dieselnoi.com
```

### 3. Restart Django Server
```bash
# Kill current server (Ctrl+C in the terminal running it)
python manage.py runserver
```

Now emails will be sent via Gmail!

---

## Google OAuth Setup

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Name it "Dieselnoi Muay Thai"

### 2. Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click **Enable**

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Configure consent screen if prompted:
   - User Type: **External**
   - App name: **Dieselnoi Muay Thai**
   - Support email: Your email
   - Authorized domains: (leave empty for localhost testing)
4. Application type: **Web application**
5. Name: **Dieselnoi Web Client**
6. Authorized redirect URIs:
   ```
   http://localhost:8000/accounts/google/login/callback/
   http://127.0.0.1:8000/accounts/google/login/callback/
   ```
   (Add production URLs later)

7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### 4. Update `.env` File

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
```

### 5. Add Google Provider in Django Admin

1. Go to http://localhost:8000/admin/
2. Login with admin credentials
3. Navigate to **Sites** → **Sites**
4. Edit the default site:
   - Domain name: `localhost:8000`
   - Display name: `Dieselnoi Local`
5. Navigate to **Social Applications** → **Add Social Application**
6. Fill in:
   - Provider: **Google**
   - Name: **Google OAuth**
   - Client id: (paste from Google Cloud Console)
   - Secret key: (paste from Google Cloud Console)
   - Sites: Select **localhost:8000** and move it to "Chosen sites"
7. Click **Save**

### 6. Restart Django Server

```bash
python manage.py runserver
```

---

## Testing Email Verification (Development)

### 1. Register a New User

1. Go to http://localhost:3000/signup
2. Fill out the form with email: `test@example.com`
3. Submit

### 2. Check Django Console

Look in the terminal where Django is running. You'll see:

```
Content-Type: text/plain; charset="utf-8"
...
To confirm this is correct, go to http://localhost:8000/accounts/confirm-email/ABC123/
```

### 3. Open Verification Link

Copy the link and paste it into your browser. You'll see a confirmation page.

### 4. Login

Now you can login at http://localhost:3000/login with your verified email!

---

## Testing Google OAuth (After Setup)

### 1. Add "Sign in with Google" Button (Not yet implemented)

The frontend needs to be updated to show a "Sign in with Google" button. This will redirect to:
```
http://localhost:8000/accounts/google/login/
```

### 2. OAuth Flow

1. User clicks "Sign in with Google"
2. Redirected to Google login
3. User grants permissions
4. Redirected back to your app
5. User is automatically logged in

---

## Troubleshooting

### Email Verification Not Working

**Issue**: No email in console
- Check Django server console output
- Ensure `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env`

**Issue**: Link expired
- Verification links expire after 3 days
- Register again for a new link

### Google OAuth Errors

**Error**: `redirect_uri_mismatch`
- Ensure redirect URI in Google Cloud Console **exactly** matches:
  `http://localhost:8000/accounts/google/login/callback/`
- No trailing slash differences, http vs https, etc.

**Error**: `Social application not found`
- Go to Django admin → Social Applications
- Ensure the Google app is created and site is selected

**Error**: `The app is not authorized`
- Add test users in Google Cloud Console
- Or publish the OAuth consent screen

---

## Production Considerations

### Email
- Use a transactional email service (SendGrid, Mailgun, AWS SES)
- Don't use Gmail for high-volume production emails

### Google OAuth
- Update redirect URIs to production domain
- Publish OAuth consent screen
- Add privacy policy and terms of service URLs

### Security
- Always use HTTPS in production
- Set proper CORS origins
- Use environment variables for all secrets

---

## Next Steps

1. **Optional**: Set up Gmail SMTP for real email sending
2. **Required for OAuth**: Complete Google Cloud setup and add credentials
3. **Frontend**: Add "Sign in with Google" button (next task)
4. **Testing**: Test full registration → verification → login flow

---

## Quick Reference

### Current Email Flow
1. User registers → Email prints to console → User clicks link → Verified

### Future Production Email Flow
1. User registers → Email sent to inbox → User clicks link → Verified

### Google OAuth Flow (Once configured)
1. User clicks "Google" → Redirects to Google → User authorizes → Auto-login

---

## Files Modified

- `backend/backend/settings.py` - Added allauth configuration
- `backend/backend/urls.py` - Added allauth URLs
- `backend/.env` - Added email and Google OAuth settings
- **Migrations**: New database tables for email addresses and social accounts

## Dependencies Added

- `django-allauth` - Handles email verification and social auth
- `PyJWT` - Required for Google OAuth
- `cryptography` - Required for secure token handling
