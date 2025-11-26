from rest_framework import viewsets
from .models import EventoAsistencia
from .serializers import EventoAsistenciaSerializer

class EventoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EventoAsistencia.objects.all() # <-- Nombre nuevo
    serializer_class = EventoAsistenciaSerializer