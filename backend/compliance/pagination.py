"""
compliance/pagination.py
────────────────────────
Custom DRF pagination that accepts a `page_size` query parameter
from the frontend, capped at 500 to prevent abuse.
"""

from rest_framework.pagination import PageNumberPagination


class FlexiblePagePagination(PageNumberPagination):
    """
    Allows the client to override page size via ?page_size=N.
    Defaults to PAGE_SIZE from settings (20).
    Maximum allowed is 500.
    """
    page_size_query_param = "page_size"
    max_page_size = 500
