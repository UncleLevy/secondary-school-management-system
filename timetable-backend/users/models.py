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


class OneTimeCode(models.Model):
    """A short-lived emailed passcode. Only a hash of the code is stored."""
    PURPOSES = [('login', 'Sign-in'), ('reset', 'Password reset')]

    user       = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='otp_codes')
    purpose    = models.CharField(max_length=10, choices=PURPOSES)
    code_hash  = models.CharField(max_length=128)
    attempts   = models.PositiveSmallIntegerField(default=0)
    used       = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
