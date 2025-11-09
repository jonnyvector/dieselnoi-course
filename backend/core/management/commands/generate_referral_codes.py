# -*- coding: utf-8 -*-
from django.core.management.base import BaseCommand
from core.models import User, ReferralCode


class Command(BaseCommand):
    help = 'Generate referral codes for users who do not have one'

    def handle(self, *args, **options):
        users_without_codes = User.objects.filter(referral_code__isnull=True)
        count = users_without_codes.count()

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('All users already have referral codes!')
            )
            return

        self.stdout.write(f'Generating referral codes for {count} users...')

        created_count = 0
        for user in users_without_codes:
            code = ReferralCode.generate_code()
            ReferralCode.objects.create(user=user, code=code)
            created_count += 1
            self.stdout.write(
                self.style.SUCCESS(f'✓ Created code {code} for {user.username}')
            )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nTotal: {created_count} referral codes generated'
            )
        )
