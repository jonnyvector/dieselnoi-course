"""
Health check endpoints for monitoring and uptime tracking.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import time


class HealthCheckView(APIView):
    """
    Simple health check endpoint for monitoring services.
    Returns 200 OK if the service is healthy.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Basic health check - service is responding."""
        return Response({
            'status': 'healthy',
            'timestamp': time.time()
        }, status=status.HTTP_200_OK)


class DetailedHealthCheckView(APIView):
    """
    Detailed health check that verifies database and cache connectivity.
    Use this for comprehensive monitoring.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Comprehensive health check including dependencies."""
        health_status = {
            'status': 'healthy',
            'timestamp': time.time(),
            'checks': {}
        }

        overall_healthy = True

        # Check database connectivity
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            health_status['checks']['database'] = {'status': 'healthy'}
        except Exception as e:
            health_status['checks']['database'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
            overall_healthy = False

        # Check cache connectivity
        try:
            cache_key = 'health_check_test'
            cache.set(cache_key, 'test', 10)
            cache_value = cache.get(cache_key)
            if cache_value == 'test':
                health_status['checks']['cache'] = {'status': 'healthy'}
            else:
                health_status['checks']['cache'] = {
                    'status': 'degraded',
                    'message': 'Cache write/read mismatch'
                }
        except Exception as e:
            health_status['checks']['cache'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
            # Cache failure is degraded, not critical
            health_status['checks']['cache']['severity'] = 'warning'

        # Check critical environment variables
        critical_vars = ['STRIPE_SECRET_KEY', 'MUX_TOKEN_ID']
        missing_vars = [var for var in critical_vars if not getattr(settings, var, None)]

        if missing_vars:
            health_status['checks']['config'] = {
                'status': 'warning',
                'missing_variables': missing_vars
            }
        else:
            health_status['checks']['config'] = {'status': 'healthy'}

        # Set overall status
        health_status['status'] = 'healthy' if overall_healthy else 'unhealthy'

        response_status = status.HTTP_200_OK if overall_healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_status, status=response_status)
