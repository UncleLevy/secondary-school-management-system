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


# ---------------------------------------------------------------- sign-in with OTP
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from . import otp

CHALLENGE_SALT = 'users.login-challenge'


def _tokens(user):
    refresh = RefreshToken.for_user(user)
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


def _user_from_challenge(token):
    try:
        uid = signing.loads(token or '', salt=CHALLENGE_SALT,
                            max_age=settings.OTP_TTL_MINUTES * 60)
    except signing.BadSignature:
        return None
    return get_user_model().objects.filter(pk=uid, is_active=True).first()


class LoginView(TokenObtainPairView):
    """Password check. Teachers (and anyone else OTP is required for) must then enter a code
    that is sent by email and, when a phone number is on file, by SMS."""

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code != 200:
            return response
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.user
        # Skip only when OTP is not needed, or there is nowhere at all to send a code.
        if not otp.required_for_login(user) or not (user.email or otp.teacher_phone(user)):
            return response
        try:
            channels = otp.issue(user, 'login')
        except otp.OTPError as exc:
            return Response({'detail': str(exc)}, status=429 if 'wait' in str(exc) else 503)
        return Response({'otp_required': True,
                         'challenge': signing.dumps(user.pk, salt=CHALLENGE_SALT),
                         'channels': channels})


class LoginVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        user = _user_from_challenge(request.data.get('challenge'))
        if user is None:
            return Response({'detail': 'Your sign-in session expired. Please sign in again.'},
                            status=400)
        try:
            otp.verify(user, 'login', request.data.get('code'))
        except otp.OTPError as exc:
            return Response({'detail': str(exc)}, status=400)
        return Response(_tokens(user))


class LoginResendView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        user = _user_from_challenge(request.data.get('challenge'))
        if user is None:
            return Response({'detail': 'Your sign-in session expired. Please sign in again.'},
                            status=400)
        try:
            channels = otp.issue(user, 'login')
        except otp.OTPError as exc:
            return Response({'detail': str(exc)}, status=429 if 'wait' in str(exc) else 503)
        return Response({'detail': 'A new code has been sent.', 'channels': channels})


# ---------------------------------------------------------------- forgot password
GENERIC_FORGOT = {'detail': 'If an account uses that email address, a reset code has been sent.'}


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first() \
            if email else None
        if user:
            try:
                otp.issue(user, 'reset')
            except otp.OTPError:
                pass   # same answer either way, so the form cannot reveal which emails exist
        return Response(GENERIC_FORGOT)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        new = request.data.get('new_password') or ''
        user = get_user_model().objects.filter(email__iexact=email, is_active=True).first() \
            if email else None
        if user is None:
            return Response({'detail': 'That code is incorrect or has expired.'}, status=400)
        try:
            validate_password(new, user)
        except DjangoValidationError as e:
            return Response({'detail': ' '.join(e.messages)}, status=400)
        try:
            otp.verify(user, 'reset', request.data.get('code'))
        except otp.OTPError as exc:
            return Response({'detail': str(exc)}, status=400)
        user.set_password(new)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset. You can sign in now.'})
