from django.db import models
from students.models import Student

class ExamResult(models.Model):
    TERMS    = [('Term 1','Term 1'),('Term 2','Term 2'),('Term 3','Term 3')]
    SUBJECTS = [
        ('Mathematics','Mathematics'), ('English','English'),
        ('Science','Science'), ('Social Studies','Social Studies'),
        ('ICT','ICT'), ('Religious Education','Religious Education'),
        ('Creative Arts','Creative Arts'), ('Physical Education','Physical Education'),
        ('Home Economics','Home Economics'), ('French','French'),
    ]
    GRADE_LETTERS = [('A+','A+'),('A','A'),('B+','B+'),('B','B'),('C+','C+'),
                    ('C','C'),('D','D'),('E','E'),('F','F')]

    student      = models.ForeignKey(Student, on_delete=models.CASCADE)
    student_name = models.CharField(max_length=200, blank=True)
    grade        = models.CharField(max_length=20, blank=True)
    subject      = models.CharField(max_length=50, choices=SUBJECTS)
    score        = models.DecimalField(max_digits=5, decimal_places=2)
    grade_letter = models.CharField(max_length=3, choices=GRADE_LETTERS, blank=True)
    term         = models.CharField(max_length=10, choices=TERMS)
    year         = models.IntegerField()
    remarks      = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

