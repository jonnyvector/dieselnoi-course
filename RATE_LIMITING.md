# Rate Limiting & Security Implementation

## Overview

The platform implements a sophisticated multi-layered rate limiting system that balances security with user experience.

---

## Login Security (Progressive Delays + Account Lockout)

### How It Works

Instead of blocking users after a few attempts, we use **progressive delays** that increase gradually:

| Failed Attempts | Action |
|----------------|--------|
| 1-2 | Instant response (no delay) |
| 3-4 | 2 second delay |
| 5-6 | 5 second delay |
| 7-9 | 10 second delay |
| 10-14 | 30 second delay |
| 15+ | **Account locked for 15 minutes** |

### Key Features

✅ **Smart Tracking**: Tracks attempts by BOTH username AND IP address
✅ **Auto-Reset**: Counter resets after 1 hour of inactivity
✅ **Helpful Feedback**: Tells users how many attempts remain
✅ **Graceful Degradation**: Delays slow down attackers without frustrating users
✅ **Temporary Lockout**: 15 minutes (not 1 hour) if limit exceeded

### API Response Examples

**After 5 failed attempts:**
```json
{
  "error": "Invalid credentials. 10 attempts remaining before lockout.",
  "attempts_remaining": 10
}
```

**When locked out:**
```json
{
  "error": "Account temporarily locked",
  "detail": "Too many failed login attempts. Please try again in 13 minutes.",
  "locked_until_seconds": 780
}
```

**After successful login:**
- All failed attempt counters are cleared
- User can log in normally again

---

## Registration Rate Limiting

### Limits

- **10 registrations per IP per hour**
- Prevents bulk account creation
- More lenient than old system (was 5/hour)

### API Response

**When limit exceeded:**
```json
{
  "error": "Registration rate limit exceeded.",
  "detail": "Too many registration attempts. Please try again in an hour. (10/10 used)"
}
```

---

## Content & API Rate Limits

All other endpoints use standard rate limiting with generous limits:

| Endpoint | Limit | Reason |
|----------|-------|--------|
| **Comments** | 20/minute | Allows active discussions |
| **Lessons** | 200/minute | Smooth course browsing |
| **Progress Tracking** | 120/minute | Video progress updates (every 10 seconds) |
| **Stripe Checkout** | 20/hour | Prevent payment abuse |
| **Admin Uploads** | 20/hour | Reasonable for content creators |

---

## Why This Approach?

### ❌ Old System Problems

- **Too Restrictive**: 5 registrations/hour, 10 logins/hour
- **Shared IP Issues**: Offices, schools, public WiFi all blocked together
- **Hard Blocking**: No warning, instant 1-hour lockout
- **Doesn't Stop Botnets**: Sophisticated attackers use many IPs anyway

### ✅ New System Benefits

1. **User-Friendly**
   - Legitimate users rarely hit limits
   - Clear warnings before lockout
   - Short lockout duration (15 min, not 1 hour)

2. **Effective Against Attacks**
   - Progressive delays slow down brute force attacks significantly
   - 30 second delay at attempt 10 = 2 hours to try 240 passwords
   - Account lockout prevents automated attacks
   - Tracks by username AND IP (harder to bypass)

3. **Better UX**
   - User with typos/forgotten password not punished
   - Informative error messages
   - Auto-resets after successful login

---

## Technical Implementation

### Stack

- **Django Cache**: Fast in-memory tracking (Redis in production)
- **Time-based Keys**: Auto-expire after 1 hour
- **Atomic Operations**: Thread-safe increment operations

### Cache Keys

```
login_attempts_ip:{ip_address}       # Track by IP
login_attempts_user:{username}       # Track by username
account_lockout:{username}           # Lock specific account
registration_attempts_ip:{ip_address} # Registration tracking
```

### Code Location

- **Auth Security**: `backend/core/auth_security.py`
- **Login Handler**: `backend/core/views.py` → `LoginView`
- **Register Handler**: `backend/core/views.py` → `RegisterView`

---

## Configuration

### Adjusting Limits

Edit `backend/core/auth_security.py`:

```python
class LoginAttemptTracker:
    # Progressive delay thresholds
    DELAY_THRESHOLDS = {
        3: 2,    # After 3 attempts: 2 second delay
        5: 5,    # After 5 attempts: 5 second delay
        7: 10,   # After 7 attempts: 10 second delay
        10: 30,  # After 10 attempts: 30 second delay
    }

    MAX_ATTEMPTS = 15         # Lock after 15 failures
    LOCKOUT_DURATION = 900    # Lock for 15 minutes (seconds)
    ATTEMPT_EXPIRY = 3600     # Reset counter after 1 hour
```

### Registration Limits

```python
class RegistrationRateLimiter:
    MAX_PER_HOUR = 10  # Maximum registrations per IP per hour
    EXPIRY = 3600      # 1 hour
```

---

## Monitoring

### Check Failed Attempts (Django Shell)

```python
from core.auth_security import LoginAttemptTracker

# Check attempts for a user
user_attempts, ip_attempts = LoginAttemptTracker.get_attempt_count('username', '1.2.3.4')
print(f"User attempts: {user_attempts}, IP attempts: {ip_attempts}")

# Check lockout status
is_locked, seconds = LoginAttemptTracker.is_locked_out('username')
if is_locked:
    print(f"Account locked for {seconds // 60} more minutes")
```

### Analytics Integration

Failed login attempts are logged to `backend/logs/django.log`:

```
INFO 2025-11-04 12:34:56 Failed login attempt: username=testuser ip=1.2.3.4 attempts=5
WARNING 2025-11-04 12:35:30 Account locked: username=testuser attempts=15
```

---

## Future Enhancements

- **CAPTCHA Integration**: Show CAPTCHA after 5 failed attempts
- **Email Notifications**: Alert users of suspicious login activity
- **Geolocation Checks**: Flag logins from unusual locations
- **Device Fingerprinting**: Track by device, not just IP
- **Admin Dashboard**: View locked accounts and failed attempts

---

## Testing

### Test Progressive Delays

```bash
# Try logging in with wrong password multiple times
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "wrong"}'

# Observe increasing response times:
# Attempts 1-2: ~100ms
# Attempts 3-4: ~2100ms (2 second delay)
# Attempts 5-6: ~5100ms (5 second delay)
# Attempt 15: Account locked
```

### Test Registration Limits

```bash
# Register 10 accounts from same IP
for i in {1..11}; do
  curl -X POST http://localhost:8000/api/register/ \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"user$i\", \"email\": \"user$i@example.com\", \"password\": \"pass123\"}"
done

# 11th attempt should be blocked with 429 error
```

---

## Security Best Practices

✅ **Implemented**
- Progressive delays instead of hard blocks
- Username + IP tracking
- Temporary lockouts (not permanent)
- Informative error messages (without revealing existence of accounts)
- Auto-reset after successful login

🔄 **Recommended for Production**
- Use Redis for cache (faster than DB)
- Enable CAPTCHA after 5 attempts
- Add email notifications for lockouts
- Monitor analytics for attack patterns
- Consider 2FA for sensitive accounts

❌ **Avoid**
- Never store passwords in logs
- Don't reveal if username exists
- Don't use client-side rate limiting only
- Don't make lockouts too long (frustrates legitimate users)

---

**Last Updated:** 2025-11-04
