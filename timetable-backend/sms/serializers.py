from rest_framework import serializers
from timetable.models import DAYS
from .models import SMSLog

MAX_SMS_LENGTH = 612  # four concatenated SMS segments


class SMSLogSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SMSLog
        fields = ['id', 'recipient_name', 'phone', 'body', 'kind', 'status',
                  'error', 'sent_by_name', 'created_at']

    def get_sent_by_name(self, obj):
        return (obj.sent_by.get_full_name() or obj.sent_by.username) if obj.sent_by else ''


class SendSMSSerializer(serializers.Serializer):
    teacher_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    message = serializers.CharField(max_length=MAX_SMS_LENGTH)


class SendTimetableSerializer(serializers.Serializer):
    teacher_ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    day = serializers.ChoiceField(choices=[d for d, _ in DAYS])
