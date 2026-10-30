"""SMS delivery through Africa's Talking (default) or Twilio.

The provider is chosen with SMS_PROVIDER ("africastalking" or "twilio").
Credentials come from environment variables (see .env.example). Until they are
set, `is_configured()` is False and `send_sms` raises SMSNotConfigured, so the
rest of the app keeps working without an SMS provider.
"""
import json
import re
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings


class SMSError(Exception):
    """The message could not be sent."""


class SMSNotConfigured(SMSError):
    """SMS provider credentials have not been provided."""


AT_LIVE_URL = 'https://api.africastalking.com/version1/messaging'
AT_SANDBOX_URL = 'https://api.sandbox.africastalking.com/version1/messaging'
# Africa's Talking per-recipient status codes that mean the message was accepted.
AT_OK_CODES = {100, 101, 102}


def provider():
    return (getattr(settings, 'SMS_PROVIDER', 'africastalking') or 'africastalking').lower()


def is_configured():
    if provider() == 'twilio':
        return _twilio_configured()
    return bool(settings.AT_API_KEY and settings.AT_USERNAME)


def _twilio_configured():
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


def _at_post(url, api_key, fields):
    """POST form fields to Africa's Talking and return the decoded JSON reply."""
    request = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(fields).encode(),
        headers={'apiKey': api_key, 'Accept': 'application/json',
                 'Content-Type': 'application/x-www-form-urlencoded'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode() or '{}')
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors='replace')[:200]
        raise SMSError(f'Africa\'s Talking returned HTTP {exc.code}: {detail}') from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise SMSError(f'Could not reach Africa\'s Talking: {exc}') from exc


def _send_africastalking(number, body):
    username = settings.AT_USERNAME
    sandbox = getattr(settings, 'AT_SANDBOX', False) or username == 'sandbox'
    fields = {'username': username, 'to': number, 'message': body}
    if settings.AT_SENDER_ID:
        fields['from'] = settings.AT_SENDER_ID
    data = _at_post(AT_SANDBOX_URL if sandbox else AT_LIVE_URL, settings.AT_API_KEY, fields)
    recipients = (data.get('SMSMessageData') or {}).get('Recipients') or []
    if not recipients:
        message = (data.get('SMSMessageData') or {}).get('Message') or 'no recipient was accepted'
        raise SMSError(f"Africa's Talking: {message}")
    first = recipients[0]
    if first.get('statusCode') not in AT_OK_CODES:
        raise SMSError(f"Africa's Talking: {first.get('status') or 'rejected'}")
    return first.get('messageId', '')


def send_sms(to, body):
    """Send one SMS and return the provider's message id."""
    if not is_configured():
        if provider() == 'twilio':
            raise SMSNotConfigured(
                'SMS is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and '
                'TWILIO_FROM_NUMBER (or TWILIO_MESSAGING_SERVICE_SID) in the backend .env file.'
            )
        raise SMSNotConfigured(
            "SMS is not configured. Set AT_USERNAME and AT_API_KEY (Africa's Talking) "
            'in the backend .env file.'
        )
    number = normalize_phone(to)
    if not number:
        raise SMSError(f'"{to}" is not a valid phone number.')
    if provider() != 'twilio':
        return _send_africastalking(number, body)

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
