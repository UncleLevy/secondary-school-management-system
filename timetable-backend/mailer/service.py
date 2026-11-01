"""Thin wrapper over Django's mail framework so errors become one exception type."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email


class EmailError(Exception):
    pass


def is_valid_email(address):
    try:
        validate_email((address or '').strip())
        return True
    except ValidationError:
        return False


def is_configured():
    """True when real delivery is set up (SMTP with a login) or the console backend is used."""
    if 'smtp' in settings.EMAIL_BACKEND:
        return bool(settings.EMAIL_HOST and settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)
    return True


def is_real_delivery():
    return 'smtp' in settings.EMAIL_BACKEND


def send_email(to, subject, body):
    to = (to or '').strip()
    if not is_valid_email(to):
        raise EmailError('Invalid email address')
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
    except Exception as exc:  # smtplib / socket errors vary widely
        raise EmailError(str(exc) or exc.__class__.__name__) from exc
