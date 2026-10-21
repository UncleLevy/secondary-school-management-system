from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from .models import Attendance
from .serializers import AttendanceSerializer
from teachers.models import ClassAssignment
from students.models import Student

def _teacher_allowed_student_ids(user):
    assignments = ClassAssignment.objects.filter(teacher_email=user.email)
    allowed_ids = set()
    for a in assignments:
        filters = {'grade': a.grade}
        if a.section:
            filters['section'] = a.section
        allowed_ids.update(Student.objects.filter(**filters).values_list('id', flat=True))
    return allowed_ids

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    # All authenticated staff (admin/management/teacher) can record attendance;
    # get_queryset/perform_create scope teachers to their own assigned classes.
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.all().order_by('-date')
        if user.role == 'teacher':
            qs = qs.filter(student_id__in=_teacher_allowed_student_ids(user))
        # admin and management see all attendance records
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'teacher':
            student = serializer.validated_data.get('student')
            if student.id not in _teacher_allowed_student_ids(user):
                raise PermissionDenied("You are not assigned to this student's class.")
        serializer.save()
