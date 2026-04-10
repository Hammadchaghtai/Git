"""
URL configuration for core project.

Includes the DRF router, SimpleJWT token endpoints, and the
custom /api/auth/me/ endpoint for fetching the current user's profile.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # ── Compliance API ──
    path("api/", include("compliance.urls")),

    # ── JWT Auth ──
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # ── Custom auth endpoints (me, etc.) live in compliance.urls ──
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
