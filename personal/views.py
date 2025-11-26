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
    serializer_class = EmpleadoSerializer
    
    # --- AGREGA ESTA LÍNEA AQUÍ ---
    queryset = Empleado.objects.all() 
    # (Esto sirve solo para que el router sepa el nombre base al arrancar)
    # ------------------------------

    def get_queryset(self):
        # Esta función SOBRESCRIBE a la línea de arriba cuando se piden datos
        queryset = Empleado.objects.all()
        
        # Tu lógica de filtro
        dept_id = self.request.query_params.get('departamento')
        empresa_id = self.request.query_params.get('empresa') # Por si acaso filtramos por empresa directa
        
        if dept_id:
            queryset = queryset.filter(departamento_id=dept_id)
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
            
        return queryset

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