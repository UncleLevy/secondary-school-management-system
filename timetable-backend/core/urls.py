from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from teachers.views import TeacherViewSet, ClassAssignmentViewSet
from timetable.views import TimetableSlotViewSet
from sms.views import SMSViewSet
from mailer.views import EmailViewSet
from users.views import (MeView, ChangePasswordView, LoginView, LoginVerifyView,
                         LoginResendView, ForgotPasswordView, ResetPasswordView)
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter()
router.register(r'teachers',           TeacherViewSet)
router.register(r'class-assignments',  ClassAssignmentViewSet, basename='classassignment')
router.register(r'timetable',          TimetableSlotViewSet, basename='timetableslot')
router.register(r'sms',                SMSViewSet, basename='sms')
router.register(r'email',              EmailViewSet, basename='email')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/',   LoginView.as_view()),
    path('api/auth/login/verify/', LoginVerifyView.as_view()),
    path('api/auth/login/resend/', LoginResendView.as_view()),
    path('api/auth/forgot-password/', ForgotPasswordView.as_view()),
    path('api/auth/reset-password/',  ResetPasswordView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/',      MeView.as_view()),
    path('api/auth/change-password/', ChangePasswordView.as_view()),
]