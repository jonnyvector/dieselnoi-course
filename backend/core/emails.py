"""
Email sending utilities for Dieselnoi Muay Thai platform.
Uses Django templates for HTML emails.
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags


def send_template_email(to_email, subject, template_name, context):
    """
    Send an HTML email using a Django template.

    Args:
        to_email: Recipient email address (string or list)
        subject: Email subject line
        template_name: Name of the template file (e.g., 'referrer_signup.html')
        context: Dictionary of template variables
    """
    # Ensure to_email is a list
    if isinstance(to_email, str):
        to_email = [to_email]

    # Add base URL to context for links
    context['base_url'] = settings.FRONTEND_URL

    # Render HTML email
    html_content = render_to_string(f'emails/{template_name}', context)
    text_content = strip_tags(html_content)  # Fallback plain text

    # Create email
    email = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=to_email
    )
    email.attach_alternative(html_content, "text/html")

    # Send email
    try:
        email.send()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


# Referral Emails

def send_referrer_signup_notification(referrer, referee, referral_link):
    """
    Notify referrer that their friend signed up.
    """
    context = {
        'referrer_name': referrer.first_name or referrer.username,
        'referee_name': referee.first_name or referee.username,
        'referral_link': referral_link,
    }

    return send_template_email(
        to_email=referrer.email,
        subject=f"Your friend {referee.first_name or referee.username} just signed up! 🎉",
        template_name='referrer_signup.html',
        context=context
    )


def send_referrer_credit_earned(referrer, referee, course, total_credits, expiration_date, referral_link):
    """
    Notify referrer that they earned credits.
    """
    context = {
        'referrer_name': referrer.first_name or referrer.username,
        'referee_name': referee.first_name or referee.username,
        'course_name': course.title,
        'total_credits': f"{total_credits:.2f}",
        'expiration_date': expiration_date.strftime('%B %d, %Y'),
        'referral_link': referral_link,
        'dashboard_url': f"{settings.FRONTEND_URL}/dashboard",
    }

    return send_template_email(
        to_email=referrer.email,
        subject="You earned $10 in credits! 💰",
        template_name='referrer_credit_earned.html',
        context=context
    )


def send_referee_welcome_email(referee, referrer):
    """
    Welcome email for referred users.
    """
    context = {
        'referee_name': referee.first_name or referee.username,
        'referrer_name': referrer.first_name or referrer.username,
        'courses_url': f"{settings.FRONTEND_URL}/",
    }

    return send_template_email(
        to_email=referee.email,
        subject="Welcome! Here's your 20% discount 🥊",
        template_name='referee_welcome.html',
        context=context
    )


# General Emails

def send_welcome_email(user):
    """
    Welcome email for new users.
    """
    context = {
        'user_name': user.first_name or user.username,
        'courses_url': f"{settings.FRONTEND_URL}/",
        'referral_url': f"{settings.FRONTEND_URL}/dashboard",
    }

    return send_template_email(
        to_email=user.email,
        subject="Welcome to Dieselnoi Muay Thai! 🥊",
        template_name='welcome.html',
        context=context
    )


def send_course_completion_email(user, course):
    """
    Congratulations email when user completes a course.
    """
    context = {
        'user_name': user.first_name or user.username,
        'course_name': course.title,
        'certificate_url': f"{settings.FRONTEND_URL}/courses/{course.slug}",
    }

    return send_template_email(
        to_email=user.email,
        subject=f"Congratulations! {course.title} Completed 🏆",
        template_name='course_completed.html',
        context=context
    )
