"""Builds the text of timetable-related SMS messages."""
from collections import defaultdict

from timetable.clashes import all_clashes, class_label
from timetable.models import TimetableSlot

CLASH_WORDS = {'teacher': 'Teacher', 'room': 'Room', 'class': 'Class'}


def norm(name):
    return (name or '').strip().lower()


def timetable_message(teacher_name, day):
    """The teacher's lessons for one day, or None if they have none."""
    slots = [s for s in TimetableSlot.objects.filter(day=day).order_by('period')
             if norm(s.teacher_name) == norm(teacher_name)]
    if not slots:
        return None
    lessons = []
    for s in slots:
        when = f"P{s.period}" + (f" {s.start_time}" if s.start_time else '')
        where = f" ({s.room})" if s.room else ''
        lessons.append(f"{when} {s.subject} {class_label(s.grade, s.section)}{where}")
    return f"Timetable for {day}: " + '; '.join(lessons)


def _lesson_text(s):
    when = f"P{s.period}" + (f" {s.start_time}" if s.start_time else '')
    where = f" ({s.room})" if s.room else ''
    return f"{when} {s.subject} {class_label(s.grade, s.section)}{where}"


def week_for(teacher_name):
    """[(day, [lesson text, ...])] for the teacher's whole week, in school-day order."""
    from timetable.models import DAYS
    slots = [s for s in TimetableSlot.objects.order_by('period')
             if norm(s.teacher_name) == norm(teacher_name)]
    out = []
    for day, _ in DAYS:
        lessons = [_lesson_text(s) for s in slots if s.day == day]
        if lessons:
            out.append((day, lessons))
    return out


def published_sms(teacher_name, school):
    """Short SMS telling a teacher the timetable is out, with their week."""
    week = week_for(teacher_name)
    if not week:
        return f"{school}: the timetable has been published. You have no lessons assigned."
    days = ' | '.join(f"{d[:3]}: " + '; '.join(ls) for d, ls in week)
    return f"{school}: the timetable has been published. Your week - {days}"


def published_email(teacher_name, school):
    """(subject, body) for the same announcement, laid out one day per paragraph."""
    week = week_for(teacher_name)
    lines = [f"Hello {teacher_name},", '', "The timetable has been published."]
    if week:
        lines += ['', 'Your lessons this week:']
        for day, lessons in week:
            lines += ['', day] + [f"  {x}" for x in lessons]
    else:
        lines += ['', 'You have no lessons assigned.']
    lines += ['', 'Please check the timetable page for any later changes.']
    return f"{school}: timetable published", '\n'.join(lines)


def clash_alert_messages():
    """{normalised teacher name: message} for every teacher involved in a clash."""
    per_teacher = defaultdict(list)
    for clash in all_clashes():
        a, b = clash['slots']
        text = (f"{CLASH_WORDS[clash['type']]} {clash['name']} double-booked "
                f"{clash['day'][:3]} P{clash['period']} ({a['subject']} vs {b['subject']})")
        for slot in clash['slots']:
            if text not in per_teacher[norm(slot['teacher_name'])]:
                per_teacher[norm(slot['teacher_name'])].append(text)
    return {
        name: "Timetable clash: " + '; '.join(lines)
              + ". Please contact the timetable office."
        for name, lines in per_teacher.items() if name
    }
