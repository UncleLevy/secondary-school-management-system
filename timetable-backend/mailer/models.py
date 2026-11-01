from django.conf import settings
from django.db import models


class EmailLog(models.Model):
    KINDS = [
        ('Timetable', 'Timetable'),
        ('Clash Alert', 'Clash Alert'),
        ('Custom', 'Custom'),
    ]
    STATUS = [('Sent', 'Sent'), ('Failed', 'Failed')]

    recipient_name = models.CharField(max_length=200, blank=True)
    email          = models.EmailField()
    subject        = models.CharField(max_length=200)
    body           = models.TextField()
    kind           = models.CharField(max_length=20, choices=KINDS, default='Custom')
    status         = models.CharField(max_length=10, choices=STATUS)
    error          = models.TextField(blank=True)
    sent_by        = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='+')
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.kind} → {self.recipient_name or self.email} ({self.status})"
