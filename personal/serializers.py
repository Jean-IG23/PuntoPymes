from rest_framework import serializers
from .models import EventoAsistencia

class EventoAsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventoAsistencia
        fields = '__all__'