from rest_framework import viewsets
from users.permissions import IsAdminOrReadOnly
from .models import Student
from .serializers import StudentSerializer
from teachers.models import ClassAssignment

class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    # Admin can write; management/teacher are read-only
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        qs = Student.objects.all().order_by('-created_at')
        if user.role == 'teacher':
            # Scope to teacher's assigned grade/section students
            assignments = ClassAssignment.objects.filter(teacher_email=user.email)
            allowed_grades_sections = set()
            for a in assignments:
                allowed_grades_sections.add((a.grade, a.section))
            # Filter students matching any (grade, section) pair
            from django.db.models import Q
            q = Q()
            for grade, section in allowed_grades_sections:
                if section:
                    q |= Q(grade=grade, section=section)
                else:
                    q |= Q(grade=grade)
            qs = qs.filter(q) if allowed_grades_sections else qs.none()
        # admin and management see all students (no filtering)
        return qs