"""Timetable clash detection.

A clash is two slots that fall on the same day and period and share a
teacher, a room, or a class (grade + section). This module is the single
source of truth for that rule: the API endpoints, the serializer validation
and the dashboard all use it.
"""
from collections import defaultdict

from .models import TimetableSlot

CLASH_TEACHER = 'teacher'
CLASH_ROOM = 'room'
CLASH_CLASS = 'class'


def _norm(value):
    return (value or '').strip().lower()


def class_label(grade, section):
    return f"{grade}{'-' + section if section else ''}"


def _same_class(a_grade, a_section, b_grade, b_section):
    """Same grade, and the same section. A slot with no section is treated as
    the whole grade, so it overlaps every section of that grade."""
    if not a_grade or a_grade != b_grade:
        return False
    a_section, b_section = a_section or '', b_section or ''
    return not a_section or not b_section or a_section == b_section


def _slot_summary(slot):
    return {
        'id': slot.id,
        'subject': slot.subject,
        'teacher_name': slot.teacher_name,
        'grade': slot.grade,
        'section': slot.section,
        'room': slot.room,
    }


def _pair_clashes(a, b):
    """Clashes between two slots already known to share a day and period."""
    found = []
    if _norm(a.teacher_name) and _norm(a.teacher_name) == _norm(b.teacher_name):
        found.append((CLASH_TEACHER, a.teacher_name))
    if _norm(a.room) and _norm(a.room) == _norm(b.room):
        found.append((CLASH_ROOM, a.room))
    if _same_class(a.grade, a.section, b.grade, b.section):
        found.append((CLASH_CLASS, class_label(a.grade, a.section)))
    return found


def find_clashes(day, period, teacher_name='', room='', grade='', section='',
                 exclude_id=None):
    """Clashes a proposed slot would cause against the saved timetable."""
    proposed = TimetableSlot(day=day, period=period, teacher_name=teacher_name or '',
                             room=room or '', grade=grade or '', section=section or '')
    existing = TimetableSlot.objects.filter(day=day, period=period)
    if exclude_id:
        existing = existing.exclude(pk=exclude_id)

    clashes = []
    for slot in existing:
        for kind, name in _pair_clashes(proposed, slot):
            clashes.append({
                'type': kind,
                'name': name,
                'day': day,
                'period': period,
                'conflicts_with': _slot_summary(slot),
            })
    return clashes


def describe(clash):
    """Human-readable one-liner for a clash dict."""
    other = clash['conflicts_with']
    where = f"{clash['day']}, Period {clash['period']}"
    label = {'teacher': 'Teacher', 'room': 'Room', 'class': 'Class'}[clash['type']]
    return (f"{label} {clash['name']} is already booked on {where} "
            f"({other['subject']}, {other['teacher_name']}, "
            f"{class_label(other['grade'], other['section'])}"
            f"{', ' + other['room'] if other['room'] else ''}).")


def all_clashes():
    """Every clash in the saved timetable, one entry per clashing slot pair."""
    by_period = defaultdict(list)
    for slot in TimetableSlot.objects.all():
        by_period[(slot.day, slot.period)].append(slot)

    clashes = []
    for (day, period), slots in by_period.items():
        for i, a in enumerate(slots):
            for b in slots[i + 1:]:
                for kind, name in _pair_clashes(a, b):
                    clashes.append({
                        'type': kind,
                        'name': name,
                        'day': day,
                        'period': period,
                        'slot_ids': [a.id, b.id],
                        'slots': [_slot_summary(a), _slot_summary(b)],
                    })
    return clashes
