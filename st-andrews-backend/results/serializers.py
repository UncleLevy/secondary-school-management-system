from rest_framework import serializers
from .models import ExamResult
from students.models import Student

class ExamResultSerializer(serializers.ModelSerializer):
    student_id = serializers.PrimaryKeyRelatedField(source='student', queryset=Student.objects.all())
    score = serializers.DecimalField(max_digits=5, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = ExamResult
        fields = ['id', 'student_id', 'student_name', 'grade', 'subject', 'score',
                  'grade_letter', 'term', 'year', 'remarks', 'created_at']
