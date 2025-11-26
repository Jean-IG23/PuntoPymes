from rest_framework import viewsets
from .models import Empleado, Contrato, DocumentoEmpleado, EventoAsistencia, SolicitudAusencia, TipoAusencia
from .serializers import (
    EmpleadoSerializer, ContratoSerializer, DocumentoSerializer, 
    EventoAsistenciaSerializer, SolicitudSerializer, TipoAusenciaSerializer
)

class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all(); serializer_class = EmpleadoSerializer

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all(); serializer_class = ContratoSerializer

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all(); serializer_class = DocumentoSerializer

class EventoAsistenciaViewSet(viewsets.ModelViewSet):
    queryset = EventoAsistencia.objects.all(); serializer_class = EventoAsistenciaSerializer

class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all(); serializer_class = SolicitudSerializer

class TipoAusenciaViewSet(viewsets.ModelViewSet):
    queryset = TipoAusencia.objects.all(); serializer_class = TipoAusenciaSerializer