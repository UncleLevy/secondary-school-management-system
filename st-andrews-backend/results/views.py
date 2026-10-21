from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import ExamResult
from .serializers import ExamResultSerializer
from teachers.models import ClassAssignment
from students.models import Student

def _teacher_allowed_scope(user):
    """Returns (allowed_student_ids, allowed_subjects) for a teacher's assigned classes."""
    assignments = ClassAssignment.objects.filter(teacher_email=user.email)
    allowed_student_ids = set()
    allowed_subjects = set()
    for a in assignments:
        filters = {'grade': a.grade}
        if a.section:
            filters['section'] = a.section
        allowed_student_ids.update(
            Student.objects.filter(**filters).values_list('id', flat=True)
        )
        allowed_subjects.add(a.subject)
    return allowed_student_ids, allowed_subjects

class ExamResultViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultSerializer
    # All authenticated staff (admin/management/teacher) can record results;
    # get_queryset/perform_create scope teachers to their own assigned classes/subjects.
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ExamResult.objects.all().order_by('-created_at')
        if user.role == 'teacher':
            allowed_student_ids, allowed_subjects = _teacher_allowed_scope(user)
            qs = qs.filter(student_id__in=allowed_student_ids, subject__in=allowed_subjects)
        # admin and management see all exam results
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            allowed_student_ids, allowed_subjects = _teacher_allowed_scope(user)
            student = serializer.validated_data.get('student')
            subject = serializer.validated_data.get('subject')
            if student.id not in allowed_student_ids or subject not in allowed_subjects:
                raise PermissionDenied("You are not assigned to teach this student's class/subject.")
        serializer.save()
