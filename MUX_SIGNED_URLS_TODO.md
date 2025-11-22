# Mux Signed URLs - Setup Required

## Current Status: NOT ACTIVE ❌

Signed URLs are **implemented in code** but **not active** because existing videos have `public` playback policy.

## Why Videos Are Currently Public

When you uploaded videos to Mux, they were created with `playback_policy: ['public']`. This means:
- ✅ Videos work without signed URLs
- ❌ Anyone with the playback ID can stream videos
- ❌ Video URLs can be shared indefinitely

## To Enable Signed URLs (Production Security)

### Step 1: Remove Public Signing Keys from Railway

**Temporarily remove these from Railway environment variables:**
```
MUX_SIGNING_KEY_ID
MUX_SIGNING_KEY_PRIVATE
```

This will make the code work in "public mode" for existing videos.

### Step 2: Update Mux Upload Code

Edit `backend/core/admin.py` - find the Direct Upload creation and change:

```python
# BEFORE (current):
create_asset_request = CreateAssetRequest(
    playback_policy=[PlaybackPolicy.PUBLIC],  # ❌ This makes videos public
    mp4_support='standard',
)

# AFTER (for signed URLs):
create_asset_request = CreateAssetRequest(
    playback_policy=[PlaybackPolicy.SIGNED],  # ✅ Requires signed URLs
    mp4_support='standard',
)
```

### Step 3: Re-upload ALL Videos

**Important**: Existing videos with `public` policy **cannot** be converted to `signed`.

You must:
1. Download all existing videos
2. Update the upload code (Step 2)
3. Re-upload videos through Django admin
4. Update lesson `mux_playback_id` fields with new IDs

### Step 4: Add Signing Keys Back to Railway

Once all videos are re-uploaded with `signed` policy:

```bash
MUX_SIGNING_KEY_ID=CmnIb5uFlPxhD6tf02gMGcZfp8kYz7hXuWUT02S47eE02g
MUX_SIGNING_KEY_PRIVATE=LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFb2dJQkFBS0NBUUVBb3YrRmg3VW1WTE4yVDh2NW0vZHBYbG9QSUFUWE5qa2MzaGFybUZLNWtxM29sbnQ4ClVBMHhXWS92MG0vQlVzVU9tR1RmNjN5MERlL2VocU82cE9ueEwvS013NTBUbzlPS2RlODBXUURJN3h3bnlIaDIKQ21TU0V0WEVYWUlhY0NNRG9PQ2V1UFVFQ2ljYzhFUHp1aDhYNkpEeDFpUnV2VmQ4TDlUTmlNMzc2a1V1ckxYTAp6dURJa1M1dTFJWlZMSi9RU0JLRW90dUV5ZHpLR2pBSHZQMHhwbEJ2L0Zac21FZEU0Z1p6akczS3p1VVYrMnZlClNyNnRtcTA1bnZsTGQ3UWNxOWRDMTFyNnRTbW9FazBlQ0MzVXRDbUlkWWJQL2F5UEZnc0lwL1lnNEZMcXFaVEUKTHkzSWxib21TZkpXai9KZWJnMkZ5em9Pc0xoYjVHYTNmRkdQWlFJREFRQUJBb0lCQUE2dmVCU1UvcHV6YUYyaQpJbXREaGRpV0tjL2s1aWU2U3NUdTNscUxKK1NuMTdmQ1ZaM3JLTVZKa1pld1N5QjZpMmtYN3lwWHRWSUU3eUNYCmcyVE9VVzdVUkl1aWM0UHc2ZERjVW8yckZxS2ZtV0JrUHRNa2ZCcEhoamxvN1pvUG5Za1M0STA3ZEdzZWpkRWIKM2pIYnF1ZjZNbGxUQXBaaHdBeG1YMFBZdGxmZXVDMCtwWHBqeXFENVhDZWZqSkZxQTFqVi9obVMwby9OeG0vSwpNY1graTk1dnJZM0VBY0h6MHZkOUlKMUR4STdyY29mNEhKSVF2TVlYNG9KMFVSaWsvdHBJbVBBUjljYnNmR05wCkMvVmFWOFlTUkhiQ2FKeUROaE1PaTJKanlDekJNRTB0b2hPWjlpanBtNVN0cE9KVUt1UktjQ0xKcy9RNEJua04KVkdadGRGVUNnWUVBMDhWU1VpQWxRUWxqRkxFUGpHOE9iaVpJODNoUzc5Q0drazBSLzZObmFHS09QUDd4Wm9XYgo5MmxmNTNLeGRFVEVsK1NWVTR2emtlRXJ6U0IyVC9tcDFHUDRDUDB4NkZRZDhuRkFuY2JsVzBNbEFVNWtaUDdrCmRTdU5kMnZERkplZDVUNVNwVU5lcHk5T0xRa3QrNnJ5TTN4eTVJMStvTFMwRG1XWHQxVmpYUjhDZ1lFQXhRcDkKRmJGOHFaRUE3ei9Tc00wSGpDcjVDVGh2MUJUMUVweXBTTHhQK3ZGWmljVDBtS0J4dEF2NFkrc2pMWE9iaU9TUApnRnV4dFdsb04ydWRydVNBK20rWHRIZ0J2dTYwV2RUZ0J4blhrZDRkOUdpdFRCZ3Y4cnBVYmVsWTljU0VJNTlKCjBZVThXc3FsSE9OT3hEZFhGa2NhNjA4NFpKUmU2K2YvdHBId2Z2c0NmMnVKeUVQc0R2NzN4Vmk4a1NpL1BKU3kKM0ZqR3dWY0dqVSs5MDJYOWxJVnRoczF5cVNObXRjenR0Y1hTZUVxU29VS0EwVk9idmhSV1ErZm1sQzRJbWpWQQpqclFCMzFZYllSbThhUk8xN01KclZsOVRiNmZaeUNtMzlCNndtbC9hbmxQTFVpeWFDWGJjanRaUDB3bjV4UVJnCkxmZmg0bXU1VjdYMzRSTTRTVDBDZ1lFQWdla1ZhVjBZelE5K1p6OVVJUjg4ejZ4eGZ5UEhqek8yRk94WExFNkUKQ1BaaFMxVWcweFJOZ3lDMVJ1TjcwUGE4NERlWmFVNkxUd2xOSGVVRkZJOHhmbXhld0N5ek1maGR6akJzK0NHUQpvR3Fxb3o3MHF3dnphUHh5dC9pMm4ydE9sOUhvc0l4QXE3ZVp2djhiS29FMkdNa090WUFJdFQraGliWHZRYWJjCndrc0NnWUVBZ3lOUXd2bkY2bW1WTXFNTzhpTm5IUnFsVWN0KzA1OW9zQjJoYk1aODZQQVkrQ2srMUY2Q0xIcDQKMlhNZEgxa3V4c0YxZmJGMEMxcTFRcDE1Q3h4TU92SmVyYWxaTjMzRENxTlI3QXNDd1M4VENOVXFwUEx5Z0VwNgpheFl2Rmp5dkFpMmlQNjFhL3d4djE4c00xSzVGOXFNRURDWXNrcWF6NkR5L3lCQUthVXc9Ci0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tCg==
```

