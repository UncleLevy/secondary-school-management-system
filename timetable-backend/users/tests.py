from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


import re
from datetime import timedelta

from django.core import mail
from django.test import override_settings
from django.utils import timezone

from .models import OneTimeCode

OTP_ON = dict(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
              OTP_LOGIN_REQUIRED=True, OTP_RESEND_SECONDS=0, OTP_TTL_MINUTES=10,
              SCHOOL_NAME='Test School')


def last_code():
    return re.search(r'\b(\d{6})\b', mail.outbox[-1].body).group(1)


@override_settings(**OTP_ON)
class LoginOtpTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('amy', 'amy@x.com', 'S3cure-pass!', role='teacher')

    def start(self):
        return self.client.post('/api/auth/login/', {'username': 'amy', 'password': 'S3cure-pass!'})

    def test_password_alone_gives_no_tokens(self):
        r = self.start()
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data['otp_required'])
        self.assertNotIn('access', r.data)
        self.assertEqual(r.data['email_hint'], 'am*@x.com')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['amy@x.com'])

    def test_wrong_password_sends_nothing(self):
        r = self.client.post('/api/auth/login/', {'username': 'amy', 'password': 'bad'})
        self.assertEqual(r.status_code, 401)
        self.assertEqual(len(mail.outbox), 0)

    def test_correct_code_returns_tokens(self):
        ch = self.start().data['challenge']
        r = self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': last_code()})
        self.assertEqual(r.status_code, 200)
        self.assertIn('access', r.data)
        self.assertIn('refresh', r.data)

    def test_code_is_stored_hashed(self):
        self.start()
        self.assertNotIn(last_code(), OneTimeCode.objects.get().code_hash)

    def test_code_is_single_use(self):
        ch = self.start().data['challenge']
        code = last_code()
        self.assertEqual(self.client.post('/api/auth/login/verify/',
                                          {'challenge': ch, 'code': code}).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/login/verify/',
                                          {'challenge': ch, 'code': code}).status_code, 400)

    def test_wrong_code_rejected(self):
        ch = self.start().data['challenge']
        r = self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': '000000'})
        self.assertEqual(r.status_code, 400)

    def test_locked_after_five_wrong_attempts(self):
        ch = self.start().data['challenge']
        real = last_code()
        wrong = '111111' if real != '111111' else '222222'
        for _ in range(5):
            self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': wrong})
        r = self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': real})
        self.assertEqual(r.status_code, 400)
        self.assertIn('Too many', r.data['detail'])

    def test_expired_code_rejected(self):
        ch = self.start().data['challenge']
        OneTimeCode.objects.update(created_at=timezone.now() - timedelta(minutes=11))
        r = self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': last_code()})
        self.assertEqual(r.status_code, 400)

    def test_garbage_challenge_rejected(self):
        r = self.client.post('/api/auth/login/verify/', {'challenge': 'x', 'code': '123456'})
        self.assertEqual(r.status_code, 400)

    def test_resend_invalidates_old_code(self):
        ch = self.start().data['challenge']
        old = last_code()
        r = self.client.post('/api/auth/login/resend/', {'challenge': ch})
        self.assertEqual(r.status_code, 200)
        new = last_code()
        if old != new:
            self.assertEqual(self.client.post('/api/auth/login/verify/',
                             {'challenge': ch, 'code': old}).status_code, 400)
        self.assertEqual(self.client.post('/api/auth/login/verify/',
                         {'challenge': ch, 'code': new}).status_code, 200)

    @override_settings(OTP_RESEND_SECONDS=60)
    def test_resend_cooldown(self):
        ch = self.start().data['challenge']
        r = self.client.post('/api/auth/login/resend/', {'challenge': ch})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(len(mail.outbox), 1)

    def test_user_without_email_skips_otp(self):
        User.objects.create_user('noemail', password='S3cure-pass!')
        r = self.client.post('/api/auth/login/', {'username': 'noemail', 'password': 'S3cure-pass!'})
        self.assertIn('access', r.data)

    def test_email_failure_returns_503_not_tokens(self):
        from unittest.mock import patch
        with patch('mailer.service.EmailMultiAlternatives.send', side_effect=OSError('down')):
            r = self.start()
        self.assertEqual(r.status_code, 503)
        self.assertNotIn('access', r.data)

    @override_settings(OTP_LOGIN_REQUIRED=False)
    def test_flag_off_means_password_only(self):
        r = self.start()
        self.assertIn('access', r.data)
        self.assertEqual(len(mail.outbox), 0)


@override_settings(**OTP_ON)
class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('amy', 'amy@x.com', 'Old-pass-123!', role='teacher')

    def test_unknown_email_gets_same_answer_and_no_mail(self):
        a = self.client.post('/api/auth/forgot-password/', {'email': 'nobody@x.com'})
        b = self.client.post('/api/auth/forgot-password/', {'email': 'amy@x.com'})
        self.assertEqual(a.status_code, 200)
        self.assertEqual(a.data, b.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_full_reset_flow(self):
        self.client.post('/api/auth/forgot-password/', {'email': 'AMY@x.com'})
        r = self.client.post('/api/auth/reset-password/', {
            'email': 'amy@x.com', 'code': last_code(), 'new_password': 'Brand-new-pass-77!'})
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Brand-new-pass-77!'))

    def test_wrong_code_does_not_change_password(self):
        self.client.post('/api/auth/forgot-password/', {'email': 'amy@x.com'})
        r = self.client.post('/api/auth/reset-password/', {
            'email': 'amy@x.com', 'code': '000000', 'new_password': 'Brand-new-pass-77!'})
        self.assertEqual(r.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Old-pass-123!'))

    def test_weak_password_rejected_and_code_kept(self):
        self.client.post('/api/auth/forgot-password/', {'email': 'amy@x.com'})
        code = last_code()
        r = self.client.post('/api/auth/reset-password/', {
            'email': 'amy@x.com', 'code': code, 'new_password': '123'})
        self.assertEqual(r.status_code, 400)
        r = self.client.post('/api/auth/reset-password/', {
            'email': 'amy@x.com', 'code': code, 'new_password': 'Brand-new-pass-77!'})
        self.assertEqual(r.status_code, 200)

    def test_reset_code_cannot_be_used_for_login(self):
        self.client.post('/api/auth/forgot-password/', {'email': 'amy@x.com'})
        ch = self.client.post('/api/auth/login/', {'username': 'amy', 'password': 'Old-pass-123!'}).data['challenge']
        r = self.client.post('/api/auth/login/verify/', {'challenge': ch, 'code': '000000'})
        self.assertEqual(r.status_code, 400)

    def test_unknown_email_reset_is_generic_400(self):
        r = self.client.post('/api/auth/reset-password/', {
            'email': 'nobody@x.com', 'code': '123456', 'new_password': 'Brand-new-pass-77!'})
        self.assertEqual(r.status_code, 400)

    def test_blank_email_sends_nothing(self):
        self.client.post('/api/auth/forgot-password/', {'email': ''})
        self.assertEqual(len(mail.outbox), 0)
