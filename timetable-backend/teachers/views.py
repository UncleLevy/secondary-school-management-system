from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsAdmin, IsAdminOrReadOnly
from .models import Teacher, ClassAssignment
from .serializers import TeacherSerializer, ClassAssignmentSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all().order_by('-created_at')
    serializer_class = TeacherSerializer
    # Admin can write; management/teacher are read-only
    permission_classes = [IsAdminOrReadOnly]

class ClassAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ClassAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = ClassAssignment.objects.all()
        email = self.request.query_params.get('teacher_email')
        if email:
            qs = qs.filter(teacher_email=email)
        return qs