from django.db import models
from students.models import Student

class Attendance(models.Model):
    STATUS = [('Present','Present'),('Absent','Absent'),
            ('Late','Late'),('Excused','Excused')]

    student      = models.ForeignKey(Student, on_delete=models.CASCADE)
    student_name = models.CharField(max_length=200, blank=True)
    grade        = models.CharField(max_length=20, blank=True)
    date         = models.DateField()
    status       = models.CharField(max_length=10, choices=STATUS)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'date')