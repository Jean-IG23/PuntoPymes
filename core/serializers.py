from rest_framework import serializers
from .models import Empresa, Sucursal, Departamento, Puesto, Turno

class EmpresaSerializer(serializers.ModelSerializer):
    class Meta: model = Empresa; fields = '_all_'

class SucursalSerializer(serializers.ModelSerializer):
    class Meta: model = Sucursal; fields = '_all_'

class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta: model = Departamento; fields = '_all_'

class PuestoSerializer(serializers.ModelSerializer):
    class Meta: model = Puesto; fields = '_all_'

class TurnoSerializer(serializers.ModelSerializer):
    class Meta: model = Turno; fields = '_all_'