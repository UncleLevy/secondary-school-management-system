"""Publish the timetable: record it and notify every active teacher by SMS and email."""
from django.conf import settings

from teachers.models import Teacher
from .clashes import all_clashes
from .models import TimetableSlot, TimetablePublication


def _summary(results, skipped):
    return {
        'sent': sum(r['status'] == 'Sent' for r in results),
        'failed': sum(r['status'] == 'Failed' for r in results),
        'skipped': skipped,
        'errors': [{'recipient': r['recipient'], 'error': r['error']}
                   for r in results if r['status'] == 'Failed'],
    }


def publish(request, allow_clashes=False):
    """Returns (record, report). Raises ClashesPresent if clashes exist and are not allowed."""
    # Imported here so the timetable app does not depend on sms/mailer at import time.
    from mailer import service as mail
    from mailer.views import deliver as deliver_email
    from sms import service as sms
    from sms.messages import published_email, published_sms
    from sms.views import deliver as deliver_sms

    clashes = all_clashes()
    if clashes and not allow_clashes:
        raise ClashesPresent(len(clashes))

    teachers = list(Teacher.objects.filter(status='Active'))
    school = settings.SCHOOL_NAME
    sms_on, mail_on = sms.is_configured(), mail.is_configured()

    sms_msgs, sms_skipped, mail_msgs, mail_skipped = [], [], [], []
    for t in teachers:
        if not sms_on:
            sms_skipped.append({'recipient': t.full_name, 'reason': 'SMS is not set up'})
        elif not sms.normalize_phone(t.phone):
            sms_skipped.append({'recipient': t.full_name, 'reason': 'No valid phone number'})
        else:
            sms_msgs.append((t.full_name, t.phone, published_sms(t.full_name, school)))
        if not mail_on:
            mail_skipped.append({'recipient': t.full_name, 'reason': 'Email is not set up'})
        elif not mail.is_valid_email(t.user_email):
            mail_skipped.append({'recipient': t.full_name, 'reason': 'No valid email address'})
        else:
            subject, body = published_email(t.full_name, school)
            mail_msgs.append((t.full_name, t.user_email, subject, body))

    sms_report = _summary(deliver_sms(request, sms_msgs, 'Timetable'), sms_skipped)
    mail_report = _summary(deliver_email(request, mail_msgs, 'Timetable'), mail_skipped)

    record = TimetablePublication.objects.create(
        published_by=request.user, slot_count=TimetableSlot.objects.count(),
        teachers=len(teachers), sms_sent=sms_report['sent'], sms_failed=sms_report['failed'],
        email_sent=mail_report['sent'], email_failed=mail_report['failed'])
    return record, {'sms': sms_report, 'email': mail_report, 'clashes': len(clashes)}


class ClashesPresent(Exception):
    def __init__(self, count):
        super().__init__(f'The timetable has {count} clash(es).')
        self.count = count


def serialize(record):
    if record is None:
        return {'published': False}
    return {
        'published': True,
        'published_at': record.published_at,
        'published_by': (record.published_by.get_full_name() or record.published_by.username)
                        if record.published_by else '',
        'slot_count': record.slot_count, 'teachers': record.teachers,
        'sms_sent': record.sms_sent, 'sms_failed': record.sms_failed,
        'email_sent': record.email_sent, 'email_failed': record.email_failed,
    }
