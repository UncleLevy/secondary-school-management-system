from rest_framework import serializers
from .models import Attendance
from students.models import Student

class AttendanceSerializer(serializers.ModelSerializer):
    student_id = serializers.PrimaryKeyRelatedField(source='student', queryset=Student.objects.all())

    class Meta:
        model = Attendance
        fields = ['id', 'student_id', 'student_name', 'grade', 'date', 'status', 'created_at']
