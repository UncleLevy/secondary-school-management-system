from django.db import models

GRADES   = [(f'Grade {i}', f'Grade {i}') for i in range(1, 13)]
SECTIONS = [('A','A'),('B','B'),('C','C'),('D','D')]
SUBJECTS = [
    ('Mathematics','Mathematics'), ('English','English'),
    ('Science','Science'), ('Social Studies','Social Studies'),
    ('ICT','ICT'), ('Religious Education','Religious Education'),
    ('Creative Arts','Creative Arts'), ('Physical Education','Physical Education'),
    ('Home Economics','Home Economics'), ('French','French'),
]
TERMS = [('Term 1','Term 1'),('Term 2','Term 2'),('Term 3','Term 3')]

class Teacher(models.Model):
    STATUS = [('Active','Active'),('Inactive','Inactive')]

    user_email  = models.EmailField(unique=True)
    full_name   = models.CharField(max_length=200)
    phone       = models.CharField(max_length=30, blank=True)
    subjects    = models.JSONField(default=list, blank=True)
    status      = models.CharField(max_length=10, choices=STATUS, default='Active')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.full_name

class ClassAssignment(models.Model):
    teacher       = models.ForeignKey(Teacher, on_delete=models.CASCADE,
                                    related_name='assignments')
    teacher_name  = models.CharField(max_length=200)
    teacher_email = models.EmailField()
    grade         = models.CharField(max_length=20, choices=GRADES)
    section       = models.CharField(max_length=5, choices=SECTIONS, blank=True)
    subject       = models.CharField(max_length=50, choices=SUBJECTS)
    term          = models.CharField(max_length=10, choices=TERMS)
    year          = models.IntegerField()
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('teacher', 'grade', 'section', 'subject', 'term', 'year')

    def __str__(self):
        return f"{self.teacher_name} — {self.grade}{self.section} {self.subject}"