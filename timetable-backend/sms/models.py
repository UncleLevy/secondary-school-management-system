from django.conf import settings
from django.db import models


class SMSLog(models.Model):
    KINDS = [
        ('Timetable', 'Timetable'),
        ('Clash Alert', 'Clash Alert'),
        ('Custom', 'Custom'),
        ('Parent Message', 'Parent Message'),
    ]
    STATUS = [('Sent', 'Sent'), ('Failed', 'Failed')]

    recipient_name = models.CharField(max_length=200, blank=True)
    phone          = models.CharField(max_length=30)
    body           = models.TextField()
    kind           = models.CharField(max_length=20, choices=KINDS, default='Custom')
    status         = models.CharField(max_length=10, choices=STATUS)
    provider_sid   = models.CharField(max_length=64, blank=True)
    error          = models.TextField(blank=True)
    sent_by        = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='+')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.kind} → {self.recipient_name or self.phone} ({self.status})"
