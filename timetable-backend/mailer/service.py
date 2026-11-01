"""Thin wrapper over Django's mail framework so errors become one exception type."""
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.template.loader import render_to_string


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


LOGO_CID = 'school-logo'


class _HtmlEmail(EmailMultiAlternatives):
    """Plain text + HTML, with the logo embedded in the HTML part (multipart/related)
    so that mail apps show it inline instead of as an attachment."""
    logo = None

    def _add_bodies(self, msg):
        msg = super()._add_bodies(msg)
        if self.logo:
            html_part = msg.get_body(('html',))
            if html_part is not None:
                html_part.add_related(self.logo, 'image', 'png', cid=f'<{LOGO_CID}>',
                                      disposition='inline', filename='logo.png')
        return msg


def _logo_bytes():
    """The header graphic: EMAIL_LOGO_PATH if set and readable, else the bundled icon."""
    path = getattr(settings, 'EMAIL_LOGO_PATH', '') or str(Path(__file__).parent / 'static' / 'mailer' / 'logo.png')
    try:
        return Path(path).read_bytes()
    except OSError:
        return None


def _heading(subject):
    prefix = f'{settings.SCHOOL_NAME}: '
    text = subject[len(prefix):] if subject.startswith(prefix) else subject
    return text[:1].upper() + text[1:]


def send_email(to, subject, body, code=None, greeting='', intro='', note=''):
    """Send a plain-text email with a branded HTML version (header graphic embedded).

    Pass `code` to show a one-time passcode in a highlighted box.
    """
    to = (to or '').strip()
    if not is_valid_email(to):
        raise EmailError('Invalid email address')
    logo = _logo_bytes()
    html = render_to_string('mailer/email.html', {
        'school': settings.SCHOOL_NAME, 'heading': _heading(subject), 'body': body,
        'code': code, 'greeting': greeting, 'intro': intro, 'note': note,
        'logo': LOGO_CID if logo else '',
    })
    try:
        msg = _HtmlEmail(subject, body, settings.DEFAULT_FROM_EMAIL, [to])
        msg.logo = logo
        msg.attach_alternative(html, 'text/html')
        msg.send(fail_silently=False)
    except Exception as exc:  # smtplib / socket errors vary widely
        raise EmailError(str(exc) or exc.__class__.__name__) from exc
