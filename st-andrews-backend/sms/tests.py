from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase

from communications.models import ParentMessage
from students.models import Student
from teachers.models import Teacher
from timetable.models import TimetableSlot

from . import service
from .models import SMSLog

User = get_user_model()

TWILIO = dict(TWILIO_ACCOUNT_SID='ACtest', TWILIO_AUTH_TOKEN='token',
              TWILIO_FROM_NUMBER='+15005550006', TWILIO_MESSAGING_SERVICE_SID='',
              SMS_DEFAULT_COUNTRY_CODE='260')
NO_TWILIO = dict(TWILIO_ACCOUNT_SID='', TWILIO_AUTH_TOKEN='', TWILIO_FROM_NUMBER='',
                 TWILIO_MESSAGING_SERVICE_SID='')


def fake_client(sid='SM123'):
    client = MagicMock()
    client.messages.create.return_value = SimpleNamespace(sid=sid)
    return client


@override_settings(**TWILIO)
class NormalizePhoneTests(SimpleTestCase):
    def test_local_number_gets_country_code(self):
        self.assertEqual(service.normalize_phone('0971234567'), '+260971234567')

    def test_formatting_is_stripped(self):
        self.assertEqual(service.normalize_phone('+260 97-123 4567'), '+260971234567')
        self.assertEqual(service.normalize_phone('(0971) 234567'), '+260971234567')

    def test_country_code_without_plus_and_00_prefix(self):
        self.assertEqual(service.normalize_phone('260971234567'), '+260971234567')
        self.assertEqual(service.normalize_phone('00260971234567'), '+260971234567')

    def test_other_international_numbers_are_kept(self):
        self.assertEqual(service.normalize_phone('+14155552671'), '+14155552671')

    def test_invalid_numbers(self):
        for raw in ['', None, 'abc', '12345', '+12', '0']:
            self.assertIsNone(service.normalize_phone(raw), raw)


class SendSmsTests(SimpleTestCase):
    @override_settings(**NO_TWILIO)
    def test_not_configured(self):
        self.assertFalse(service.is_configured())
        with self.assertRaises(service.SMSNotConfigured):
            service.send_sms('0971234567', 'hi')

    @override_settings(**TWILIO)
    def test_sends_from_number_to_normalised_recipient(self):
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            sid = service.send_sms('0971234567', 'hello')
        self.assertEqual(sid, 'SM123')
        client.messages.create.assert_called_once_with(
            to='+260971234567', body='hello', from_='+15005550006')

    @override_settings(**{**TWILIO, 'TWILIO_FROM_NUMBER': '', 'TWILIO_MESSAGING_SERVICE_SID': 'MG1'})
    def test_prefers_messaging_service_when_set(self):
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            service.send_sms('0971234567', 'hello')
        client.messages.create.assert_called_once_with(
            to='+260971234567', body='hello', messaging_service_sid='MG1')

    @override_settings(**TWILIO)
    def test_invalid_number_is_rejected_before_calling_twilio(self):
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            with self.assertRaises(service.SMSError):
                service.send_sms('nope', 'hello')
        client.messages.create.assert_not_called()

    @override_settings(**TWILIO)
    def test_provider_errors_become_sms_errors(self):
        client = fake_client()
        client.messages.create.side_effect = RuntimeError('Account suspended')
        with patch.object(service, '_client', return_value=client):
            with self.assertRaisesMessage(service.SMSError, 'Account suspended'):
                service.send_sms('0971234567', 'hello')


