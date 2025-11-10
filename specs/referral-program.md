# Referral Program Specification

## Overview
Implement a referral system that rewards users for inviting friends to the Dieselnoi Muay Thai platform. Users earn credits when their referrals subscribe to courses, creating organic growth while rewarding active community members.

## Business Goals
- **Organic Growth**: Leverage existing users to acquire new subscribers
- **Retention**: Reward engaged users, increasing lifetime value
- **Cost-Effective Marketing**: Lower customer acquisition cost vs paid ads
- **Community Building**: Encourage users to share authentic recommendations

## User Stories

### As a User
- I want a unique referral link I can share with friends
- I want to see how many people I've referred and their status
- I want to earn rewards when my referrals subscribe
- I want to easily share my referral link on social media
- I want to see my available credits and how to use them

### As a Referee (New User)
- I want to receive a benefit for using a referral link
- I want to clearly see what discount I'm getting
- I want the signup process to be as simple as normal registration

### As an Admin
- I want to track referral program performance and ROI
- I want to prevent abuse (fake accounts, self-referrals)
- I want to adjust rewards without code changes
- I want to see top referrers

## Core Features

### 1. Referral Code Generation
**Implementation:**
- Each user gets a unique referral code on account creation
- Format: `DIESELNOI-[USERNAME]-[HASH]` (e.g., `DIESELNOI-JOHN-A7K9`)
- Alternatively: Short code format (e.g., `DN-A7K9M`)
- Codes are case-insensitive
- Referral URLs: `dieselnoi.com/signup?ref=DN-A7K9M`

**Database:**
```python
class ReferralCode(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='referral_code')
    code = models.CharField(max_length=20, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def generate_code(self):
        # Generate unique short code
        pass
```

### 2. Referral Tracking
**Implementation:**
- Track referral clicks (anonymous)
- Track successful signups (referee registers)
- Track conversions (referee subscribes to first course)
- Track referee retention (90-day active subscription)

