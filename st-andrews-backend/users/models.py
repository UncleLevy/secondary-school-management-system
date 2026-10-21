from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLES = [
        ('admin',      'Admin'),
        ('management', 'Management'),
        ('teacher',    'Teacher'),
    ]
    role = models.CharField(max_length=20, choices=ROLES, default='teacher')

    def save(self, *args, **kwargs):
        if self.is_superuser and self.role != 'admin':
            self.role = 'admin'
        super().save(*args, **kwargs)