from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer

class MeView(RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user



class ChangePasswordView(APIView):
    """Any signed-in user can change their own password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current = request.data.get('current_password') or ''
        new = request.data.get('new_password') or ''
        if not user.check_password(current):
            return Response({'detail': 'Your current password is incorrect.'}, status=400)
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)
        user.set_password(new)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password changed.'})
