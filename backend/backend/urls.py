"""
URL configuration for backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

urlpatterns = [
    path('', RedirectView.as_view(url=settings.FRONTEND_URL, permanent=False)),  # Redirect root to frontend
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('accounts/', include('allauth.urls')),  # Allauth URLs for email verification and social auth
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
