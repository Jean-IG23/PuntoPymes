from rest_framework import serializers
from .models import KPI, ResultadoKPI

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'

class ResultadoKPISerializer(serializers.ModelSerializer):
    # Truco para que el Frontend vea el nombre del empleado y del KPI, no solo el ID
    nombre_empleado = serializers.CharField(source='empleado.nombres', read_only=True)
    nombre_kpi = serializers.CharField(source='kpi.nombre', read_only=True)

    class Meta:
        model = ResultadoKPI
        fields = '__all__'