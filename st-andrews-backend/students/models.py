from django.db import models

class Student(models.Model):
    GENDER   = [('Male', 'Male'), ('Female', 'Female')]
    GRADES   = [(f'Grade {i}', f'Grade {i}') for i in range(1, 13)]
    SECTIONS = [('A','A'),('B','B'),('C','C'),('D','D')]
    STATUS   = [('Active','Active'),('Inactive','Inactive'),
                ('Transferred','Transferred'),('Graduated','Graduated')]

    first_name      = models.CharField(max_length=100)
    last_name       = models.CharField(max_length=100)
    gender          = models.CharField(max_length=10, choices=GENDER)
    date_of_birth   = models.DateField(null=True, blank=True)
    grade           = models.CharField(max_length=20, choices=GRADES)
    section         = models.CharField(max_length=5, choices=SECTIONS, blank=True)
    guardian_name   = models.CharField(max_length=150, blank=True)
    guardian_phone  = models.CharField(max_length=20, blank=True)
    guardian_email  = models.EmailField(blank=True)
    address         = models.TextField(blank=True)
    enrollment_date = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=STATUS, default='Active')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"