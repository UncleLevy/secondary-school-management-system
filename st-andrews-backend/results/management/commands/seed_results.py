import random

from django.core.management.base import BaseCommand

from results.models import ExamResult
from students.models import Student

SUBJECTS = [s[0] for s in ExamResult.SUBJECTS]
REMARKS = [
    "Good effort this term.", "Needs to focus more in class.",
    "Excellent performance, keep it up!", "Shows steady improvement.",
    "Struggling with core concepts, extra support recommended.",
    "Consistent and hard-working.", "", "", "",
]


def grade_letter(score):
    if score >= 90: return "A+"
    if score >= 80: return "A"
    if score >= 75: return "B+"
    if score >= 70: return "B"
    if score >= 65: return "C+"
    if score >= 60: return "C"
    if score >= 50: return "D"
    if score >= 40: return "E"
    return "F"


class Command(BaseCommand):
    help = "Seed exam results for every active student across all subjects for given terms."

    def add_arguments(self, parser):
        parser.add_argument("--terms", nargs="+", default=["Term 1", "Term 2"])
        parser.add_argument("--year", type=int, default=2026)

    def handle(self, *args, **options):
        terms = options["terms"]
        year = options["year"]
        students = list(Student.objects.filter(status="Active"))

        records = []
        for student in students:
            # Each student has a consistent ability level so scores cluster
            # realistically per-student (producing genuine top performers and
            # at-risk students), rather than every score being an independent
            # draw from the same distribution.
            ability = min(95, max(25, random.gauss(65, 18)))
            for term in terms:
                for subject in SUBJECTS:
                    score = round(min(100, max(0, random.gauss(ability, 8))), 2)
                    records.append(ExamResult(
                        student=student,
                        student_name=f"{student.first_name} {student.last_name}",
                        grade=student.grade,
                        subject=subject,
                        score=score,
                        grade_letter=grade_letter(score),
                        term=term,
                        year=year,
                        remarks=random.choice(REMARKS),
                    ))

        ExamResult.objects.bulk_create(records)
        self.stdout.write(self.style.SUCCESS(
            f"Created {len(records)} exam results for {len(students)} students across {len(terms)} term(s)."
        ))
