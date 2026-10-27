from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.permissions import IsAdmin, IsAdminOrReadOnly
from .models import Teacher, ClassAssignment
from . import accounts
from .serializers import TeacherSerializer, ClassAssignmentSerializer

class TeacherViewSet(viewsets.ModelViewSet):
    queryset = Teacher.objects.all().order_by('-created_at')
    serializer_class = TeacherSerializer
    # Admin can write; management/teacher are read-only
    permission_classes = [IsAdminOrReadOnly]

    def perform_update(self, serializer):
        old = self.get_object()
        user = accounts.get_account(old)
        teacher = serializer.save()
        if user:
            accounts.sync_email(user, teacher)
            user.is_active = teacher.status == 'Active'
            user.save(update_fields=['is_active'])

    def perform_destroy(self, instance):
        user = accounts.get_account(instance)
        if user:
            user.delete()
        instance.delete()

    def _account_response(self, teacher, password=None):
        user = accounts.get_account(teacher)
        data = {'has_account': bool(user), 'account_active': bool(user and user.is_active),
                'username': user.username if user else None}
        if password:
            data['temporary_password'] = password  # shown to the admin once
        return Response(data)

    @action(detail=True, methods=['post'], url_path='create-account', permission_classes=[IsAdmin])
    def create_account(self, request, pk=None):
        teacher = self.get_object()
        try:
            _, password = accounts.create_account(teacher, request.data.get('password') or None)
        except ValueError as e:
            return Response({'detail': str(e)}, status=400)
        except DjangoValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)
        return self._account_response(teacher, password)

    @action(detail=True, methods=['post'], url_path='reset-password', permission_classes=[IsAdmin])
    def reset_password(self, request, pk=None):
        teacher = self.get_object()
        user = accounts.get_account(teacher)
        if not user:
            return Response({'detail': 'This teacher has no account yet.'}, status=404)
        try:
            password = accounts.reset_password(user, request.data.get('password') or None)
        except DjangoValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)
        return self._account_response(teacher, password)

    @action(detail=True, methods=['post'], url_path='set-account-active', permission_classes=[IsAdmin])
    def set_account_active(self, request, pk=None):
        teacher = self.get_object()
        user = accounts.get_account(teacher)
        if not user:
            return Response({'detail': 'This teacher has no account yet.'}, status=404)
        user.is_active = bool(request.data.get('active'))
        user.save(update_fields=['is_active'])
        return self._account_response(teacher)

    @action(detail=True, methods=['delete'], url_path='account', permission_classes=[IsAdmin])
    def delete_account(self, request, pk=None):
        teacher = self.get_object()
        user = accounts.get_account(teacher)
        if user:
            user.delete()
        return self._account_response(teacher)

class ClassAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ClassAssignmentSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        qs = ClassAssignment.objects.all()
        email = self.request.query_params.get('teacher_email')
        if email:
            qs = qs.filter(teacher_email=email)
        return qs