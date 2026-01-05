from rest_framework import serializers
from .models import EventoAsistencia, Jornada

class EventoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoAsistencia
        fields = '__all__'

class JornadaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Jornada
        fields = '__all__'