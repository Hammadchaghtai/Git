from django.apps import AppConfig


class ComplianceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "compliance"
    verbose_name = "GRC Compliance Engine"

    def ready(self):
        """Register a post_migrate hook to sync the Celery Beat schedule."""
        from django.db.models.signals import post_migrate
        post_migrate.connect(self._sync_schedule, sender=self)

    @staticmethod
    def _sync_schedule(sender, **kwargs):
        try:
            from compliance.scheduler import sync_celery_beat_schedule
            sync_celery_beat_schedule()
        except Exception:
            pass

