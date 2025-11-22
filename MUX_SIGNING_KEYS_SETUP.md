# Mux Signed URLs Setup - CRITICAL FOR PRODUCTION

## ⚠️ Why This Is Critical

Without Mux signed URLs, **anyone can share video URLs and stream your content indefinitely** - even after their subscription expires. This is your biggest revenue leak.

**Current Status**: Code is ready (implemented in `backend/core/serializers.py`), but signing keys need to be configured.

---

## 🔑 Step-by-Step Setup

### 1. Generate Signing Keys in Mux Dashboard

1. Go to [https://dashboard.mux.com/settings/signing-keys](https://dashboard.mux.com/settings/signing-keys)
2. Click **"Generate new key pair"**
3. You'll see two values:
   - **Signing Key ID**: Looks like `abc123xyz`
   - **Private Key**: A long base64 string

⚠️ **IMPORTANT**: Copy both values immediately - you can't retrieve the private key later!

### 2. Add to Railway Environment Variables

In your Railway backend project:

1. Go to your backend service → **Variables** tab
2. Add **two new variables**:
   ```
   MUX_SIGNING_KEY_ID=abc123xyz
   MUX_SIGNING_KEY_PRIVATE=dGhpc2lzYW5leGFtcGxlYmFzZTY0c3RyaW5n...
   ```
3. Click **Deploy** (Railway will restart with new variables)

### 3. Verify It's Working

Test with these steps:

**A. Check Non-Subscriber Access** (should be blocked):
```bash
# 1. Log in as user without subscription
curl -X POST https://your-api.railway.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  -c cookies.txt

# 2. Try to access a paid lesson
curl https://your-api.railway.app/api/lessons/1/ \
  -b cookies.txt

# Expected: mux_playback_id should be null
```

**B. Check Subscriber Access** (should get signed URL):
```bash
# 1. Log in as user WITH active subscription
curl -X POST https://your-api.railway.app/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"subscriber","password":"password"}' \
  -c cookies.txt

# 2. Access a lesson in their subscribed course
curl https://your-api.railway.app/api/lessons/1/ \
  -b cookies.txt

# Expected: mux_playback_id should look like:
# "abc123xyz?token=XyZ789...&exp=1234567890"
```

### 4. Test Signed URL Expiration

The signed URLs expire after **2 hours** (7200 seconds). You can verify:

1. Get a signed playback ID from the API
2. Extract the `exp` timestamp from the URL
3. Convert to human time:
   ```bash
   # If exp=1737550800
   date -r 1737550800
   # Should show 2 hours from now
   ```

---

## 🔍 How It Works (Technical)

### Code Implementation

Located in `backend/core/serializers.py` (lines 142-155):

```python
# For subscribers - return signed playback ID
if instance.mux_playback_id:
    data['mux_playback_id'] = get_signed_playback_id(
        instance.mux_playback_id,
        expiration_seconds=7200  # 2 hours
    )
```

### Signing Function

Located in `backend/core/mux_utils.py`:

```python
def get_signed_playback_id(playback_id: str, expiration_seconds: int = 3600) -> str:
    """
    Generate a signed Mux playback URL with expiration.

    If signing keys are NOT configured:
    - Returns regular playback ID (works in dev, NOT secure for production)

    If signing keys ARE configured:
    - Returns: "playback_id?token=signature&exp=timestamp"
    - Token is HMAC-SHA256 signature
    - Mux verifies the signature before serving video
    """
```

### Security Flow

1. **User requests lesson** → API checks subscription
2. **Subscription valid** → Generate signed URL with 2-hour expiration
3. **Return to frontend** → Mux Player uses signed URL
4. **Mux validates** → Checks signature and expiration before streaming
5. **After 2 hours** → URL expires, user must fetch new lesson data

---

## 🛡️ What This Protects Against

### ✅ Protected Scenarios

1. **URL Sharing**: Even if user shares video URL, it expires in 2 hours
2. **Expired Subscriptions**: Cancelled users can't replay old videos (URLs expire)
3. **Browser Caching**: Old playback IDs won't work after expiration
4. **Developer Tools**: Can't extract permanent playback ID from network tab

### ❌ Still Vulnerable (Inherent Limits)

1. **Screen Recording**: Users can still record their screen (use watermarks to deter)
2. **2-Hour Window**: URL is valid for 2 hours (can't be shorter due to UX)
3. **Download Tools**: Some tools can capture HLS streams (Mux doesn't prevent this)

**Mitigation**: Add user watermarks to video player (shows username/email on video).

---

## 🚨 Common Issues

### Issue 1: "Video won't play after deployment"

**Cause**: Signing keys not set or incorrect format

**Fix**:
```bash
# Check if keys are set
railway run env | grep MUX_SIGNING

# Should show:
# MUX_SIGNING_KEY_ID=your-key-id
# MUX_SIGNING_KEY_PRIVATE=base64-string...

# If missing, add them in Railway dashboard
```

### Issue 2: "Videos work in development but not production"

**Cause**: In development, signing is optional (returns regular playback ID)

**Fix**: Set the signing keys in production environment variables

### Issue 3: "Token signature is invalid"

**Cause**: Private key was copied incorrectly (extra spaces, newlines)

**Fix**: Re-copy the private key from Mux dashboard. It should be:
- Single line (no newlines)
- No spaces at start/end
- Exactly as shown in Mux dashboard

---

## 📊 Monitoring Signed URLs

### Check Mux Analytics

1. Go to [Mux Dashboard > Analytics](https://dashboard.mux.com/analytics)
2. Look for **"Playback failures"**
3. Filter by error: `"Invalid playback token"`
4. This shows attempts to use expired or fake URLs

### Check Django Logs

Signed URLs are logged when generated:

```bash
railway logs | grep "get_signed_playback_id"
```

### Alert on Failures

Set up Sentry alert for:
```python
# In Sentry dashboard, create alert rule:
# Issue matches: "Mux playback token invalid"
# Send notification to: your-email@example.com
```

---

## 🔄 Key Rotation (Advanced)

Rotate signing keys every 6-12 months for security:

1. Generate new key pair in Mux dashboard
2. Add NEW keys to Railway (keep old keys active)
3. Update code to use new key ID
4. Wait 24 hours (old URLs expire)
5. Delete old keys from Mux dashboard

---

## ✅ Production Checklist

Before going live, verify:

- [ ] Signing keys generated in Mux dashboard
- [ ] `MUX_SIGNING_KEY_ID` set in Railway
- [ ] `MUX_SIGNING_KEY_PRIVATE` set in Railway (no extra spaces/newlines)
- [ ] Backend redeployed after adding keys
- [ ] Tested: Non-subscriber gets `null` playback ID
- [ ] Tested: Subscriber gets signed URL with `?token=...&exp=...`
- [ ] URL expires after 2 hours (tested by waiting or manipulating `exp`)
- [ ] Mux analytics shows no "invalid token" errors

---

## 📞 Help

If videos still won't play after setup:

1. Check Railway logs: `railway logs --tail 100`
2. Check browser console for errors
3. Verify subscription is active in Django admin
4. Test playback ID directly: `https://stream.mux.com/{playback_id}.m3u8`
5. Contact Mux support (they're very responsive)

**Expected behavior**:
- Without signing keys: All videos play (insecure)
- With signing keys: Only subscribed users get working URLs that expire in 2 hours
