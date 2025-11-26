from rest_framework import serializers
from .models import KPI, ResultadoKPI
class KPISerializer(serializers.ModelSerializer):
    class Meta: model = KPI; fields = '__all__'
class ResultadoKPISerializer(serializers.ModelSerializer):
    class Meta: model = ResultadoKPI; fields = '__all__'