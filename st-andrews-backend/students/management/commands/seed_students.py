import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from students.models import Student

MALE_FIRST_NAMES = [
    "Mulenga", "Bwalya", "Chanda", "Chola", "Kunda", "Mwaba", "Kelvin", "Given",
    "Blessings", "Frackson", "Emmanuel", "Davis", "Brian", "Charles", "Felix",
    "Innocent", "Kondwani", "Lubinda", "Obed", "Petros", "Ronald", "Simon",
    "Wisdom", "Yotam", "Mapalo", "Nsofu", "Musenge", "Chungu", "Kayula", "Situmbeko",
]

FEMALE_FIRST_NAMES = [
    "Mutinta", "Bupe", "Natasha", "Grace", "Faith", "Precious", "Memory",
    "Loveness", "Mercy", "Ruth", "Thandiwe", "Nchimunya", "Sepiso", "Namuchana",
    "Sililo", "Chipego", "Fwasa", "Chalwe", "Mwenya", "Chomba", "Kabaso",
    "Lweendo", "Sepo", "Namwinga", "Chibesa", "Chilufya", "Yvonne", "Agnes", "Beauty",
]

SURNAMES = [
    "Mwanza", "Banda", "Phiri", "Mulenga", "Zulu", "Tembo", "Chanda", "Sakala",
    "Lungu", "Chirwa", "Mumba", "Kabwe", "Mwansa", "Musonda", "Chishimba",
    "Kalunga", "Chibwe", "Siame", "Njovu", "Sichone", "Mubita", "Simushi",
    "Kaunda", "Chulu", "Mwale", "Nkonde", "Sinkala", "Mukuka", "Ng'andu",
    "Kangwa", "Bwembya", "Mukupa", "Chibuye", "Silwamba", "Muleya", "Hachintu",
    "Sikaonga", "Kanyanta", "Mwewa",
]

TOWNS = [
    "Kabwata, Lusaka", "Chilenje, Lusaka", "Matero, Lusaka", "Kalingalinga, Lusaka",
    "Chelston, Lusaka", "Woodlands, Lusaka", "Garden, Lusaka", "Ndola", "Kitwe",
    "Livingstone", "Chipata", "Kabwe", "Solwezi", "Mongu", "Choma", "Kasama",
    "Mazabuka", "Chingola", "Mufulira", "Luanshya",
]

PHONE_PREFIXES = ["095", "096", "097", "076", "077"]

GRADES = [f"Grade {i}" for i in range(1, 13)]
SECTIONS = ["A", "B", "C", "D"]


def random_dob_for_grade(grade_label):
    grade_num = int(grade_label.replace("Grade ", ""))
    base_age = grade_num + 5  # Grade 1 ~ age 6
    today = date.today()
    start = today.replace(year=today.year - base_age - 1) + timedelta(days=1)
    end = today.replace(year=today.year - base_age)
    days_span = (end - start).days
    return start + timedelta(days=random.randint(0, max(days_span, 0)))


class Command(BaseCommand):
    help = "Seed the database with dummy Zambian student records."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=50)

    def handle(self, *args, **options):
        count = options["count"]
        male_count = round(count * 0.53)
        female_count = count - male_count

        genders = ["Male"] * male_count + ["Female"] * female_count
        random.shuffle(genders)

        created = 0
        for gender in genders:
            first_name = random.choice(MALE_FIRST_NAMES if gender == "Male" else FEMALE_FIRST_NAMES)
            last_name = random.choice(SURNAMES)
            grade = random.choice(GRADES)
            dob = random_dob_for_grade(grade)
            enrollment_date = date.today() - timedelta(days=random.randint(30, 1500))
            guardian_first = random.choice(MALE_FIRST_NAMES + FEMALE_FIRST_NAMES)
            prefix = random.choice(PHONE_PREFIXES).lstrip("0")
            phone = f"+260{prefix}{random.randint(1000000, 9999999)}"

            Student.objects.create(
                first_name=first_name,
                last_name=last_name,
                gender=gender,
                date_of_birth=dob,
                grade=grade,
                section=random.choice(SECTIONS),
                guardian_name=f"{guardian_first} {last_name}",
                guardian_phone=phone,
                guardian_email="",
                address=random.choice(TOWNS),
                enrollment_date=enrollment_date,
                status="Active",
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Created {created} students ({male_count} Male / {female_count} Female)."
        ))
