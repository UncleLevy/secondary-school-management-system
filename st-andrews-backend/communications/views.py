import resend
from django.conf import settings
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from sms import service as sms_service
from sms.models import SMSLog
from users.permissions import IsAdminOrManagement
from .models import ParentMessage
from .serializers import ParentMessageSerializer

class ParentMessageViewSet(viewsets.ModelViewSet):
    queryset = ParentMessage.objects.all().order_by('-created_at')
    serializer_class = ParentMessageSerializer
    # Only admin and management can access Communications
    permission_classes = [IsAdminOrManagement]

    @action(detail=True, methods=['post'], url_path='send')
    def send_message(self, request, pk=None):
        msg = self.get_object()
        try:
            if msg.channel == 'Email' and msg.guardian_email:
                resend.api_key = settings.RESEND_API_KEY
                resend.Emails.send({
                    'from': settings.EMAIL_FROM,
                    'to': msg.guardian_email,
                    'subject': msg.subject,
                    'html': msg.body,
                })
            elif msg.channel == 'SMS':
                phone = msg.student.guardian_phone
                if not phone:
                    raise ValueError('This student has no guardian phone number.')
                body = strip_tags(msg.body)
                sid = sms_service.send_sms(phone, body)
                SMSLog.objects.create(recipient_name=msg.guardian_name or msg.student_name,
                                      phone=phone, body=body, kind='Parent Message',
                                      status='Sent', provider_sid=sid, sent_by=request.user)
            msg.status = 'Sent'
            msg.sent_at = timezone.now()
            msg.save()
            return Response({'status': 'Sent'})
        except Exception as e:
            msg.status = 'Failed'
            msg.save()
            return Response({'status': 'Failed', 'error': str(e)}, status=500)