from django.db import models
from teachers.models import GRADES, SECTIONS, SUBJECTS

DAYS = [
    ('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'),
    ('Thursday', 'Thursday'), ('Friday', 'Friday'),
]

class TimetableSlot(models.Model):
    day          = models.CharField(max_length=10, choices=DAYS)
    period       = models.IntegerField()
    start_time   = models.CharField(max_length=10, blank=True)
    end_time     = models.CharField(max_length=10, blank=True)
    subject      = models.CharField(max_length=50, choices=SUBJECTS)
    teacher_name = models.CharField(max_length=200)
    grade        = models.CharField(max_length=20, choices=GRADES)
    section      = models.CharField(max_length=5, choices=SECTIONS, blank=True)
    room         = models.CharField(max_length=100, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['day', 'period']

    def __str__(self):
        return f"{self.day} P{self.period} — {self.subject} ({self.grade}{self.section})"
