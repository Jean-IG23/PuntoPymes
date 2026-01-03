from rest_framework import serializers
from .models import KPI, ResultadoKPI

class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'
        # 👇 ESTA ES LA LÍNEA QUE TE FALTA 👇
        # Le dice a Django: "No pidas la empresa en el formulario, yo la pongo automática"
        read_only_fields = ['empresa']

class ResultadoKPISerializer(serializers.ModelSerializer):
    # Truco para que el Frontend vea el nombre del empleado y del KPI, no solo el ID
    nombre_empleado = serializers.CharField(source='empleado.nombres', read_only=True)
    nombre_kpi = serializers.CharField(source='kpi.nombre', read_only=True)

    class Meta:
        model = ResultadoKPI
        fields = '__all__'
        # 👇 TAMBIÉN AGRÉGALO AQUÍ PARA EVITAR ERRORES FUTUROS 👇
        read_only_fields = ['empresa']