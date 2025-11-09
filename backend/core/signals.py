"""
Signals for the core app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import CourseReview, User, Subscription, Referral, ReferralCode, ReferralCredit, ReferralFraudCheck, LessonProgress
from . import emails


@receiver(post_save, sender=CourseReview)
def update_course_rating_on_save(sender, instance, **kwargs):
    """Update course rating cache when a review is created or updated."""
    instance.course.update_rating_cache()


@receiver(post_delete, sender=CourseReview)
def update_course_rating_on_delete(sender, instance, **kwargs):
    """Update course rating cache when a review is deleted."""
    instance.course.update_rating_cache()


@receiver(post_save, sender=User)
def create_referral_code(sender, instance, created, **kwargs):
    """Automatically create referral code for new users and send welcome email."""
    if created:
        # Create referral code
        ReferralCode.objects.get_or_create(
            user=instance,
            defaults={'code': ReferralCode.generate_code()}
        )

        # Send welcome email (unless they were referred, then they get a different email)
        try:
            has_referral = Referral.objects.filter(referee=instance).exists()
            if not has_referral:
                emails.send_welcome_email(instance)
        except Exception as e:
            print(f"Error sending welcome email: {e}")


@receiver(post_save, sender=Subscription)
def track_referral_conversion(sender, instance, created, **kwargs):
    """Track when a referred user subscribes (conversion)."""
    if created and instance.status == 'active':
        # Check if this user was referred
        try:
            referral = Referral.objects.filter(
                referee=instance.user,
                status__in=['clicked', 'signed_up']
            ).first()

            if referral:
                # Update referral status to converted
                referral.status = 'converted'
                referral.first_subscription_at = timezone.now()
                referral.save()

                # Run fraud check
                fraud_check, fraud_created = ReferralFraudCheck.objects.get_or_create(
                    referral=referral,
                    defaults={'fraud_score': 0}
                )

                if fraud_created:
                    # Calculate fraud score
                    score = calculate_fraud_score(referral)
                    fraud_check.fraud_score = score
                    fraud_check.auto_review()

                # Only issue credit if approved
                if fraud_check.status == 'approved':
                    # Issue credit to referrer
                    expires_at = timezone.now() + timedelta(days=365)  # 12 months
                    credit, credit_created = ReferralCredit.objects.get_or_create(
                        referral=referral,
                        defaults={
                            'user': referral.referrer,
                            'amount': 10.00,
                            'expires_at': expires_at
                        }
                    )
                    referral.status = 'rewarded'
                    referral.save()

                    # Send email to referrer about earned credits
                    if credit_created:
                        try:
                            from django.db.models import Sum
                            # Calculate total credits
                            total_credits = ReferralCredit.objects.filter(
                                user=referral.referrer,
                                used=False,
                                expires_at__gt=timezone.now()
                            ).aggregate(total=Sum('amount'))['total'] or 0

                            # Get referral link
                            ref_code = referral.referrer.referral_code
                            from django.conf import settings
                            referral_link = f"{settings.FRONTEND_URL}/signup?ref={ref_code.code}"

                            emails.send_referrer_credit_earned(
                                referrer=referral.referrer,
                                referee=referral.referee,
                                course=instance.course,
                                total_credits=total_credits,
                                expiration_date=expires_at,
                                referral_link=referral_link
                            )
                        except Exception as e:
                            print(f"Error sending credit earned email: {e}")
        except Exception as e:
            # Log error but don't fail the subscription creation
            print(f"Error tracking referral conversion: {e}")


def calculate_fraud_score(referral):
    """Calculate fraud risk score (0-100)."""
    score = 0

    # Check same IP
    if referral.ip_address:
        same_ip_count = Referral.objects.filter(
            referrer__referral_code__code=referral.code_used,
            ip_address=referral.ip_address
        ).exclude(id=referral.id).count()

        if same_ip_count > 0:
            score += 30
            fraud_check = ReferralFraudCheck.objects.get(referral=referral)
            fraud_check.same_ip = True
            fraud_check.save()

    # Check rapid signups (more than 5 in 24 hours)
    day_ago = timezone.now() - timedelta(hours=24)
    recent_referrals = Referral.objects.filter(
        referrer=referral.referrer,
        created_at__gte=day_ago
    ).count()

    if recent_referrals > 5:
        score += 25
        fraud_check = ReferralFraudCheck.objects.get(referral=referral)
        fraud_check.rapid_signup = True
        fraud_check.save()

    # Check disposable email
    if referral.referee:
        disposable_domains = ['tempmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com']
        email_domain = referral.referee.email.split('@')[1] if '@' in referral.referee.email else ''

        if email_domain in disposable_domains:
            score += 40
            fraud_check = ReferralFraudCheck.objects.get(referral=referral)
            fraud_check.disposable_email = True
            fraud_check.save()

    return min(score, 100)  # Cap at 100


@receiver(post_save, sender=Referral)
def send_referral_emails(sender, instance, created, **kwargs):
    """Send emails when referral status changes."""
    try:
        # Send email to referrer when friend signs up
        if instance.status == 'signed_up' and instance.referee:
            ref_code = instance.referrer.referral_code
            from django.conf import settings
            referral_link = f"{settings.FRONTEND_URL}/signup?ref={ref_code.code}"

            # Email to referrer
            emails.send_referrer_signup_notification(
                referrer=instance.referrer,
                referee=instance.referee,
                referral_link=referral_link
            )

            # Welcome email to referee
            emails.send_referee_welcome_email(
                referee=instance.referee,
                referrer=instance.referrer
            )
    except Exception as e:
        print(f"Error sending referral emails: {e}")


@receiver(post_save, sender=LessonProgress)
def check_course_completion(sender, instance, **kwargs):
    """Send congratulations email when user completes a course."""
    if instance.is_completed:
        try:
            # Check if this completion marks 100% course completion
            course = instance.lesson.course
            total_lessons = course.lessons.count()
            completed_lessons = LessonProgress.objects.filter(
                user=instance.user,
                lesson__course=course,
                is_completed=True
            ).count()

            # Send email only once when course reaches 100%
            if completed_lessons == total_lessons:
                # Check if we've already sent the email (prevent duplicates)
                from django.core.cache import cache
                cache_key = f'course_complete_email_{instance.user.id}_{course.id}'
                if not cache.get(cache_key):
                    emails.send_course_completion_email(
                        user=instance.user,
                        course=course
                    )
                    # Cache for 7 days to prevent duplicate emails
                    cache.set(cache_key, True, 60 * 60 * 24 * 7)
        except Exception as e:
            print(f"Error sending course completion email: {e}")
