from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .models import Teacher

User = get_user_model()
STRONG = 'Sturdy-Pass-2026'


class TeacherAccountTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin', 'admin@school.zm', 'x', role='admin')
        self.client.force_authenticate(self.admin)
        self.teacher = Teacher.objects.create(user_email='Banda@school.zm', full_name='Joseph Banda')

    def url(self, action, pk=None):
        return f'/api/teachers/{pk or self.teacher.pk}/{action}/'

    def test_create_account_generates_a_password_that_works(self):
        r = self.client.post(self.url('create-account'))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data['has_account'] and data['account_active'])
        user = User.objects.get(username='banda@school.zm')
        self.assertEqual((user.role, user.first_name, user.last_name), ('teacher', 'Joseph', 'Banda'))
        self.assertTrue(user.check_password(data['temporary_password']))

    def test_create_account_with_chosen_password(self):
        r = self.client.post(self.url('create-account'), {'password': STRONG})
        self.assertTrue(User.objects.get(email='Banda@school.zm').check_password(STRONG))
        self.assertEqual(r.status_code, 200)

    def test_weak_password_is_rejected_and_no_account_created(self):
        r = self.client.post(self.url('create-account'), {'password': '123'})
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.filter(email__iexact='banda@school.zm').exists())

    def test_cannot_create_twice(self):
        self.client.post(self.url('create-account'))
        self.assertEqual(self.client.post(self.url('create-account')).status_code, 400)

    def test_email_used_by_admin_is_refused(self):
        User.objects.create_user('boss', 'boss@school.zm', 'x', role='admin')
        t = Teacher.objects.create(user_email='boss@school.zm', full_name='Boss')
        r = self.client.post(self.url('create-account', t.pk))
        self.assertEqual(r.status_code, 400)
        self.assertEqual(User.objects.get(username='boss').role, 'admin')

    def test_reset_password(self):
        self.client.post(self.url('create-account'))
        r = self.client.post(self.url('reset-password'), {'password': STRONG})
        self.assertEqual(r.status_code, 200)
        self.assertTrue(User.objects.get(username='banda@school.zm').check_password(STRONG))

    def test_reset_without_account_is_404(self):
        self.assertEqual(self.client.post(self.url('reset-password')).status_code, 404)

    def test_deactivated_account_cannot_log_in(self):
        self.client.post(self.url('create-account'), {'password': STRONG})
        self.client.post(self.url('set-account-active'), {'active': False}, format='json')
        self.client.force_authenticate(None)
        r = self.client.post('/api/auth/login/', {'username': 'banda@school.zm', 'password': STRONG})
        self.assertEqual(r.status_code, 401)
        self.client.force_authenticate(self.admin)
        self.client.post(self.url('set-account-active'), {'active': True}, format='json')
        self.client.force_authenticate(None)
        r = self.client.post('/api/auth/login/', {'username': 'banda@school.zm', 'password': STRONG})
        self.assertEqual(r.status_code, 200)

    def test_delete_account_keeps_teacher(self):
        self.client.post(self.url('create-account'))
        r = self.client.delete(self.url('account'))
        self.assertFalse(r.json()['has_account'])
        self.assertTrue(Teacher.objects.filter(pk=self.teacher.pk).exists())
        self.assertFalse(User.objects.filter(role='teacher').exists())

    def test_deleting_teacher_removes_their_account(self):
        self.client.post(self.url('create-account'))
        self.client.delete(f'/api/teachers/{self.teacher.pk}/')
        self.assertFalse(User.objects.filter(role='teacher').exists())

    def test_changing_teacher_email_updates_the_login(self):
        self.client.post(self.url('create-account'), {'password': STRONG})
        self.client.patch(f'/api/teachers/{self.teacher.pk}/', {'user_email': 'new@school.zm'}, format='json')
        self.assertTrue(User.objects.get(username='new@school.zm').check_password(STRONG))

    def test_inactive_teacher_deactivates_login(self):
        self.client.post(self.url('create-account'))
        self.client.patch(f'/api/teachers/{self.teacher.pk}/', {'status': 'Inactive'}, format='json')
        self.assertFalse(User.objects.get(role='teacher').is_active)

    def test_list_reports_account_state(self):
        self.client.post(self.url('create-account'))
        row = self.client.get('/api/teachers/').json()
        row = (row['results'] if isinstance(row, dict) else row)[0]
        self.assertTrue(row['has_account'])

    def test_non_admin_cannot_manage_accounts(self):
        mgr = User.objects.create_user('mgr', 'mgr@school.zm', 'x', role='management')
        self.client.force_authenticate(mgr)
        self.assertEqual(self.client.post(self.url('create-account')).status_code, 403)


class ChangePasswordTests(APITestCase):
    URL = '/api/auth/change-password/'

    def setUp(self):
        self.user = User.objects.create_user('t', 't@school.zm', 'Old-Pass-2026', role='teacher')
        self.client.force_authenticate(self.user)

    def test_changes_password(self):
        r = self.client.post(self.URL, {'current_password': 'Old-Pass-2026', 'new_password': STRONG})
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(STRONG))

    def test_wrong_current_password(self):
        r = self.client.post(self.URL, {'current_password': 'nope', 'new_password': STRONG})
        self.assertEqual(r.status_code, 400)

    def test_weak_new_password(self):
        r = self.client.post(self.URL, {'current_password': 'Old-Pass-2026', 'new_password': '1234'})
        self.assertEqual(r.status_code, 400)

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.URL, {}).status_code, 401)
