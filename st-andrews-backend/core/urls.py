from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from teachers.views import TeacherViewSet, ClassAssignmentViewSet
from students.views import StudentViewSet
from attendance.views import AttendanceViewSet
from results.views import ExamResultViewSet
from communications.views import ParentMessageViewSet
from timetable.views import TimetableSlotViewSet
from users.views import MeView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'teachers',           TeacherViewSet)
router.register(r'class-assignments',  ClassAssignmentViewSet, basename='classassignment')
router.register(r'students',           StudentViewSet, basename='student')
router.register(r'attendance',         AttendanceViewSet, basename='attendance')
router.register(r'results',            ExamResultViewSet, basename='examresult')
router.register(r'communications',     ParentMessageViewSet)
router.register(r'timetable',          TimetableSlotViewSet, basename='timetableslot')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/login/',   TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/',      MeView.as_view()),
]