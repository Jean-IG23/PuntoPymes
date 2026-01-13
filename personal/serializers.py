from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia
from core.utils import calcular_dias_habiles
from django.utils import timezone

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
    usuario_id = serializers.IntegerField(source='empleado.usuario.id', read_only=True)
    dias_solicitados = serializers.IntegerField(read_only=True)

    class Meta:
        model = SolicitudAusencia
        fields = '__all__'
        read_only_fields = ['empleado', 'empresa', 'estado','fecha_solicitud', 'dias_calculados', 'motivo_rechazo', 'aprobado_por', 'fecha_resolucion']

    def validate(self, data):
        # 1. Usamos los nombres REALES de tu modelo
        inicio = data.get('fecha_inicio')
        fin = data.get('fecha_fin')
        motivo = data.get('motivo')
        tipo_ausencia = data.get('tipo_ausencia')
        user = self.context['request'].user

        # 2. Validar Empleado
        try:
            empleado = Empleado.objects.get(usuario=user)
        except Empleado.DoesNotExist:
            raise serializers.ValidationError("No tienes un perfil de empleado asociado.")

        # --- REGLA A: FECHAS ---
        if not inicio or not fin:
             raise serializers.ValidationError("Las fechas son obligatorias.")

        if inicio > fin:
            raise serializers.ValidationError({"fecha_fin": "La fecha final no puede ser anterior a la de inicio."})
        
        if inicio < timezone.now().date():
             raise serializers.ValidationError({"fecha_inicio": "No puedes solicitar vacaciones para fechas pasadas."})

        # --- REGLA B: MOTIVO ---
        if motivo and len(motivo.strip()) < 5:
             raise serializers.ValidationError({"motivo": "El motivo es muy corto (mínimo 5 letras)."})

        # --- REGLA C: SOLAPAMIENTO ---
        # Verificamos si choca con otra solicitud APROBADA o PENDIENTE
        solicitudes_existentes = SolicitudAusencia.objects.filter(
            empleado=empleado,
            estado__in=['PENDIENTE', 'APROBADA']
        ).filter(
            fecha_inicio__lte=fin, 
            fecha_fin__gte=inicio 
        )

        if solicitudes_existentes.exists():
            raise serializers.ValidationError("Ya tienes una solicitud registrada en estas fechas.")

        # --- REGLA D: CÁLCULO ---
        try:
            dias_a_descontar = calcular_dias_habiles(inicio, fin)
        except Exception as e:
            raise serializers.ValidationError(f"Error calculando días: {str(e)}")
        
        if dias_a_descontar == 0:
            raise serializers.ValidationError("El rango seleccionado no contiene días hábiles.")

        # --- REGLA E: SALDO (BLINDADA CONTRA NONE) ---
        # Obtenemos nombre del tipo de forma segura
        nombre_tipo = tipo_ausencia.nombre.lower() if tipo_ausencia else ''
        es_vacaciones = 'vacaciones' in nombre_tipo
        
        # 👇 CORRECCIÓN CLAVE: Convertimos None a 0
        saldo_actual = empleado.saldo_vacaciones if empleado.saldo_vacaciones is not None else 0
        
        if es_vacaciones and dias_a_descontar > saldo_actual:
             raise serializers.ValidationError({
                 "non_field_errors": [f"Saldo insuficiente. Solicitas {dias_a_descontar} días, tienes {saldo_actual} disponibles."]
             })

        # Guardamos el cálculo para que la View lo use
        self.context['dias_calculados'] = dias_a_descontar
        return data
# 5. TIPOS DE AUSENCIA
class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'
        read_only_fields = ['empresa']