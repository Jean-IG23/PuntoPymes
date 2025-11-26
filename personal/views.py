from rest_framework import viewsets
# Importamos modelos y serializers
from .models import (
    Empleado, Contrato, DocumentoEmpleado, 
    EventoAsistencia, SolicitudAusencia, TipoAusencia, Jornada
)
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    EventoAsistenciaSerializer, SolicitudSerializer, TipoAusenciaSerializer,
    JornadaSerializer
)

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    # Tip: Aquí se podrían agregar filtros (ej. buscar por cédula)

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all()
    serializer_class = DocumentoSerializer

class EventoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EventoAsistencia.objects.all()
    serializer_class = EventoAsistenciaSerializer

class JornadaViewSet(viewsets.ModelViewSet):
    queryset = Jornada.objects.all()
    serializer_class = JornadaSerializer

class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all()
    serializer_class = TipoAusenciaSerializer

class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all()
    serializer_class = SolicitudSerializer