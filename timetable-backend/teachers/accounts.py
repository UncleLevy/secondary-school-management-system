"""Login accounts for teachers.

A teacher's account is a User with role 'teacher' whose email matches the
Teacher profile's email. Only teacher-role users are ever touched here, so
admin and management accounts can never be changed through these helpers.
"""
import secrets
import string

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()
_ALPHABET = ''.join(c for c in string.ascii_letters + string.digits if c not in 'l1IO0o')


def generate_password(length=10):
    return ''.join(secrets.choice(_ALPHABET) for _ in range(length))


def get_account(teacher):
    return User.objects.filter(email__iexact=teacher.user_email, role='teacher').first()


def email_taken_by_other_role(teacher):
    return User.objects.filter(email__iexact=teacher.user_email).exclude(role='teacher').exists() or \
        User.objects.filter(username__iexact=teacher.user_email).exclude(role='teacher').exists()


def create_account(teacher, password=None):
    """Returns (user, password). Raises ValueError / ValidationError on bad input."""
    if get_account(teacher):
        raise ValueError('This teacher already has an account.')
    if email_taken_by_other_role(teacher) or \
            User.objects.filter(username__iexact=teacher.user_email).exists():
        raise ValueError('That email is already used by another account.')
    password = password or generate_password()
    validate_password(password)
    first, _, last = teacher.full_name.strip().partition(' ')
    user = User.objects.create_user(
        username=teacher.user_email.lower(), email=teacher.user_email,
        password=password, role='teacher', first_name=first, last_name=last,
        is_active=teacher.status == 'Active',
    )
    return user, password


def reset_password(user, password=None):
    password = password or generate_password()
    validate_password(password, user)
    user.set_password(password)
    user.save(update_fields=['password'])
    return password


def sync_email(user, teacher):
    """Keep the login in step when the teacher's email or name changes."""
    first, _, last = teacher.full_name.strip().partition(' ')
    user.email = teacher.user_email
    user.username = teacher.user_email.lower()
    user.first_name, user.last_name = first, last
    user.save(update_fields=['email', 'username', 'first_name', 'last_name'])
