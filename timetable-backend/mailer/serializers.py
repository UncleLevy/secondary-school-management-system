from rest_framework import serializers
from timetable.models import DAYS
from .models import EmailLog


class EmailLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailLog
        fields = ['id', 'recipient_name', 'email', 'subject', 'body', 'kind', 'status',
                  'error', 'sent_by_name', 'created_at']

    def get_sent_by_name(self, obj):
        return (obj.sent_by.get_full_name() or obj.sent_by.username) if obj.sent_by else ''


class SendEmailSerializer(serializers.Serializer):
    teacher_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    subject = serializers.CharField(max_length=150)
    message = serializers.CharField(max_length=5000)


class SendEmailTimetableSerializer(serializers.Serializer):
    teacher_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    day = serializers.ChoiceField(choices=[d for d, _ in DAYS])