### Step 5: Verify Signed URLs Work

Test that videos now require valid tokens:
1. Check API response includes `playback_token` (JWT string)
2. Video plays for subscribed users
3. Non-subscribers get `playback_token: null`
4. Old playback IDs (from before signing keys added) don't work

---

## Alternative: Keep Videos Public (Current State)

If you **don't** want to re-upload videos:

### Pros:
- ✅ Videos work immediately
- ✅ No re-upload needed
- ✅ Subscription access control still works (via `mux_playback_id: null`)

### Cons:
- ❌ Anyone with playback ID can stream videos
- ❌ Subscription can be bypassed if someone shares playback ID
- ❌ No token expiration

### How to Keep Public Mode:
1. Remove `MUX_SIGNING_KEY_ID` and `MUX_SIGNING_KEY_PRIVATE` from Railway
2. Code will return `playback_token: null`
3. MuxPlayer works fine without tokens for public videos
4. Subscription check still hides `mux_playback_id` from non-subscribers

---

## Recommendation

**For MVP/Early Launch**: Keep public mode (remove signing keys)
- Videos work immediately
- You still have subscription paywall (ID is hidden from API)
- Can enable signed URLs later when you have time to re-upload

**For Production/Scale**: Enable signed URLs
- Re-upload all videos with `signed` policy
- Add signing keys to Railway
- Prevents video URL sharing and piracy

---

## Code Already Implemented ✅

The code for signed URLs is **complete**:
- ✅ JWT token generation (`backend/core/mux_utils.py`)
- ✅ Token included in API (`backend/core/serializers.py`)
- ✅ MuxPlayer receives token (`frontend/src/app/courses/[slug]/lessons/[id]/page.tsx`)

You just need to decide: **public videos now** or **signed URLs after re-upload**.
