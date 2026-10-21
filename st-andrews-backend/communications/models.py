from django.db import models
from students.models import Student

class ParentMessage(models.Model):
    CHANNELS = [('Email','Email'),('SMS','SMS')]
    MESSAGE_TYPES = [
        ('Academic Summary','Academic Summary'),
        ('Attendance Alert','Attendance Alert'),
        ('At-Risk Notice','At-Risk Notice'),
        ('General Notice','General Notice'),
    ]
    STATUS = [('Sent','Sent'),('Failed','Failed'),('Pending','Pending')]

    student        = models.ForeignKey(Student, on_delete=models.CASCADE)
    student_name   = models.CharField(max_length=200)
    grade          = models.CharField(max_length=20, blank=True)
    guardian_name  = models.CharField(max_length=150, blank=True)
    guardian_email = models.EmailField(blank=True)
    channel        = models.CharField(max_length=10, choices=CHANNELS)
    message_type   = models.CharField(max_length=30, choices=MESSAGE_TYPES)
    subject        = models.CharField(max_length=255)
    body           = models.TextField()
    status         = models.CharField(max_length=10, choices=STATUS, default='Pending')
    sent_at        = models.DateTimeField(null=True, blank=True)
    term           = models.CharField(max_length=20, blank=True)
    year           = models.IntegerField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.message_type} → {self.student_name} ({self.status})"