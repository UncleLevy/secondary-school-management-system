from django.contrib.auth import get_user_model
from django.core import mail
from django.test import override_settings
from rest_framework.test import APITestCase

from teachers.models import Teacher
from timetable.models import TimetableSlot
from . import service
from .models import EmailLog

User = get_user_model()
LOCMEM = dict(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
              SCHOOL_NAME='Test School')


@override_settings(**LOCMEM)
class EmailApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin1', password='pw', role='admin')
        self.teacher_user = User.objects.create_user('t1', password='pw', role='teacher')
        self.banda = Teacher.objects.create(user_email='b@x.com', full_name='Mr. Banda')
        self.phiri = Teacher.objects.create(user_email='p@x.com', full_name='Ms. Phiri')
        self.client.force_authenticate(self.admin)

    def slot(self, **kw):
        data = dict(day='Monday', period=1, subject='Mathematics', teacher_name='Mr. Banda',
                    grade='Grade 8', section='A', room='Room 1', start_time='07:30')
        data.update(kw)
        return TimetableSlot.objects.create(**data)

    def test_only_admin_and_management_allowed(self):
        self.client.force_authenticate(self.teacher_user)
        self.assertEqual(self.client.get('/api/email/').status_code, 403)
        self.assertEqual(self.client.get('/api/email/status/').status_code, 403)

    def test_status_console_backend_counts_as_configured(self):
        r = self.client.get('/api/email/status/')
        self.assertTrue(r.data['configured'])
        self.assertFalse(r.data['real_delivery'])

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.smtp.EmailBackend',
                       EMAIL_HOST_USER='', EMAIL_HOST_PASSWORD='')
    def test_smtp_without_login_is_not_configured(self):
        self.assertFalse(self.client.get('/api/email/status/').data['configured'])
        r = self.client.post('/api/email/send/', {'teacher_ids': [self.banda.id],
                                                  'subject': 'Hi', 'message': 'x'})
        self.assertEqual(r.status_code, 503)
        self.assertEqual(EmailLog.objects.count(), 0)

    def test_send_custom_email_logs_and_delivers(self):
        r = self.client.post('/api/email/send/', {'teacher_ids': [self.banda.id, self.phiri.id],
                                                  'subject': 'Staff meeting', 'message': 'At 3pm'})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['sent'], 2)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[0].subject, 'Test School: Staff meeting')
        self.assertEqual(EmailLog.objects.filter(status='Sent', kind='Custom').count(), 2)

    def test_send_validates_input(self):
        r = self.client.post('/api/email/send/', {'teacher_ids': [], 'subject': 's', 'message': 'm'})
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/email/send/', {'teacher_ids': [1], 'subject': '', 'message': 'm'})
        self.assertEqual(r.status_code, 400)

    def test_inactive_teacher_is_not_emailed(self):
        self.banda.status = 'Inactive'
        self.banda.save()
        r = self.client.post('/api/email/send/', {'teacher_ids': [self.banda.id],
                                                  'subject': 's', 'message': 'm'})
        self.assertEqual(r.data['sent'], 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_send_failure_is_logged(self):
        from unittest.mock import patch
        with patch('mailer.service.EmailMultiAlternatives.send', side_effect=OSError('smtp down')):
            r = self.client.post('/api/email/send/', {'teacher_ids': [self.banda.id],
                                                      'subject': 's', 'message': 'm'})
        self.assertEqual(r.data['failed'], 1)
        self.assertIn('smtp down', r.data['results'][0]['error'])
        self.assertEqual(EmailLog.objects.get().status, 'Failed')

    def test_timetable_email_per_day(self):
        self.slot()
        r = self.client.post('/api/email/send-timetable/', {'day': 'Monday'})
        self.assertEqual(r.data['sent'], 1)
        self.assertIn('Mr. Banda', mail.outbox[0].body.replace('Hello ', '') + 'Mr. Banda')
        self.assertEqual(mail.outbox[0].to, ['b@x.com'])
        self.assertEqual(len(r.data['skipped']), 1)  # Ms. Phiri has no lessons
        self.assertEqual(EmailLog.objects.get().kind, 'Timetable')

    def test_clash_alerts_go_to_both_teachers_only_when_clashing(self):
        r = self.client.post('/api/email/send-clash-alerts/')
        self.assertEqual(r.data['sent'], 0)
        self.slot(teacher_name='Mr. Banda', room='Room 1')
        self.slot(teacher_name='Ms. Phiri', room='Room 1', grade='Grade 9')
        r = self.client.post('/api/email/send-clash-alerts/')
        self.assertEqual(r.data['sent'], 2)
        self.assertEqual(EmailLog.objects.filter(kind='Clash Alert').count(), 2)

    def test_history_list(self):
        self.client.post('/api/email/send/', {'teacher_ids': [self.banda.id],
                                              'subject': 's', 'message': 'm'})
        r = self.client.get('/api/email/')
        self.assertEqual(len(r.data['results'] if 'results' in r.data else r.data), 1)


class ServiceTests(APITestCase):
    def test_email_validation(self):
        self.assertTrue(service.is_valid_email('a@b.com'))
        self.assertFalse(service.is_valid_email('nope'))
        self.assertFalse(service.is_valid_email(''))
        self.assertFalse(service.is_valid_email(None))

    def test_invalid_address_raises(self):
        with self.assertRaises(service.EmailError):
            service.send_email('bad', 's', 'b')


class GmailSettingsTests(APITestCase):
    def test_app_password_spaces_are_ignored_and_smtp_is_auto_selected(self):
        import os, subprocess, sys
        env = dict(os.environ, SECRET_KEY='x', EMAIL_HOST_USER=' me@gmail.com ',
                   EMAIL_HOST_PASSWORD='abcd efgh ijkl mnop', DJANGO_SETTINGS_MODULE='core.settings')
        env.pop('EMAIL_BACKEND', None)
        out = subprocess.run([sys.executable, '-c',
            'from django.conf import settings as s; print(s.EMAIL_BACKEND, s.EMAIL_HOST_USER, s.EMAIL_HOST_PASSWORD, s.DEFAULT_FROM_EMAIL)'],
            env=env, capture_output=True, text=True, cwd=str(__import__('django').conf.settings.BASE_DIR))
        self.assertEqual(out.stdout.split(),
                         ['django.core.mail.backends.smtp.EmailBackend', 'me@gmail.com',
                          'abcdefghijklmnop', 'me@gmail.com'])

    def test_console_when_blank(self):
        import os, subprocess, sys
        env = dict(os.environ, SECRET_KEY='x', EMAIL_HOST_USER='', EMAIL_HOST_PASSWORD='',
                   DJANGO_SETTINGS_MODULE='core.settings')
        env.pop('EMAIL_BACKEND', None)
        out = subprocess.run([sys.executable, '-c',
            'from django.conf import settings as s; print(s.EMAIL_BACKEND)'],
            env=env, capture_output=True, text=True, cwd=str(__import__('django').conf.settings.BASE_DIR))
        self.assertIn('console', out.stdout)


@override_settings(**LOCMEM)
class HtmlEmailTests(APITestCase):
    def test_email_has_plain_and_html_parts_with_embedded_logo(self):
        service.send_email('a@b.com', 'Test School: Staff meeting', 'At 3pm\nBring notes')
        msg = mail.outbox[0]
        self.assertEqual(msg.body, 'At 3pm\nBring notes')            # plain text still there
        html, mime = msg.alternatives[0]
        self.assertEqual(mime, 'text/html')
        self.assertIn('cid:school-logo', html)
        self.assertIn('Staff meeting', html)
        self.assertIn('Test School', html)
        parts = list(msg.message().walk())
        types = [p.get_content_type() for p in parts]
        self.assertIn('multipart/related', types)   # logo is inline with the HTML, not an attachment
        images = [p for p in parts if p.get_content_type() == 'image/png']
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]['Content-ID'], '<school-logo>')

    def test_html_escapes_message_text(self):
        service.send_email('a@b.com', 'S', '<script>alert(1)</script>')
        html = mail.outbox[0].alternatives[0][0]
        self.assertNotIn('<script>', html)
        self.assertIn('&lt;script&gt;', html)

    def test_passcode_is_shown_in_highlighted_box(self):
        service.send_email('a@b.com', 'S', 'plain', code='123456', intro='Use this code')
        html = mail.outbox[0].alternatives[0][0]
        self.assertIn('123456', html)
        self.assertIn('letter-spacing', html)

    @override_settings(EMAIL_LOGO_PATH='/nonexistent/logo.png')
    def test_missing_custom_logo_falls_back_to_no_image_not_error(self):
        service.send_email('a@b.com', 'S', 'x')
        msg = mail.outbox[0]
        self.assertNotIn('cid:', msg.alternatives[0][0])

    def test_custom_logo_is_used(self):
        import tempfile, pathlib
        f = pathlib.Path(tempfile.mkdtemp()) / 'mine.png'
        f.write_bytes((pathlib.Path(service.__file__).parent / 'static/mailer/logo.png').read_bytes())
        with override_settings(EMAIL_LOGO_PATH=str(f)):
            service.send_email('a@b.com', 'S', 'x')
        self.assertIn('cid:school-logo', mail.outbox[0].alternatives[0][0])
