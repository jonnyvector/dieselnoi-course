# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
import stripe
from django.conf import settings


class Command(BaseCommand):
    help = 'Create Stripe coupon for referral discount'

    def handle(self, *args, **options):
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            # Check if coupon already exists
            try:
                coupon = stripe.Coupon.retrieve('referral-20-off')
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Coupon already exists: {coupon.id}')
                )
                return
            except stripe.error.InvalidRequestError:
                pass  # Coupon doesn't exist, create it

            # Create the coupon
            coupon = stripe.Coupon.create(
                id='referral-20-off',
                percent_off=20,
                duration='once',  # First month only
                name='Referral Discount - 20% Off First Month',
                max_redemptions=None  # Unlimited
            )

            self.stdout.write(
                self.style.SUCCESS(f'✓ Created Stripe coupon: {coupon.id} ({coupon.percent_off}% off)')
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Failed to create coupon: {str(e)}')
            )
