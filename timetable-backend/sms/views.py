from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from teachers.models import Teacher
from users.permissions import IsAdminOrManagement
from . import service
from .messages import clash_alert_messages, norm, timetable_message
from .models import SMSLog
from .serializers import SMSLogSerializer, SendSMSSerializer, SendTimetableSerializer


def deliver(request, messages, kind):
    """Send [(recipient name, phone, body), ...], log each, and summarise."""
    results = []
    for name, phone, body in messages:
        try:
            sid = service.send_sms(phone, body)
            outcome, error = 'Sent', ''
        except service.SMSError as exc:
            sid, outcome, error = '', 'Failed', str(exc)
        SMSLog.objects.create(recipient_name=name, phone=phone, body=body, kind=kind,
                              status=outcome, provider_sid=sid, error=error,
                              sent_by=request.user)
        results.append({'recipient': name, 'phone': phone, 'status': outcome, 'error': error})
    return results


def respond(results, skipped):
    return Response({
        'sent': sum(r['status'] == 'Sent' for r in results),
        'failed': sum(r['status'] == 'Failed' for r in results),
        'skipped': skipped,
        'results': results,
    })


def not_configured():
    return Response({'detail': 'SMS is not configured yet. Add the Twilio credentials '
                               'to the backend .env file.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE)


class SMSViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """SMS history plus actions that send messages to teachers."""
    queryset = SMSLog.objects.select_related('sent_by')
    serializer_class = SMSLogSerializer
    permission_classes = [IsAdminOrManagement]

    def _teachers(self, ids=None):
        qs = Teacher.objects.filter(status='Active')
        return qs.filter(id__in=ids) if ids is not None else qs

    @action(detail=False, methods=['get'], url_path='status')
    def sms_status(self, request):
        return Response({'configured': service.is_configured()})

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        """Send the same custom message to the chosen teachers."""
        data = SendSMSSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if not service.is_configured():
            return not_configured()
        messages, skipped = [], []
        for t in self._teachers(data.validated_data['teacher_ids']):
            if service.normalize_phone(t.phone):
                messages.append((t.full_name, t.phone, data.validated_data['message']))
            else:
                skipped.append({'recipient': t.full_name, 'reason': 'No valid phone number'})
        return respond(deliver(request, messages, 'Custom'), skipped)

    @action(detail=False, methods=['post'], url_path='send-timetable')
    def send_timetable(self, request):
        """Text each teacher their lessons for the chosen day."""
        data = SendTimetableSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if not service.is_configured():
            return not_configured()
        day = data.validated_data['day']
        messages, skipped = [], []
        for t in self._teachers(data.validated_data.get('teacher_ids')):
            if not service.normalize_phone(t.phone):
                skipped.append({'recipient': t.full_name, 'reason': 'No valid phone number'})
                continue
            body = timetable_message(t.full_name, day)
            if body is None:
                skipped.append({'recipient': t.full_name, 'reason': f'No lessons on {day}'})
                continue
            messages.append((t.full_name, t.phone, body))
        return respond(deliver(request, messages, 'Timetable'), skipped)

    @action(detail=False, methods=['post'], url_path='send-clash-alerts')
    def send_clash_alerts(self, request):
        """Warn every teacher involved in a current timetable clash."""
        alerts = clash_alert_messages()
        if not alerts:
            return Response({'sent': 0, 'failed': 0, 'skipped': [], 'results': [],
                             'detail': 'There are no timetable clashes to report.'})
        if not service.is_configured():
            return not_configured()
        messages, skipped = [], []
        teachers = {norm(t.full_name): t for t in self._teachers()}
        for name, body in alerts.items():
            teacher = teachers.get(name)
            if teacher is None:
                skipped.append({'recipient': name, 'reason': 'Not found in Teachers'})
            elif not service.normalize_phone(teacher.phone):
                skipped.append({'recipient': teacher.full_name, 'reason': 'No valid phone number'})
            else:
                messages.append((teacher.full_name, teacher.phone, body))
        return respond(deliver(request, messages, 'Clash Alert'), skipped)
