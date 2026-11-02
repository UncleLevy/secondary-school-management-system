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


def mask_email(email):
    name, _, domain = email.partition('@')
    return f"{name[:2]}{'*' * max(1, len(name) - 2)}@{domain}"


def mask_phone(phone):
    return f"{phone[:4]}{'*' * max(1, len(phone) - 7)}{phone[-3:]}"


def teacher_phone(user):
    """The phone number on the teacher record that shares this user's email, in +E.164."""
    from sms import service as sms
    from teachers.models import Teacher
    if not user.email:
        return ''
    teacher = Teacher.objects.filter(user_email__iexact=user.email, status='Active').first()
    return sms.normalize_phone(teacher.phone) if teacher and teacher.phone else ''


def _sms_ready(phone):
    from sms import service as sms
    return bool(phone) and sms.is_configured()


def channels_for(user):
    """Where a code for this user can go: [('email', address), ('sms', +phone)]."""
    out = []
    if user.email and mail.is_valid_email(user.email):
        out.append(('email', user.email))
    phone = teacher_phone(user)
    if _sms_ready(phone):
        out.append(('sms', phone))
    return out


def required_for_login(user):
    """Teachers (and any role in OTP_LOGIN_ROLES, or everyone if OTP_LOGIN_REQUIRED) need a code."""
    return settings.OTP_LOGIN_REQUIRED or user.role in settings.OTP_LOGIN_ROLES


def issue(user, purpose):
    """Generate a code and send it by every channel available (email and, for teachers with a
    phone number on file, SMS). Returns [{'channel', 'hint'}] for the channels that worked.
    Older codes stop working. Raises OTPError if the code could not be delivered anywhere."""
    wait = seconds_until_resend(user, purpose)
    if wait:
        raise OTPError(f'Please wait {wait} seconds before asking for another code.')
    from sms import service as sms
    code = ''.join(secrets.choice('0123456789') for _ in range(settings.OTP_LENGTH))
    subject_part, action = PURPOSE_TEXT[purpose]
    name = user.get_full_name() or user.username
    body = (f"Hello {name},\n\n"
            f"Your code to {action} is: {code}\n\n"
            f"It expires in {settings.OTP_TTL_MINUTES} minutes. "
            f"If you did not ask for it, you can ignore this email.\n\n"
            f"{settings.SCHOOL_NAME}")
    sms_body = (f"{settings.SCHOOL_NAME}: your code to {action} is {code}. "
                f"It expires in {settings.OTP_TTL_MINUTES} minutes. Do not share it.")
    delivered = []
    for channel, target in channels_for(user):
        try:
            if channel == 'email':
                mail.send_email(
                    target, f"{settings.SCHOOL_NAME}: {subject_part}", body, code=code,
                    greeting=f"Hello {name},", intro=f"Use this code to {action}:",
                    note=f"It expires in {settings.OTP_TTL_MINUTES} minutes and works once. "
                         f"If you did not ask for it, you can ignore this email.")
                delivered.append({'channel': 'email', 'hint': mask_email(target)})
            else:
                sms.send_sms(target, sms_body)
                delivered.append({'channel': 'sms', 'hint': mask_phone(target)})
        except (mail.EmailError, sms.SMSError):
            continue          # try the other channel; the codes are not written to any log
    if not delivered:
        raise OTPError('We could not send your code. Please try again later or '
                       'ask an administrator to check the email and SMS settings.')
    OneTimeCode.objects.filter(user=user, purpose=purpose, used=False).update(used=True)
    OneTimeCode.objects.create(user=user, purpose=purpose, code_hash=make_password(code))
    return delivered


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
