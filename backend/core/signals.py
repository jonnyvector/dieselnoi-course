"""
Signals for the core app.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import CourseReview, User, Subscription, Referral, ReferralCode, ReferralCredit, ReferralFraudCheck


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
    """Automatically create referral code for new users."""
    if created:
        ReferralCode.objects.get_or_create(
            user=instance,
            defaults={'code': ReferralCode.generate_code()}
        )


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
                    ReferralCredit.objects.get_or_create(
                        referral=referral,
                        defaults={
                            'user': referral.referrer,
                            'amount': 10.00,
                            'expires_at': expires_at
                        }
                    )
                    referral.status = 'rewarded'
                    referral.save()
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
