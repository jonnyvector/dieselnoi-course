"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.utils.functional import lazy

get_frontend_url = lazy(lambda: settings.FRONTEND_URL, str)

urlpatterns = [
    path('', RedirectView.as_view(url=get_frontend_url(), permanent=False)),  # Redirect root to frontend
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('accounts/', include('allauth_2fa.urls')),  # Allauth 2FA URLs (includes allauth.urls)
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
