from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django_ratelimit.exceptions import Ratelimited


def custom_exception_handler(exc, context):
    """Custom exception handler that handles rate limiting."""

    # Handle rate limiting
    if isinstance(exc, Ratelimited):
        return Response(
            {
                'error': 'Rate limit exceeded. Please try again later.',
                'detail': 'Too many requests. Please slow down.'
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # Call REST framework's default exception handler for other exceptions
    return exception_handler(exc, context)
