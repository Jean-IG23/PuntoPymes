from rest_framework import serializers
from .models import KPI, EvaluacionDesempeno, DetalleEvaluacion, Objetivo

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'

class DetalleEvaluacionSerializer(serializers.ModelSerializer):
    nombre_kpi = serializers.CharField(source='kpi.nombre', read_only=True)
    peso_kpi = serializers.IntegerField(source='kpi.peso_porcentaje', read_only=True)
    
    class Meta:
        model = DetalleEvaluacion
        fields = '__all__'

class EvaluacionSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='empleado.nombres', read_only=True)
    detalles = DetalleEvaluacionSerializer(many=True, read_only=True) # Nested serializer

    class Meta:
        model = EvaluacionDesempeno
        fields = '__all__'

class ObjetivoSerializer(serializers.ModelSerializer):
    nombre_empleado = serializers.CharField(source='empleado.nombres', read_only=True)
    
    class Meta:
        model = Objetivo
        fields = '__all__'
        read_only_fields = ['empresa']  # Se asigna automáticamente en perform_create