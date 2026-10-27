from rest_framework import serializers
from . import accounts
from .models import Teacher, ClassAssignment

class TeacherSerializer(serializers.ModelSerializer):
    has_account = serializers.SerializerMethodField()
    account_active = serializers.SerializerMethodField()

    def get_has_account(self, obj):
        return accounts.get_account(obj) is not None

    def get_account_active(self, obj):
        user = accounts.get_account(obj)
        return bool(user and user.is_active)

    class Meta:
        model = Teacher
        fields = '__all__'

class ClassAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassAssignment
        fields = '__all__'

