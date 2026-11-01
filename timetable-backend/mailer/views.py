from django.conf import settings
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from sms.messages import clash_alert_messages, norm, timetable_message
from teachers.models import Teacher
from users.permissions import IsAdminOrManagement
from . import service
from .models import EmailLog
from .serializers import EmailLogSerializer, SendEmailSerializer, SendEmailTimetableSerializer


def deliver(request, messages, kind):
    """Send [(name, email, subject, body), ...], log each, and summarise."""
    results = []
    for name, email, subject, body in messages:
        try:
            service.send_email(email, subject, body)
            outcome, error = 'Sent', ''
        except service.EmailError as exc:
            outcome, error = 'Failed', str(exc)
        EmailLog.objects.create(recipient_name=name, email=email, subject=subject, body=body,
                                kind=kind, status=outcome, error=error, sent_by=request.user)
        results.append({'recipient': name, 'email': email, 'status': outcome, 'error': error})
    return results


def respond(results, skipped):
    return Response({
        'sent': sum(r['status'] == 'Sent' for r in results),
        'failed': sum(r['status'] == 'Failed' for r in results),
        'skipped': skipped,
        'results': results,
    })


def not_configured():
    return Response({'detail': 'Email is not configured yet. Add EMAIL_HOST_USER and '
                               'EMAIL_HOST_PASSWORD (and set EMAIL_BACKEND to the SMTP backend) '
                               'in the backend .env file.'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _subject(text):
    return f"{settings.SCHOOL_NAME}: {text}"


class EmailViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Email history plus actions that email teachers."""
    queryset = EmailLog.objects.select_related('sent_by')
    serializer_class = EmailLogSerializer
    permission_classes = [IsAdminOrManagement]

    def _teachers(self, ids=None):
        qs = Teacher.objects.filter(status='Active')
        return qs.filter(id__in=ids) if ids is not None else qs

    @action(detail=False, methods=['get'], url_path='status')
    def email_status(self, request):
        return Response({'configured': service.is_configured(),
                         'real_delivery': service.is_real_delivery()})

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        data = SendEmailSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if not service.is_configured():
            return not_configured()
        messages, skipped = [], []
        for t in self._teachers(data.validated_data['teacher_ids']):
            if service.is_valid_email(t.user_email):
                messages.append((t.full_name, t.user_email,
                                 _subject(data.validated_data['subject']),
                                 data.validated_data['message']))
            else:
                skipped.append({'recipient': t.full_name, 'reason': 'No valid email address'})
        return respond(deliver(request, messages, 'Custom'), skipped)

    @action(detail=False, methods=['post'], url_path='send-timetable')
    def send_timetable(self, request):
        data = SendEmailTimetableSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        if not service.is_configured():
            return not_configured()
        day = data.validated_data['day']
        messages, skipped = [], []
        for t in self._teachers(data.validated_data.get('teacher_ids')):
            if not service.is_valid_email(t.user_email):
                skipped.append({'recipient': t.full_name, 'reason': 'No valid email address'})
                continue
            body = timetable_message(t.full_name, day)
            if body is None:
                skipped.append({'recipient': t.full_name, 'reason': f'No lessons on {day}'})
                continue
            messages.append((t.full_name, t.user_email, _subject(f'your {day} timetable'), body))
        return respond(deliver(request, messages, 'Timetable'), skipped)

    @action(detail=False, methods=['post'], url_path='send-clash-alerts')
    def send_clash_alerts(self, request):
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
            elif not service.is_valid_email(teacher.user_email):
                skipped.append({'recipient': teacher.full_name, 'reason': 'No valid email address'})
            else:
                messages.append((teacher.full_name, teacher.user_email,
                                 _subject('timetable clash'), body))
        return respond(deliver(request, messages, 'Clash Alert'), skipped)
