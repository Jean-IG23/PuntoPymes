from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion, ConfiguracionNomina
from personal.models import Empleado

# 1. EMPRESA
class EmpresaSerializer(serializers.ModelSerializer):
    # Campos extra solo para escritura (input del formulario)
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_password = serializers.CharField(write_only=True, style={'input_type': 'password'}, required=False)
    admin_nombre = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Empresa
        fields = '__all__'
    
    def create(self, validated_data):
        """
        Este método INTERCEPTA los datos antes de guardar.
        Saca el email y password del admin (porque eso lo maneja la Vista)
        y guarda solo los datos reales de la Empresa.
        """
        # 1. Sacamos los datos que NO pertenecen a la tabla Empresa
        validated_data.pop('admin_email', None)
        validated_data.pop('admin_password', None)
        validated_data.pop('admin_nombre', None)

        # 2. Guardamos la empresa limpia usando el método original de Django
        return super().create(validated_data)

# 2. ÁREA
class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = '__all__'
        read_only_fields = ('empresa',) 
# 3. SUCURSAL
class SucursalSerializer(serializers.ModelSerializer):
    # Campo extra para mostrar el nombre del jefe en la tabla
    nombre_responsable = serializers.SerializerMethodField()

    class Meta:
        model = Sucursal
        fields = '__all__'
        read_only_fields = ('empresa',)
    def get_nombre_responsable(self, obj):
        if obj.responsable:
            return f"{obj.responsable.nombres} {obj.responsable.apellidos}"
        return "Sin asignar"
# 4. DEPARTAMENTO
class DepartamentoSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='sucursal.empresa.id', read_only=True)
    nombre_area = serializers.CharField(source='area.nombre', read_only=True)
    class Meta:
        model = Departamento
        fields = '__all__'
        read_only_fields = ('empresa',)
# 5. PUESTO 
class PuestoSerializer(serializers.ModelSerializer):
    nombre_area = serializers.SerializerMethodField() 

    class Meta:
        model = Puesto
        fields = '__all__'
        read_only_fields = ('empresa',)
    def get_nombre_area(self, obj):
        return obj.area.nombre if obj.area else "Universal / Comodín"

# 6. TURNO
class TurnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turno
        fields = '__all__'
        read_only_fields = ('empresa',)
# 7. NOTIFICACIÓN
class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'

class ConfiguracionNominaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionNomina
        fields = '__all__'
        read_only_fields = ['empresa']