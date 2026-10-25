from rest_framework import serializers
from .models import Teacher, ClassAssignment

class TeacherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Teacher
        fields = '__all__'

class ClassAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassAssignment
        fields = '__all__'