@override_settings(**TWILIO)
class SmsApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin1', password='pw', role='admin')
        self.manager = User.objects.create_user('mgr1', password='pw', role='management')
        self.teacher_user = User.objects.create_user('teach1', password='pw', role='teacher')
        self.banda = Teacher.objects.create(user_email='b@x.com', full_name='Mr. Banda', phone='0971111111')
        self.phiri = Teacher.objects.create(user_email='p@x.com', full_name='Ms. Phiri', phone='0972222222')
        self.nophone = Teacher.objects.create(user_email='n@x.com', full_name='Mrs. Zulu', phone='')
        self.client.force_authenticate(self.admin)

    def slot(self, **kw):
        data = dict(day='Monday', period=1, subject='Mathematics', teacher_name='Mr. Banda',
                    grade='Grade 8', section='A', room='Room 1', start_time='07:30')
        data.update(kw)
        return TimetableSlot.objects.create(**data)

    # --- access control -------------------------------------------------
    def test_only_admin_and_management_can_use_sms(self):
        self.client.force_authenticate(self.teacher_user)
        self.assertEqual(self.client.get('/api/sms/').status_code, 403)
        self.assertEqual(self.client.post('/api/sms/send/', {}, format='json').status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/sms/').status_code, 401)
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.get('/api/sms/').status_code, 200)

    # --- status ---------------------------------------------------------
    def test_status_reports_configuration_without_exposing_secrets(self):
        res = self.client.get('/api/sms/status/')
        self.assertEqual(res.json(), {'configured': True})
        with override_settings(**NO_TWILIO):
            self.assertEqual(self.client.get('/api/sms/status/').json(), {'configured': False})

    # --- custom message -------------------------------------------------
    @override_settings(**NO_TWILIO)
    def test_send_returns_503_when_not_configured_and_logs_nothing(self):
        res = self.client.post('/api/sms/send/', {'teacher_ids': [self.banda.id], 'message': 'Hi'}, format='json')
        self.assertEqual(res.status_code, 503)
        self.assertIn('not configured', res.json()['detail'])
        self.assertEqual(SMSLog.objects.count(), 0)

    def test_send_texts_teachers_logs_and_skips_those_without_phone(self):
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send/', {
                'teacher_ids': [self.banda.id, self.nophone.id], 'message': 'Staff meeting at 2pm'}, format='json')
        body = res.json()
        self.assertEqual((body['sent'], body['failed']), (1, 0))
        self.assertEqual(body['skipped'], [{'recipient': 'Mrs. Zulu', 'reason': 'No valid phone number'}])
        log = SMSLog.objects.get()
        self.assertEqual((log.recipient_name, log.status, log.kind, log.sent_by), ('Mr. Banda', 'Sent', 'Custom', self.admin))
        self.assertEqual(log.provider_sid, 'SM123')

    def test_send_records_failures(self):
        client = fake_client()
        client.messages.create.side_effect = RuntimeError('boom')
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send/', {'teacher_ids': [self.banda.id], 'message': 'Hi'}, format='json')
        self.assertEqual((res.json()['sent'], res.json()['failed']), (0, 1))
        log = SMSLog.objects.get()
        self.assertEqual((log.status, log.error), ('Failed', 'boom'))

    def test_send_validates_input(self):
        for payload in [{'teacher_ids': [], 'message': 'x'}, {'teacher_ids': [1], 'message': ''},
                        {'teacher_ids': [1], 'message': 'x' * 613}, {'message': 'x'}]:
            res = self.client.post('/api/sms/send/', payload, format='json')
            self.assertEqual(res.status_code, 400, payload)

    def test_inactive_teachers_are_not_texted(self):
        self.banda.status = 'Inactive'
        self.banda.save()
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send/', {'teacher_ids': [self.banda.id], 'message': 'Hi'}, format='json')
        self.assertEqual(res.json()['sent'], 0)
        client.messages.create.assert_not_called()

    # --- timetable ------------------------------------------------------
    def test_send_timetable_texts_each_teacher_their_own_lessons(self):
        self.slot()
        self.slot(period=3, subject='English', grade='Grade 9', section='B', room='', start_time='09:00')
        self.slot(period=2, subject='Science', teacher_name='Ms. Phiri', grade='Grade 7', room='Lab')
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send-timetable/', {'day': 'Monday'}, format='json')
        body = res.json()
        self.assertEqual(body['sent'], 2)
        reasons = {s['recipient']: s['reason'] for s in body['skipped']}
        self.assertEqual(reasons, {'Mrs. Zulu': 'No valid phone number'})
        banda_text = SMSLog.objects.get(recipient_name='Mr. Banda').body
        self.assertEqual(banda_text, 'Timetable for Monday: P1 07:30 Mathematics Grade 8-A (Room 1); '
                                     'P3 09:00 English Grade 9-B')
        self.assertNotIn('Science', banda_text)
        self.assertEqual(SMSLog.objects.get(recipient_name='Mr. Banda').kind, 'Timetable')

    def test_send_timetable_skips_teachers_without_lessons_that_day(self):
        self.slot(day='Tuesday')
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send-timetable/', {'day': 'Monday', 'teacher_ids': [self.banda.id]}, format='json')
        self.assertEqual(res.json()['sent'], 0)
        self.assertEqual(res.json()['skipped'], [{'recipient': 'Mr. Banda', 'reason': 'No lessons on Monday'}])

    def test_send_timetable_requires_a_valid_day(self):
        self.assertEqual(self.client.post('/api/sms/send-timetable/', {'day': 'Sunday'}, format='json').status_code, 400)

    # --- clash alerts ---------------------------------------------------
    def test_clash_alerts_with_no_clashes_send_nothing_even_when_unconfigured(self):
        self.slot()
        with override_settings(**NO_TWILIO):
            res = self.client.post('/api/sms/send-clash-alerts/', format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['sent'], 0)

    def test_clash_alerts_text_every_teacher_involved(self):
        self.slot()
        self.slot(subject='Science', teacher_name='Ms. Phiri', grade='Grade 9', room='Room 1')  # room clash
        self.slot(subject='ICT', teacher_name='Mr. Unknown', grade='Grade 7', room='Room 1')    # unknown teacher
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post('/api/sms/send-clash-alerts/', format='json')
        body = res.json()
        self.assertEqual(body['sent'], 2)
        self.assertEqual({s['recipient'] for s in body['skipped']}, {'mr. unknown'})
        text = SMSLog.objects.get(recipient_name='Ms. Phiri').body
        self.assertIn('Room Room 1 double-booked Mon P1', text)
        self.assertEqual(SMSLog.objects.get(recipient_name='Ms. Phiri').kind, 'Clash Alert')

    @override_settings(**NO_TWILIO)
    def test_clash_alerts_503_when_clashes_exist_but_sms_unconfigured(self):
        self.slot()
        self.slot(subject='Science', teacher_name='Ms. Phiri', grade='Grade 9')
        self.assertEqual(self.client.post('/api/sms/send-clash-alerts/', format='json').status_code, 503)

    # --- history ----------------------------------------------------------
    def test_history_lists_newest_first(self):
        SMSLog.objects.create(phone='+1', body='old', status='Sent')
        SMSLog.objects.create(phone='+2', body='new', status='Sent')
        self.assertEqual([r['body'] for r in self.client.get('/api/sms/').json()], ['new', 'old'])


