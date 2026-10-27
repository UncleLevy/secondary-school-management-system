from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from teachers.views import TeacherViewSet, ClassAssignmentViewSet
from timetable.views import TimetableSlotViewSet
from sms.views import SMSViewSet
from users.views import MeView, ChangePasswordView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'teachers',           TeacherViewSet)
router.register(r'class-assignments',  ClassAssignmentViewSet, basename='classassignment')
router.register(r'timetable',          TimetableSlotViewSet, basename='timetableslot')
router.register(r'sms',                SMSViewSet, basename='sms')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/',   TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/',      MeView.as_view()),
    path('api/auth/change-password/', ChangePasswordView.as_view()),
]