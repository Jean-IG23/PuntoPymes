from rest_framework import serializers
from .models import Empresa, Sucursal, Departamento, Puesto, Turno

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = '__all__'

class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = '__all__'

class DepartamentoSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='sucursal.empresa.id', read_only=True)
    class Meta:
        model = Departamento
        fields = '__all__'

class PuestoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Puesto
        fields = '__all__'

class TurnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turno
        fields = '__all__'