@override_settings(**TWILIO)
class ParentMessageSmsTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin1', password='pw', role='admin')
        self.client.force_authenticate(self.admin)
        self.student = Student.objects.create(first_name='A', last_name='B', gender='Male', grade='Grade 8',
                                              guardian_name='Mrs. B', guardian_phone='0973333333')

    def message(self, **kw):
        data = dict(student=self.student, student_name='A B', channel='SMS', message_type='General Notice',
                    subject='Notice', body='<p>School closes early</p>')
        data.update(kw)
        return ParentMessage.objects.create(**data)

    def test_sms_channel_really_sends_to_the_guardian_phone(self):
        msg = self.message()
        client = fake_client()
        with patch.object(service, '_client', return_value=client):
            res = self.client.post(f'/api/communications/{msg.id}/send/')
        self.assertEqual(res.status_code, 200)
        client.messages.create.assert_called_once_with(to='+260973333333', body='School closes early',
                                                       from_='+15005550006')
        msg.refresh_from_db()
        self.assertEqual(msg.status, 'Sent')
        self.assertEqual(SMSLog.objects.get().kind, 'Parent Message')

    def test_sms_channel_fails_honestly_without_credentials(self):
        msg = self.message()
        with override_settings(**NO_TWILIO):
            res = self.client.post(f'/api/communications/{msg.id}/send/')
        self.assertEqual(res.status_code, 500)
        msg.refresh_from_db()
        self.assertEqual(msg.status, 'Failed')

    def test_sms_channel_without_guardian_phone_fails(self):
        self.student.guardian_phone = ''
        self.student.save()
        msg = self.message()
        res = self.client.post(f'/api/communications/{msg.id}/send/')
        self.assertEqual(res.status_code, 500)
        self.assertIn('no guardian phone', res.json()['error'])
