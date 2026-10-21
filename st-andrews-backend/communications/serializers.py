from rest_framework import serializers
from .models import ParentMessage

class ParentMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParentMessage
        fields = '__all__'