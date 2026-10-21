import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from attendance.models import Attendance
from students.models import Student

STATUS_WEIGHTS = [("Present", 85), ("Absent", 8), ("Late", 4), ("Excused", 3)]


def weighted_status():
    statuses, weights = zip(*STATUS_WEIGHTS)
    return random.choices(statuses, weights=weights, k=1)[0]


def school_days(n):
    """Return the last n weekdays (Mon-Fri), most recent first, ending today."""
    days = []
    d = date.today()
    while len(days) < n:
        if d.weekday() < 5:
            days.append(d)
        d -= timedelta(days=1)
    return days


class Command(BaseCommand):
    help = "Seed attendance records for the last N school days for every student."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=15)

    def handle(self, *args, **options):
        days = school_days(options["days"])
        students = list(Student.objects.filter(status="Active"))

        records = []
        for student in students:
            for d in days:
                records.append(Attendance(
                    student=student,
                    student_name=f"{student.first_name} {student.last_name}",
                    grade=student.grade,
                    date=d,
                    status=weighted_status(),
                ))

        Attendance.objects.bulk_create(records, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(
            f"Created up to {len(records)} attendance records for {len(students)} students across {len(days)} school days."
        ))
