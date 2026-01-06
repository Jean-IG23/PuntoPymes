from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia

# 1. SERIALIZER DE EMPLEADO
class EmpleadoSerializer(serializers.ModelSerializer):
    # Campos de lectura (ReadOnly) para mostrar nombres bonitos en el JSON
    nombre_empresa = serializers.CharField(source='empresa.nombre_comercial', read_only=True)
    nombre_sucursal = serializers.CharField(source='sucursal.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True, default="---")
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True, default="---")
    nombre_jefe = serializers.CharField(source='jefe_inmediato.nombres', read_only=True, default="---")
    
    class Meta:
        model = Empleado
        fields = '__all__'
        # Protegemos estos campos para que no se modifiquen por error
        read_only_fields = ('usuario', 'saldo_vacaciones', 'estado')

    def validate(self, data):
        """
        Validación de coherencia básica.
        """
        # 1. Validar que la Sucursal pertenezca a la misma Empresa
        if 'sucursal' in data and 'empresa' in data:
            if data['sucursal'].empresa != data['empresa']:
                raise serializers.ValidationError({"sucursal": "La sucursal no pertenece a la empresa seleccionada."})

        # 2. Validar que el Departamento pertenezca a la Sucursal
        if 'departamento' in data and 'sucursal' in data and data['departamento']:
            if data['departamento'].sucursal != data['sucursal']:
                 raise serializers.ValidationError({"departamento": "El departamento no pertenece a la sucursal seleccionada."})

        # NOTA: Borramos la validación de puesto.departamento porque el Puesto ahora es Global.
        
        return data

# 2. CONTRATOS
class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = '__all__'

# 3. DOCUMENTOS
class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoEmpleado
        fields = '__all__'

# 4. SOLICITUDES DE AUSENCIA
class SolicitudSerializer(serializers.ModelSerializer):
    nombre_empleado = serializers.CharField(source='empleado.nombres', read_only=True, default='')
    apellido_empleado = serializers.CharField(source='empleado.apellidos', read_only=True, default='')
    nombre_tipo = serializers.CharField(source='tipo_ausencia.nombre', read_only=True, default='')

    class Meta:
        model = SolicitudAusencia
        fields = '__all__'
        read_only_fields = ['empleado', 'empresa', 'estado', 'motivo_rechazo', 'aprobado_por', 'fecha_resolucion']

# 5. TIPOS DE AUSENCIA
class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'
        read_only_fields = ['empresa']