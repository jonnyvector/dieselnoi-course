# Achievement Badges System

## Overview
Implement a gamification system where users earn badges for completing specific achievements. Badges will be displayed on the user's dashboard and (optionally) on a public profile.

---

## Badge Definitions

### Starter Badges
- **First Steps** 🥋 - Complete your first lesson
- **Getting Started** 📚 - Complete 5 lessons
- **Committed Learner** 💪 - Complete 10 lessons

### Course Completion Badges
- **Course Complete** ✅ - Complete any course (100%)
- **Completionist** 🏆 - Complete all available courses

### Engagement Badges
- **Conversation Starter** 💬 - Leave your first comment
- **Active Member** 🗣️ - Leave 10 comments
- **Community Helper** ⭐ - Get 25+ combined likes/replies on comments (future enhancement)

### Watch Time Badges
- **Dedicated Student** ⏱️ - Watch 10 hours of content
- **Marathon Trainer** 🎬 - Watch 50 hours of content
- **Master Student** 👑 - Watch 100 hours of content

### Speed Badges
- **Early Bird** 🌅 - Complete a course within 7 days of subscribing
- **Speed Demon** ⚡ - Complete a course within 3 days of subscribing

### Streak Badges (Phase 2 - requires streak system)
- **Week Warrior** 🔥 - 7 day streak
- **Monthly Master** 📅 - 30 day streak
- **Unstoppable** 🚀 - 100 day streak

---

## Database Schema

### Badge Model
```python
class Badge(models.Model):
    """Defines a badge that can be earned."""
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50)  # Emoji or icon class
    category = models.CharField(max_length=50)  # starter, completion, engagement, watch_time, speed
    created_at = models.DateTimeField(auto_now_add=True)
```

### UserBadge Model
```python
class UserBadge(models.Model):
    """Tracks which badges a user has earned."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='earned_badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']
```

---

## Backend Implementation

### Management Command
Create `python manage.py create_badges` to populate initial badges in the database.

### Badge Checking Logic
Create a service/utility file `badge_checker.py` with functions:
- `check_and_award_badges(user)` - Check all badge criteria and award if met
- `award_badge(user, badge_name)` - Award specific badge to user

### Triggers (when to check for badges)
- After lesson marked complete → check lesson count badges
- After comment created → check comment badges
- After course completed → check course completion badges
- Periodic task (daily?) → check watch time badges

### API Endpoints
- `GET /api/badges/` - List all available badges
- `GET /api/badges/my-badges/` - Get current user's earned badges
- `GET /api/users/{id}/badges/` - Get badges for specific user (public profiles)

---

## Frontend Implementation

### Dashboard Section
Add "Achievements" section to dashboard:
- Grid layout of badge icons
- Earned badges: Full color + name + earned date
- Unearned badges: Grayscale/locked icon + "???" or name + description
- Show progress toward next badge (e.g., "3/5 lessons completed")

### Badge Notification
When badge is earned:
- Toast notification: "Achievement Unlocked! 🏆 [Badge Name]"
- Animate badge on dashboard (sparkle/glow effect)

### Optional Enhancements
- Badge detail modal showing all earners
- Share badge to social media
- Public user profile showing badges

---

## Implementation Phases

### Phase 1: Core System (MVP)
1. Create Badge and UserBadge models
2. Create management command to populate badges
3. Create badge checking service
4. Add triggers after lesson/course completion
5. Create API endpoints
6. Add "Achievements" section to dashboard
7. Add toast notifications

### Phase 2: Advanced Features
1. Add comment-based badges
2. Add watch time tracking and badges
3. Add speed/date-based badges
4. Add progress indicators
5. Add badge sharing

---

## Open Questions
1. Should unearned badges be visible (with locked state) or hidden until earned?
2. Do we want badge rarity tiers (common, rare, epic, legendary)?
3. Should badges be retroactive (award for past achievements)?
4. Do we want a public profile page showing badges?
5. Should there be a global "Recent Badges Earned" feed?

---

## Notes
- Keep badge criteria simple and automatic (no manual admin awards for MVP)
- Focus on positive reinforcement (no negative badges)
- Make sure checking logic is efficient (don't recalculate on every page load)
- Consider caching badge counts/status
