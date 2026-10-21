import random

from django.core.management.base import BaseCommand

from teachers.models import Teacher, ClassAssignment, GRADES, SECTIONS, SUBJECTS, TERMS

FIRST_NAMES = [
    "Mulenga", "Bwalya", "Chanda", "Kunda", "Mwaba", "Kelvin", "Given", "Emmanuel",
    "Brian", "Charles", "Felix", "Innocent", "Kondwani", "Simon", "Wisdom",
    "Mutinta", "Bupe", "Natasha", "Grace", "Faith", "Precious", "Memory",
    "Mercy", "Ruth", "Thandiwe", "Chipego", "Yvonne", "Agnes", "Beauty", "Chileshe",
]

SURNAMES = [
    "Mwanza", "Banda", "Phiri", "Zulu", "Tembo", "Sakala", "Lungu", "Chirwa",
    "Mumba", "Kabwe", "Musonda", "Chishimba", "Kalunga", "Siame", "Njovu",
    "Sichone", "Mubita", "Kaunda", "Chulu", "Mwale", "Nkonde", "Mukuka",
    "Kangwa", "Mukupa", "Muleya", "Hachintu", "Kanyanta", "Mwewa",
]

PHONE_PREFIXES = ["95", "96", "97", "76", "77"]


class Command(BaseCommand):
    help = "Seed the database with dummy teacher records and class assignments."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=12)

    def handle(self, *args, **options):
        count = options["count"]
        used_emails = set()
        teachers = []

        for i in range(count):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(SURNAMES)
            full_name = f"{first_name} {last_name}"
            email_local = f"{first_name}.{last_name}{i}".lower()
            email = f"{email_local}@standrews.sch.zm"
            while email in used_emails:
                email = f"{email_local}{random.randint(1,999)}@standrews.sch.zm"
            used_emails.add(email)

            phone = f"+260{random.choice(PHONE_PREFIXES)}{random.randint(1000000, 9999999)}"
            subjects = random.sample([s[0] for s in SUBJECTS], k=random.randint(1, 2))

            teacher = Teacher.objects.create(
                user_email=email,
                full_name=full_name,
                phone=phone,
                subjects=subjects,
                status="Active",
            )
            teachers.append(teacher)

        assignments_created = 0
        for teacher in teachers:
            num_assignments = random.randint(2, 4)
            for _ in range(num_assignments):
                grade = random.choice(GRADES)[0]
                section = random.choice(SECTIONS)[0]
                subject = random.choice(teacher.subjects)
                term = "Term 2"
                year = 2026
                _, created = ClassAssignment.objects.get_or_create(
                    teacher=teacher,
                    grade=grade,
                    section=section,
                    subject=subject,
                    term=term,
                    year=year,
                    defaults={
                        "teacher_name": teacher.full_name,
                        "teacher_email": teacher.user_email,
                    },
                )
                if created:
                    assignments_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {len(teachers)} teachers and {assignments_created} class assignments."
        ))
