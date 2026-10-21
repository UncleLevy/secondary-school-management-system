from rest_framework import viewsets
from users.permissions import IsAdminOrReadOnly
from .models import TimetableSlot
from .serializers import TimetableSlotSerializer

class TimetableSlotViewSet(viewsets.ModelViewSet):
    queryset = TimetableSlot.objects.all()
    serializer_class = TimetableSlotSerializer
    permission_classes = [IsAdminOrReadOnly]
