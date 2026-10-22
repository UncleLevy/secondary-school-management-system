from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from users.permissions import IsAdminOrReadOnly
from .clashes import all_clashes, describe, find_clashes
from .models import TimetableSlot
from .serializers import ClashCheckSerializer, TimetableSlotSerializer

class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.all()
    serializer_class = TimetableSlotSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=['post'], url_path='check-clash',
            permission_classes=[IsAuthenticated])
    def check_clash(self, request):
        """Live warning: would this slot clash with the saved timetable?"""
        data = ClashCheckSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        v = data.validated_data
        clashes = find_clashes(
            day=v['day'], period=v['period'], teacher_name=v['teacher_name'],
            room=v['room'], grade=v['grade'], section=v['section'],
            exclude_id=v.get('id'),
        )
        for c in clashes:
            c['message'] = describe(c)
        return Response({'has_clash': bool(clashes), 'clashes': clashes})

    @action(detail=False, methods=['get'], url_path='clashes',
            permission_classes=[IsAuthenticated])
    def clashes(self, request):
        """Every clash currently in the saved timetable."""
        clashes = all_clashes()
        return Response({'count': len(clashes), 'clashes': clashes})
