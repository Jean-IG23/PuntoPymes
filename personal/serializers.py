from rest_framework import serializers
from .models import Empleado, Contrato, DocumentoEmpleado, EventoAsistencia, SolicitudAusencia, TipoAusencia

class EmpleadoSerializer(serializers.ModelSerializer):
    class Meta: model = Empleado; fields = '_all_'

class ContratoSerializer(serializers.ModelSerializer):
    class Meta: model = Contrato; fields = '_all_'

class DocumentoSerializer(serializers.ModelSerializer):
    class Meta: model = DocumentoEmpleado; fields = '_all_'

class EventoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta: model = EventoAsistencia; fields = '_all_'

class SolicitudSerializer(serializers.ModelSerializer):
    class Meta: model = SolicitudAusencia; fields = '_all_'

class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta: model = TipoAusencia; fields = '_all_'