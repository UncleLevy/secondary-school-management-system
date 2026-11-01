"""Create, email and check one-time passcodes."""
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone

from mailer import service as mail
from .models import OneTimeCode

PURPOSE_TEXT = {
    'login': ('your sign-in code', 'sign in'),
    'reset': ('your password reset code', 'reset your password'),
}


class OTPError(Exception):
    """Raised with a message that is safe to show to the user."""


def _ttl():
    return timedelta(minutes=settings.OTP_TTL_MINUTES)


def seconds_until_resend(user, purpose):
    last = OneTimeCode.objects.filter(user=user, purpose=purpose).first()
    if not last:
        return 0
    wait = settings.OTP_RESEND_SECONDS - (timezone.now() - last.created_at).total_seconds()
    return max(0, int(wait + 0.999))


def issue(user, purpose):
    """Generate a code, email it, and return nothing. Older codes stop working."""
    wait = seconds_until_resend(user, purpose)
    if wait:
        raise OTPError(f'Please wait {wait} seconds before asking for another code.')
    code = ''.join(secrets.choice('0123456789') for _ in range(settings.OTP_LENGTH))
    subject_part, action = PURPOSE_TEXT[purpose]
    body = (f"Hello {user.get_full_name() or user.username},\n\n"
            f"Your code to {action} is: {code}\n\n"
            f"It expires in {settings.OTP_TTL_MINUTES} minutes. "
            f"If you did not ask for it, you can ignore this email.\n\n"
            f"{settings.SCHOOL_NAME}")
    try:
        mail.send_email(user.email, f"{settings.SCHOOL_NAME}: {subject_part}", body)
    except mail.EmailError as exc:
        raise OTPError('We could not send the email. Please try again later or '
                       'ask an administrator to check the email settings.') from exc
    OneTimeCode.objects.filter(user=user, purpose=purpose, used=False).update(used=True)
    OneTimeCode.objects.create(user=user, purpose=purpose, code_hash=make_password(code))


def verify(user, purpose, code):
    """Consume the newest code if it matches. Raises OTPError otherwise."""
    otp = OneTimeCode.objects.filter(user=user, purpose=purpose, used=False).first()
    bad = OTPError('That code is incorrect or has expired.')
    if otp is None or timezone.now() - otp.created_at > _ttl():
        raise bad
    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.used = True
        otp.save(update_fields=['used'])
        raise OTPError('Too many wrong attempts. Please request a new code.')
    otp.attempts += 1
    if not check_password((code or '').strip(), otp.code_hash):
        otp.save(update_fields=['attempts'])
        raise bad
    otp.used = True
    otp.save(update_fields=['attempts', 'used'])