**Database:**
```python
class Referral(models.Model):
    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_made')
    referee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referral_source', null=True)
    code_used = models.CharField(max_length=20)

    # Tracking
    clicked_at = models.DateTimeField(null=True, blank=True)
    signed_up_at = models.DateTimeField(null=True, blank=True)
    first_subscription_at = models.DateTimeField(null=True, blank=True)

    # Status
    STATUS_CHOICES = [
        ('clicked', 'Clicked'),
        ('signed_up', 'Signed Up'),
        ('converted', 'Converted'),
        ('rewarded', 'Rewarded'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='clicked')

    # Fraud prevention
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 3. Reward System

#### Reward Tiers
**Option A: Credit-Based (Recommended)**
- **Referee Benefit**: 20% off first month on any course
- **Referrer Reward**: $10 credit per successful conversion
- Credits can be used toward any course subscription
- Credits expire after 12 months

**Option B: Free Month**
- **Referee Benefit**: First month free on any course
- **Referrer Reward**: 1 free month per 3 successful conversions
- Free months apply to any active subscription

**Recommended: Option A** (more flexible, easier accounting)

#### Credit System
```python
class ReferralCredit(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referral_credits')
    referral = models.OneToOneField(Referral, on_delete=models.CASCADE, related_name='credit')

    amount = models.DecimalField(max_digits=10, decimal_places=2)  # $10.00
    earned_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # 12 months from earned_at

    # Usage tracking
    used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    used_for_subscription = models.ForeignKey('Subscription', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['expires_at']  # Use oldest credits first
```

### 4. Dashboard Integration

#### My Referrals Section
Display in user dashboard:
```
┌─────────────────────────────────────────────┐
│ Referral Program                             │
│                                              │
│ Your Referral Link                          │
│ dieselnoi.com/signup?ref=DN-A7K9M  [Copy]  │
│                                              │
│ Share: [Twitter] [Facebook] [WhatsApp]     │
│                                              │
│ ┌─────────────┬──────────────┬────────────┐ │
│ │ Invited     │ Converted    │ Credits    │ │
│ │ 12 friends  │ 7 signups    │ $70.00     │ │
│ └─────────────┴──────────────┴────────────┘ │
│                                              │
│ Recent Referrals:                            │
│ • Sarah J. - Converted - Nov 1, 2025        │
│ • Mike K. - Signed up - Oct 28, 2025        │
│ • Alex P. - Converted - Oct 15, 2025        │
│                                              │
│ [View All Referrals →]                      │
└─────────────────────────────────────────────┘
```

#### Credits Display
Show available credits prominently:
- In dashboard header: "Credits: $70.00"
- When viewing course checkout: "Apply $10 credit?"
- Credits page with transaction history

### 5. Referral Flow

#### Step 1: User Shares Link
1. User copies referral link from dashboard
2. User shares on social media or via messaging
3. System tracks click with cookie (30-day expiry)

#### Step 2: Referee Clicks Link
1. Referee lands on signup page with `?ref=DN-A7K9M` parameter
2. Banner displays: "You've been invited! Get 20% off your first month"
3. Referral code stored in session/cookie
4. System logs referral click (anonymous)

#### Step 3: Referee Signs Up
1. Referee creates account (referral code auto-applied)
2. System creates Referral record linking referee to referrer
3. Referral status updated to 'signed_up'
4. Referrer gets notification: "Your friend Sarah just signed up!"

#### Step 4: Referee Subscribes
1. Referee selects a course and subscribes
2. 20% discount automatically applied to first month
3. After successful payment:
   - Referral status → 'converted'
   - Create $10 ReferralCredit for referrer
   - Send notification to referrer: "You earned $10 credit!"
   - Send thank you email to both users

#### Step 5: Referrer Uses Credit
1. Referrer views available credits in dashboard
2. During checkout, credits auto-apply (oldest first)
3. Stripe invoice includes line item: "Referral Credit: -$10.00"
4. Credit marked as used

### 6. Stripe Integration

#### Discount Coupons (Referee Benefit)
```python
# Create Stripe coupon for 20% off first month
stripe.Coupon.create(
    id='referral-20-off',
    percent_off=20,
    duration='once',  # First month only
    name='Referral Discount - 20% Off First Month'
)

# Apply to subscription at checkout
stripe.Subscription.create(
    customer=referee_stripe_id,
    items=[{'price': course_price_id}],
    coupon='referral-20-off'
)
```

#### Credit Application (Referrer Benefit)
```python
# Apply credit to invoice
stripe.InvoiceItem.create(
    customer=referrer_stripe_id,
    amount=-1000,  # -$10.00 in cents
    currency='usd',
    description='Referral Credit Applied',
    invoice=invoice_id
)
```

### 7. Fraud Prevention

#### Detection Rules
1. **Same IP Address**: Block if referee signup IP matches referrer IP
2. **Same Device Fingerprint**: Check browser fingerprint similarity
3. **Rapid Signups**: Flag if user refers >5 people in 24 hours
4. **Cancel Pattern**: Flag if >50% of referrals cancel within 7 days
5. **Disposable Emails**: Block common disposable email domains
6. **Payment Method**: Require different payment methods for referee

#### Implementation
```python
class ReferralFraudCheck(models.Model):
    referral = models.OneToOneField(Referral, on_delete=models.CASCADE)

    # Checks
    same_ip = models.BooleanField(default=False)
    same_device = models.BooleanField(default=False)
    rapid_signup = models.BooleanField(default=False)
    disposable_email = models.BooleanField(default=False)

    # Results
    fraud_score = models.IntegerField(default=0)  # 0-100
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
```

Auto-approve if fraud_score < 20
Manual review if 20 ≤ fraud_score ≤ 50
Auto-reject if fraud_score > 50

### 8. Admin Analytics

#### Metrics to Track
- **Referral Funnel**:
  - Clicks → Signups → Conversions
  - Conversion rate at each stage
- **Top Referrers**: Leaderboard of users by conversions
- **Credit Liability**: Total unused credits outstanding
- **ROI Calculation**:
  - Credits issued vs referee LTV
  - Cost per acquisition via referrals
- **Fraud Rate**: Flagged referrals / total referrals

#### Admin Dashboard Section
```
Referral Program Analytics
──────────────────────────────

Overview (Last 30 Days)
• Total Referral Clicks: 487
• New Signups: 142 (29.2% conversion)
• Paid Subscriptions: 67 (47.2% conversion)
• Credits Issued: $670.00
• Credits Used: $340.00

Funnel Visualization:
[487 Clicks] → [142 Signups] → [67 Conversions]
   100%            29%              47%

Top Referrers:
1. Sarah Johnson - 23 conversions - $230 earned
2. Mike Chen - 18 conversions - $180 earned
3. Alex Martinez - 15 conversions - $150 earned

Financial Impact:
• Total Credit Liability: $330.00
• Average Referee LTV: $127.50
• Estimated ROI: 8.5x
```

### 9. Email Notifications

#### For Referrer
**Subject: Your friend [Name] just signed up! 🎉**
```
Hi [Referrer Name],

Great news! Your friend [Referee Name] just joined Dieselnoi Muay Thai
using your referral link.

Once they subscribe to their first course, you'll earn $10 in credits!

Keep sharing: [Your Referral Link]

Train hard,
The Dieselnoi Team
```

**Subject: You earned $10 in credits! 💰**
```
Hi [Referrer Name],

Awesome! [Referee Name] just subscribed to [Course Name], and you've
earned $10 in referral credits.

Your Credits: $[Total Credits]
Expires: [Expiration Date]

Use your credits on your next course subscription.

[View My Credits →]

Train hard,
The Dieselnoi Team
```

#### For Referee
**Subject: Welcome! Here's your 20% discount 🥊**
```
Hi [Referee Name],

Thanks for joining Dieselnoi Muay Thai through [Referrer Name]'s
invitation!

Your 20% discount is ready to use on your first course subscription.

[Browse Courses →]

Train hard,
The Dieselnoi Team
```

### 10. Social Sharing

#### Pre-filled Share Messages

**Twitter/X:**
```
I'm learning authentic Muay Thai from legendary fighters on @DieselnoiMT!
Get 20% off your first month: [referral link]
```

**Facebook:**
```
Want to learn real "Golden Era" Muay Thai? I'm training with @DieselnoiMT
and loving it. Use my link for 20% off: [referral link]
```

**WhatsApp:**
```
Hey! I found this amazing Muay Thai platform with training from legendary
fighters. Check it out and get 20% off: [referral link]
```

**Email Template:**
```
Subject: Train Muay Thai with me!

Hey,

I've been training on Dieselnoi Muay Thai - it's an online platform with
courses from legendary fighters like Dieselnoi himself.

I thought you might be interested. If you use my referral link, you'll
get 20% off your first month:

[referral link]

Let me know what you think!
```

## API Endpoints

### Frontend-Facing
```
GET  /api/referrals/my-code/           # Get user's referral code
GET  /api/referrals/stats/             # Get referral stats (clicks, conversions, etc.)
GET  /api/referrals/history/           # List referral history
GET  /api/referrals/credits/           # Get available credits
POST /api/referrals/track-click/       # Track referral link click
GET  /api/referrals/validate/?code=X   # Validate referral code (for signup page)
```

### Admin-Only
```
GET  /api/admin/referrals/analytics/   # Referral program analytics
GET  /api/admin/referrals/leaderboard/ # Top referrers
GET  /api/admin/referrals/fraud/       # Flagged referrals for review
POST /api/admin/referrals/fraud/:id/approve/
POST /api/admin/referrals/fraud/:id/reject/
```

## UI Components

### Referral Card Component (Dashboard)
```tsx
// frontend/src/components/ReferralCard.tsx
interface ReferralStats {
  code: string
  link: string
  clicks: number
  signups: number
  conversions: number
  credits_available: number
  credits_used: number
}

<ReferralCard
  code="DN-A7K9M"
  link="https://dieselnoi.com/signup?ref=DN-A7K9M"
  clicks={12}
  signups={7}
  conversions={5}
  creditsAvailable={50.00}
  creditsUsed={20.00}
/>
```

### Referral Banner (Signup Page)
```tsx
// Show when ?ref= parameter present
<ReferralBanner
  referrerName="Sarah"
  discount="20%"
  discountType="first month"
/>
```

### Credits Display (Checkout)
```tsx
<CreditsDisplay
  available={50.00}
  toApply={10.00}
  remaining={40.00}
  onToggle={() => {}}
/>
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database models (ReferralCode, Referral, ReferralCredit)
- [ ] Generate unique codes for existing users
- [ ] Basic API endpoints (get code, track click, validate)
- [ ] Admin: View referral data in Django admin

### Phase 2: Tracking & Rewards (Week 2)
- [ ] Track referral signup flow
- [ ] Stripe coupon integration (20% off)
- [ ] Credit issuance logic
- [ ] Credit application at checkout
- [ ] Fraud detection basic rules

### Phase 3: UI Implementation (Week 3)
- [ ] Dashboard referral card
- [ ] Signup page referral banner
- [ ] Referral history page
- [ ] Credits page
- [ ] Social sharing buttons
- [ ] Copy link functionality

### Phase 4: Notifications & Polish (Week 4)
- [ ] Email notifications (all types)
- [ ] In-app notifications
- [ ] Admin analytics dashboard
- [ ] Fraud review interface
- [ ] Testing and bug fixes

### Phase 5: Launch & Monitor
- [ ] Soft launch to existing users
- [ ] Monitor fraud patterns
- [ ] Track conversion rates
- [ ] Adjust rewards if needed
- [ ] Public announcement

## Success Metrics

### Target KPIs (First 90 Days)
- **Activation Rate**: 30% of active users create referral link
- **Click-to-Signup Rate**: 25%+ (industry standard: 15-20%)
- **Signup-to-Conversion**: 40%+ (industry standard: 30-40%)
- **Fraud Rate**: <5%
- **Credits Used**: 60%+ (shows credits are valuable)
- **Referee Retention**: 70%+ stay subscribed >90 days

### ROI Calculation
```
Cost per Referral = $10 credit per conversion
Average Course Price = $29/month
Referee LTV (12 months) = $348
ROI = ($348 - $10) / $10 = 33.8x

If only 50% of credits used:
Effective Cost = $5 per conversion
ROI = 67.6x

Industry average CAC: $50-100
Referral CAC: $10 (or $5 if 50% redemption)
Savings: 80-90% vs paid acquisition
```

## Future Enhancements

### Tiered Rewards
- Bronze: 1-5 conversions → $10 per conversion
- Silver: 6-15 conversions → $12 per conversion
- Gold: 16+ conversions → $15 per conversion

### Ambassador Program
- Top referrers (50+ conversions) get:
  - Free lifetime access to all courses
  - Exclusive content access
  - Ambassador badge on profile
  - Higher commission rate

### Group Referrals
- Share with groups (martial arts gyms, dojos)
- Custom landing pages for gym owners
- Bulk discount codes for gym members

### Affiliate Program
- Convert into full affiliate program for influencers
- Commission-based (10% of sales)
- Marketing materials provided
- Dedicated affiliate dashboard

## Technical Considerations

### Performance
- Index referral codes for fast lookup
- Cache referral stats (refresh every 5 minutes)
- Use Celery tasks for credit issuance (async)
- Rate limit referral link clicks (prevent spam)

### Security
- Validate referral codes server-side only
- Encrypt sensitive tracking data (IP, user agent)
- Implement CSRF protection on all endpoints
- Log all credit transactions for audit trail

### Compliance
- GDPR: Allow users to opt-out of referral program
- Terms: Update TOS to include referral program rules
- Tax: Credits may be considered taxable income (consult accountant)
- Transparency: Show referee what discount they're getting

## Questions to Resolve

1. **Credit Expiration**: 12 months or never expire?
   - Recommendation: 12 months (creates urgency, limits liability)

2. **Multiple Credits**: Can user stack multiple $10 credits?
   - Recommendation: Yes, up to full course price

3. **Refunds**: What if referee cancels within 7 days?
   - Recommendation: Revoke referrer's credit, 7-day holding period

4. **Self-Referral**: Block completely or allow with different reward?
   - Recommendation: Block completely (fraud risk)

5. **Existing Users**: Retroactive referral codes?
   - Recommendation: Yes, all users get codes from launch

6. **Course-Specific**: Different rewards per course tier?
   - Recommendation: Start simple (flat $10), optimize later

---

## Summary

The referral program is designed to:
- **Reward engaged users** for organic growth
- **Lower customer acquisition costs** by 80-90%
- **Increase retention** through community building
- **Prevent fraud** with automated checks
- **Scale sustainably** with credit-based rewards

Estimated impact: 20-30% of new signups from referrals within 6 months.
