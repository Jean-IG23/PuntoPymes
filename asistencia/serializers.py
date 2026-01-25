from rest_framework import serializers
from .models import Jornada, EventoAsistencia
from personal.serializers import EmpleadoSerializer

class JornadaSerializer(serializers.ModelSerializer):
    # Opcional: Mostrar datos del empleado anidados para ver nombres en lugar de IDs
    empleado_detalle = EmpleadoSerializer(source='empleado', read_only=True)

    # Información del turno para mostrar tolerancia y horarios
    turno_nombre = serializers.CharField(source='empleado.turno_asignado.nombre', read_only=True)
    turno_hora_entrada = serializers.TimeField(source='empleado.turno_asignado.hora_entrada', read_only=True)
    turno_min_tolerancia = serializers.IntegerField(source='empleado.turno_asignado.min_tolerancia', read_only=True)

    class Meta:
        model = Jornada
        fields = '__all__'
        read_only_fields = ('horas_trabajadas', 'horas_extras', 'minutos_atraso', 'es_atraso')

class EventoAsistenciaSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.nombres', read_only=True)
    
    class Meta:
        model = EventoAsistencia
        fields = '__all__'