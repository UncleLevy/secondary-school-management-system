from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from .clashes import all_clashes, find_clashes
from .models import TimetableSlot

User = get_user_model()


def make_slot(**overrides):
    data = dict(day='Monday', period=1, subject='Mathematics',
                teacher_name='Mr. Banda', grade='Grade 8', section='A', room='Room 1')
    data.update(overrides)
    return TimetableSlot.objects.create(**data)


class FindClashesTests(APITestCase):
    def setUp(self):
        self.base = make_slot()

    def clashes(self, **overrides):
        args = dict(day='Monday', period=1, teacher_name='Ms. Phiri',
                    room='Room 9', grade='Grade 9', section='B')
        args.update(overrides)
        return find_clashes(**args)

    def test_no_clash_when_nothing_is_shared(self):
        self.assertEqual(self.clashes(), [])

    def test_teacher_clash_ignores_case_and_whitespace(self):
        found = self.clashes(teacher_name='  mr. banda ')
        self.assertEqual([c['type'] for c in found], ['teacher'])
        self.assertEqual(found[0]['conflicts_with']['id'], self.base.id)

    def test_room_clash(self):
        self.assertEqual([c['type'] for c in self.clashes(room='room 1')], ['room'])

    def test_class_clash_same_grade_and_section(self):
        self.assertEqual([c['type'] for c in self.clashes(grade='Grade 8', section='A')], ['class'])

    def test_different_section_is_not_a_clash(self):
        self.assertEqual(self.clashes(grade='Grade 8', section='B'), [])

    def test_slot_without_section_overlaps_every_section_of_the_grade(self):
        self.assertEqual([c['type'] for c in self.clashes(grade='Grade 8', section='')], ['class'])

    def test_different_period_or_day_is_not_a_clash(self):
        self.assertEqual(self.clashes(period=2, teacher_name='Mr. Banda'), [])
        self.assertEqual(self.clashes(day='Tuesday', teacher_name='Mr. Banda'), [])

    def test_multiple_clashes_are_all_reported(self):
        found = self.clashes(teacher_name='Mr. Banda', room='Room 1', grade='Grade 8', section='A')
        self.assertEqual(sorted(c['type'] for c in found), ['class', 'room', 'teacher'])

    def test_editing_a_slot_does_not_clash_with_itself(self):
        found = find_clashes(day='Monday', period=1, teacher_name='Mr. Banda',
                             room='Room 1', grade='Grade 8', section='A',
                             exclude_id=self.base.id)
        self.assertEqual(found, [])

    def test_blank_teacher_and_room_never_clash(self):
        make_slot(period=2, teacher_name='', room='', grade='Grade 1', section='')
        self.assertEqual(self.clashes(period=2, teacher_name='', room='', grade='Grade 2'), [])


class AllClashesTests(APITestCase):
    def test_reports_each_clashing_pair(self):
        make_slot()
        make_slot(subject='English', grade='Grade 9', room='Room 2')  # same teacher
        make_slot(period=3, teacher_name='Ms. Phiri', grade='Grade 7', room='Lab')
        found = all_clashes()
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]['type'], 'teacher')
        self.assertEqual(len(found[0]['slot_ids']), 2)

    def test_clean_timetable_has_no_clashes(self):
        make_slot()
        make_slot(period=2)
        self.assertEqual(all_clashes(), [])


class TimetableApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user('admin1', password='pw', role='admin')
        self.teacher = User.objects.create_user('teach1', password='pw', role='teacher')
        self.base = make_slot()
        self.payload = dict(day='Monday', period=1, subject='English',
                            teacher_name='Ms. Phiri', grade='Grade 9', section='B', room='Room 9')

    def test_create_clashing_slot_is_rejected_with_readable_message(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/timetable/', {**self.payload, 'teacher_name': 'Mr. Banda'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('Mr. Banda', res.json()['non_field_errors'][0])
        self.assertEqual(TimetableSlot.objects.count(), 1)

    def test_create_clean_slot_succeeds(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/timetable/', self.payload, format='json')
        self.assertEqual(res.status_code, 201)

    def test_updating_a_slot_without_changing_it_is_allowed(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/timetable/{self.base.id}/', {'room': 'Room 1'}, format='json')
        self.assertEqual(res.status_code, 200)

    def test_partial_update_into_a_clash_is_rejected(self):
        other = make_slot(period=2, teacher_name='Ms. Phiri', grade='Grade 9', room='Room 9')
        self.client.force_authenticate(self.admin)
        res = self.client.patch(f'/api/timetable/{other.id}/', {'period': 1, 'teacher_name': 'Mr. Banda'}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_check_clash_endpoint_warns(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.post('/api/timetable/check-clash/',
                               {**self.payload, 'room': 'Room 1'}, format='json')
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body['has_clash'])
        self.assertEqual(body['clashes'][0]['type'], 'room')
        self.assertIn('Room 1', body['clashes'][0]['message'])

    def test_check_clash_endpoint_all_clear(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/timetable/check-clash/', self.payload, format='json')
        self.assertEqual(res.json(), {'has_clash': False, 'clashes': []})

    def test_check_clash_excludes_the_slot_being_edited(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/timetable/check-clash/',
                               {'id': self.base.id, 'day': 'Monday', 'period': 1,
                                'teacher_name': 'Mr. Banda', 'room': 'Room 1',
                                'grade': 'Grade 8', 'section': 'A'}, format='json')
        self.assertFalse(res.json()['has_clash'])

    def test_check_clash_rejects_bad_input(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/timetable/check-clash/', {'day': 'Sunday', 'period': 1}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_clashes_endpoint_lists_existing_clashes(self):
        make_slot(subject='English', grade='Grade 9', room='Room 2')  # same teacher, same period
        self.client.force_authenticate(self.teacher)
        res = self.client.get('/api/timetable/clashes/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['count'], 1)

    def test_endpoints_require_login(self):
        self.assertEqual(self.client.post('/api/timetable/check-clash/', self.payload, format='json').status_code, 401)
        self.assertEqual(self.client.get('/api/timetable/clashes/').status_code, 401)

    def test_teacher_role_still_cannot_write(self):
        self.client.force_authenticate(self.teacher)
        res = self.client.post('/api/timetable/', self.payload, format='json')
        self.assertEqual(res.status_code, 403)


class MyScheduleTests(APITestCase):
    URL = '/api/timetable/my-schedule/'

    def setUp(self):
        from teachers.models import Teacher
        self.teacher = Teacher.objects.create(user_email='banda@school.zm', full_name='Mr. Banda')
        self.mine = make_slot(teacher_name='mr. banda ')
        make_slot(day='Tuesday', teacher_name='Ms. Phiri', room='Room 2', grade='Grade 9')

    def login(self, email, role='teacher'):
        user = User.objects.create_user(username=email, email=email, password='x', role=role)
        self.client.force_authenticate(user)

    def test_requires_login(self):
        self.assertEqual(self.client.get(self.URL).status_code, 401)

    def test_returns_only_the_teachers_own_slots(self):
        self.login('Banda@School.zm')
        data = self.client.get(self.URL).json()
        self.assertTrue(data['linked'])
        self.assertEqual(data['teacher']['full_name'], 'Mr. Banda')
        self.assertEqual([s['id'] for s in data['slots']], [self.mine.id])
        self.assertEqual(data['clashes'], [])

    def test_unlinked_account_gets_an_empty_schedule(self):
        self.login('nobody@school.zm')
        data = self.client.get(self.URL).json()
        self.assertFalse(data['linked'])
        self.assertEqual(data['slots'], [])

    def test_own_clash_is_reported_but_not_other_teachers(self):
        make_slot(teacher_name='Mr. Banda', room='Room 7', grade='Grade 10')
        make_slot(day='Tuesday', teacher_name='Ms. Phiri', room='Room 2', grade='Grade 11')
        self.login('banda@school.zm')
        clashes = self.client.get(self.URL).json()['clashes']
        self.assertEqual([c['name'].strip().lower() for c in clashes], ['mr. banda'])
