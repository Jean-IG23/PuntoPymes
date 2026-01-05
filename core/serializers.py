from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion
from personal.models import Empleado
from django.contrib.auth.models import Group
# 1. EMPRESA
class EmpresaSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_password = serializers.CharField(write_only=True, style={'input_type': 'password'}, required=False)
    admin_nombre = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Empresa
        fields = '__all__'

    def create(self, validated_data):
        email = validated_data.pop('admin_email', None)
        password = validated_data.pop('admin_password', None)
        nombre_completo = validated_data.pop('admin_nombre', "Admin")

        empresa = Empresa.objects.create(**validated_data)

        if email and password:
            username = email
            if not User.objects.filter(username=username).exists():
                user = User.objects.create_user(username=username, email=email, password=password, is_staff=True)
                
                # --- CAMBIO DE SEGURIDAD ---
                # Usamos get_or_create para que no falle si el grupo no existe aún
                owner_group, created = Group.objects.get_or_create(name='OWNER')
                user.groups.add(owner_group)
                # ---------------------------

                Empleado.objects.create(
                    empresa=empresa,
                    nombres=nombre_completo,
                    apellidos="(Admin)",
                    documento="ADMIN-" + empresa.ruc,
                    email=email,
                    estado='ACTIVO'
                )
        return empresa

# 2. ÁREA
class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = '__all__'

# 3. SUCURSAL
class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = ['id', 'nombre', 'direccion', 'es_matriz', 'latitud', 'longitud', 'radio_metros', 'empresa']

# 4. DEPARTAMENTO
class DepartamentoSerializer(serializers.ModelSerializer):
    empresa = serializers.IntegerField(source='sucursal.empresa.id', read_only=True)
    nombre_area = serializers.CharField(source='area.nombre', read_only=True) 
    
    class Meta:
        model = Departamento
        fields = '__all__'

# 5. PUESTO 
class PuestoSerializer(serializers.ModelSerializer):
    nombre_area = serializers.SerializerMethodField() # Campo calculado

    class Meta:
        model = Puesto
        fields = '__all__'

    def get_nombre_area(self, obj):
        # Si tiene área, devuelve el nombre. Si no, dice "Universal".
        return obj.area.nombre if obj.area else "Universal / Comodín"

# 6. TURNO
class TurnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Turno
        fields = '__all__'

# 7. NOTIFICACIÓN
class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'