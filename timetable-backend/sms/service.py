"""Twilio SMS delivery.

Credentials come from environment variables (see .env.example). Until they are
set, `is_configured()` is False and `send_sms` raises SMSNotConfigured, so the
rest of the app keeps working without Twilio.
"""
import re

from django.conf import settings


class SMSError(Exception):
    """The message could not be sent."""


class SMSNotConfigured(SMSError):
    """Twilio credentials have not been provided."""


def is_configured():
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and (settings.TWILIO_MESSAGING_SERVICE_SID or settings.TWILIO_FROM_NUMBER)
    )


def normalize_phone(raw):
    """Return the number in E.164 form (e.g. +260971234567), or None if invalid.

    Local numbers starting with 0 get the default country code (Zambia, 260).
    """
    if not raw:
        return None
    digits = re.sub(r'[^\d+]', '', str(raw).strip())
    if digits.startswith('00'):
        digits = '+' + digits[2:]
    if digits.startswith('+'):
        number = digits
    elif digits.startswith('0'):
        number = '+' + settings.SMS_DEFAULT_COUNTRY_CODE + digits[1:]
    elif digits.startswith(settings.SMS_DEFAULT_COUNTRY_CODE):
        number = '+' + digits
    else:
        return None
    return number if re.fullmatch(r'\+\d{8,15}', number) else None


def _client():
    from twilio.rest import Client
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


def send_sms(to, body):
    """Send one SMS and return Twilio's message SID."""
    if not is_configured():
        raise SMSNotConfigured(
            'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and '
            'TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID) in the backend .env file.'
        )
    number = normalize_phone(to)
    if not number:
        raise SMSError(f'"{to}" is not a valid phone number.')

    params = {'to': number, 'body': body}
    if settings.TWILIO_MESSAGING_SERVICE_SID:
        params['messaging_service_sid'] = settings.TWILIO_MESSAGING_SERVICE_SID
    else:
        params['from_'] = settings.TWILIO_FROM_NUMBER
    try:
        message = _client().messages.create(**params)
    except Exception as exc:  # Twilio raises TwilioRestException; network errors vary
        raise SMSError(str(exc)) from exc
    return message.sid
