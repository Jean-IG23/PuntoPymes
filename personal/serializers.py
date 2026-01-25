from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Sucursal, Departamento, Puesto, Area, Turno, Empresa
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia, Tarea

# ==============================================================================
#  CARGA MASIVA
# ==============================================================================
class CargaMasivaEmpleadoSerializer(serializers.Serializer):
    """
    CARGA MASIVA COMPLETA - Crea toda la estructura organizacional automáticamente
    """
    # Campos Obligatorios
    documento = serializers.CharField()
    nombres = serializers.CharField()
    apellidos = serializers.CharField()

    # Campos Opcionales
    email = serializers.EmailField(required=False, allow_blank=True)
    telefono = serializers.CharField(required=False, allow_blank=True)

    # Estructura Organizacional (Se crean automáticamente si no existen)
    nombre_sucursal = serializers.CharField(required=False, allow_blank=True)
    nombre_area = serializers.CharField(required=False, allow_blank=True)
    nombre_departamento = serializers.CharField(required=False, allow_blank=True)
    nombre_puesto = serializers.CharField(required=False, allow_blank=True)
    nombre_turno = serializers.CharField(required=False, allow_blank=True)

    # Configuración Laboral
    fecha_ingreso = serializers.DateField(required=False)
    sueldo = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=460)
    rol = serializers.CharField(required=False, allow_blank=True, default='EMPLEADO')
    es_supervisor_puesto = serializers.BooleanField(default=False)

    def validate_rol(self, value):
        """Validar que el rol sea válido"""
        if value:
            roles_validos = ['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE', 'EMPLEADO']
            if value.upper() not in roles_validos:
                raise serializers.ValidationError(f"Rol '{value}' no válido. Use: {', '.join(roles_validos)}")
        return value.upper() if value else 'EMPLEADO'

    def create(self, validated_data):
        from django.db import transaction
        from django.contrib.auth.models import User

        empresa = self.context['empresa_destino']

        def normalizar_texto(texto):
            """Normalizar texto: capitalizar y limpiar espacios"""
            if not texto or not texto.strip():
                return None
            return " ".join(texto.strip().split()).title()

        with transaction.atomic():
            # ===========================================
            # 1. CREAR/ACTUALIZAR ESTRUCTURA ORGANIZACIONAL
            # ===========================================

            # 1.1 SUCURSAL
            sucursal_obj = None
            nombre_sucursal = normalizar_texto(validated_data.get('nombre_sucursal'))
            if nombre_sucursal:
                sucursal_obj, _ = Sucursal.objects.get_or_create(
                    nombre__iexact=nombre_sucursal,
                    empresa=empresa,
                    defaults={
                        'nombre': nombre_sucursal,
                        'direccion': 'Dirección por definir',
                        'es_matriz': False
                    }
                )

            # 1.2 ÁREA
            area_obj = None
            nombre_area = normalizar_texto(validated_data.get('nombre_area'))
            if nombre_area:
                area_obj, _ = Area.objects.get_or_create(
                    nombre__iexact=nombre_area,
                    empresa=empresa,
                    defaults={'nombre': nombre_area}
                )

            # 1.3 DEPARTAMENTO (Requiere sucursal)
            depto_obj = None
            nombre_departamento = normalizar_texto(validated_data.get('nombre_departamento'))
            if nombre_departamento and sucursal_obj:
                # Buscar departamento en la sucursal correcta, si no existe crearlo
                depto_obj, _ = Departamento.objects.get_or_create(
                    nombre__iexact=nombre_departamento,
                    sucursal=sucursal_obj,
                    defaults={
                        'nombre': nombre_departamento,
                        'area': area_obj
                    }
                )

            # 1.4 PUESTO (CARGO)
            puesto_obj = None
            nombre_puesto = normalizar_texto(validated_data.get('nombre_puesto'))
            if nombre_puesto:
                puesto_obj, _ = Puesto.objects.get_or_create(
                    nombre__iexact=nombre_puesto,
                    empresa=empresa,
                    defaults={
                        'nombre': nombre_puesto,
                        'area': area_obj,
                        'es_supervisor': validated_data.get('es_supervisor_puesto', False)
                    }
                )

            # 1.5 TURNO
            turno_obj = None
            nombre_turno = normalizar_texto(validated_data.get('nombre_turno'))
            if nombre_turno:
                turno_obj, _ = Turno.objects.get_or_create(
                    nombre__iexact=nombre_turno,
                    empresa=empresa,
                    defaults={
                        'nombre': nombre_turno,
                        'hora_entrada': '09:00:00',
                        'hora_salida': '18:00:00',
                        'tipo_jornada': 'RIGIDO'
                    }
                )

            # ===========================================
            # 2. GESTIÓN DE USUARIO DJANGO
            # ===========================================

            documento = validated_data['documento'].strip()
            email = validated_data.get('email', '').strip()
            nombres = validated_data['nombres'].strip()
            apellidos = validated_data['apellidos'].strip()

            # Username: email si existe, sino cédula
            username = email if email else documento

            # Buscar o crear usuario
            user, user_created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': nombres,
                    'last_name': apellidos
                }
            )

            # Si es nuevo usuario, establecer contraseña
            if user_created:
                # Contraseña = cédula (como solicitó el usuario)
                user.set_password(documento)
                user.save()

            # ===========================================
            # 3. GESTIÓN DE EMPLEADO
            # ===========================================

            rol_final = validated_data.get('rol', 'EMPLEADO').upper()

            # Validar que si es GERENTE tenga sucursal
            if rol_final == 'GERENTE' and not sucursal_obj:
                raise serializers.ValidationError({
                    'rol': 'Un Gerente debe tener una sucursal asignada.'
                })

            # Si es GERENTE, verificar si ya hay uno en esta sucursal
            gerente_reemplazado = None
            if rol_final == 'GERENTE' and sucursal_obj:
                gerente_existente = Empleado.objects.filter(
                    rol='GERENTE',
                    sucursal=sucursal_obj,
                    empresa=empresa
                ).exclude(usuario=user).first()

                if gerente_existente:
                    # Reemplazar automáticamente
                    gerente_existente.rol = 'EMPLEADO'
                    gerente_existente.save(update_fields=['rol'])
                    gerente_reemplazado = f"{gerente_existente.nombres} {gerente_existente.apellidos}"

            # Crear o actualizar empleado
            empleado, empleado_created = Empleado.objects.update_or_create(
                usuario=user,
                empresa=empresa,
                defaults={
                    'documento': documento,
                    'nombres': nombres,
                    'apellidos': apellidos,
                    'email': email,
                    'telefono': validated_data.get('telefono', ''),
                    'sucursal': sucursal_obj,
                    'departamento': depto_obj,
                    'puesto': puesto_obj,
                    'turno_asignado': turno_obj,
                    'rol': rol_final,
                    'fecha_ingreso': validated_data.get('fecha_ingreso', timezone.now().date()),
                    'sueldo': validated_data.get('sueldo', 460),
                    'estado': 'ACTIVO',
                    'saldo_vacaciones': 15  # Días por defecto
                }
            )

            # Agregar flag para saber si fue creado o actualizado
            empleado._was_created = empleado_created

            # ===========================================
            # 4. CREAR CONTRATO AUTOMÁTICO (Opcional)
            # ===========================================

            if empleado_created and validated_data.get('sueldo'):
                from .models import Contrato
                Contrato.objects.get_or_create(
                    empleado=empleado,
                    activo=True,
                    defaults={
                        'empresa': empresa,
                        'tipo': 'INDEFINIDO',
                        'fecha_inicio': validated_data.get('fecha_ingreso', timezone.now().date()),
                        'salario_mensual': validated_data.get('sueldo', 460),
                        'fecha_fin': None
                    }
                )

            # Agregar info del reemplazo si ocurrió
            if gerente_reemplazado:
                empleado._gerente_reemplazado = gerente_reemplazado

            return empleado
class EmpleadoNestedSucursalSerializer(serializers.ModelSerializer):
    """Serializer anidado para Sucursal (solo lectura)"""
    class Meta:
        from core.models import Sucursal
        model = Sucursal
        fields = ['id', 'nombre', 'direccion']


class EmpleadoNestedDepartamentoSerializer(serializers.ModelSerializer):
    """Serializer anidado para Departamento (solo lectura)"""
    class Meta:
        from core.models import Departamento
        model = Departamento
        fields = ['id', 'nombre']


class EmpleadoNestedPuestoSerializer(serializers.ModelSerializer):
    """Serializer anidado para Puesto (solo lectura)"""
    class Meta:
        from core.models import Puesto
        model = Puesto
        fields = ['id', 'nombre']


class EmpleadoNestedTurnoSerializer(serializers.ModelSerializer):
    """Serializer anidado para Turno (solo lectura)"""
    class Meta:
        from core.models import Turno
        model = Turno
        fields = ['id', 'nombre', 'hora_entrada', 'hora_salida']


class EmpleadoNestedEmpresaSerializer(serializers.ModelSerializer):
    """Serializer anidado para Empresa (solo lectura)"""
    class Meta:
        from core.models import Empresa
        model = Empresa
        fields = ['id', 'nombre_comercial', 'razon_social', 'ruc']


class EmpleadoSerializer(serializers.ModelSerializer):
    # Campos planos para compatibilidad con código existente
    nombre_sucursal = serializers.CharField(source='sucursal.nombre', read_only=True, allow_null=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True, allow_null=True)
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True, allow_null=True)
    nombre_turno = serializers.CharField(source='turno_asignado.nombre', read_only=True, allow_null=True)
    nombre_empresa = serializers.CharField(source='empresa.nombre_comercial', read_only=True)
    ruc_empresa = serializers.CharField(source='empresa.ruc', read_only=True)
    
    # ✅ Campos para LECTURA (cuando se retorna un empleado)
    sucursal = EmpleadoNestedSucursalSerializer(read_only=True, allow_null=True)
    departamento = EmpleadoNestedDepartamentoSerializer(read_only=True, allow_null=True)
    puesto = EmpleadoNestedPuestoSerializer(read_only=True, allow_null=True)
    turno_asignado = EmpleadoNestedTurnoSerializer(read_only=True, allow_null=True)
    turno = EmpleadoNestedTurnoSerializer(source='turno_asignado', read_only=True, allow_null=True)
    empresa = EmpleadoNestedEmpresaSerializer(read_only=True)
    
    # ✅ Campos para ESCRITURA (cuando se crea/actualiza desde frontend)
    sucursal_id = serializers.PrimaryKeyRelatedField(
        queryset=Sucursal.objects.all(), source='sucursal', write_only=True, required=False, allow_null=True
    )
    departamento_id = serializers.PrimaryKeyRelatedField(
        queryset=Departamento.objects.all(), source='departamento', write_only=True, required=False, allow_null=True
    )
    puesto_id = serializers.PrimaryKeyRelatedField(
        queryset=Puesto.objects.all(), source='puesto', write_only=True, required=False, allow_null=True
    )
    turno_asignado_id = serializers.PrimaryKeyRelatedField(
        queryset=Turno.objects.all(), source='turno_asignado', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Empleado
        fields = '__all__'
        read_only_fields = ['empresa', 'saldo_vacaciones', 'usuario']
    
    def to_internal_value(self, data):
        """
        ✅ IMPORTANTE: Permitir que el frontend envíe tanto 'sucursal' como 'sucursal_id'
        Esto hace más compatible con el formulario Angular
        """
        # Si viene 'sucursal' (ID), asignarlo a 'sucursal_id' internamente
        if 'sucursal' in data and isinstance(data['sucursal'], (int, str)):
            data['sucursal_id'] = data.pop('sucursal')
        
        # Lo mismo para otros campos
        if 'departamento' in data and isinstance(data['departamento'], (int, str)):
            data['departamento_id'] = data.pop('departamento')
            
        if 'puesto' in data and isinstance(data['puesto'], (int, str)):
            data['puesto_id'] = data.pop('puesto')
            
        if 'turno_asignado' in data and isinstance(data['turno_asignado'], (int, str)):
            data['turno_asignado_id'] = data.pop('turno_asignado')
        
        return super().to_internal_value(data)

class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = '__all__'

class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoEmpleado
        fields = '__all__'

class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'
        read_only_fields = ['empresa']

class SolicitudSerializer(serializers.ModelSerializer):
    nombre_empleado = serializers.CharField(source='empleado.usuario.get_full_name', read_only=True)
    nombre_tipo = serializers.CharField(source='tipo_ausencia.nombre', read_only=True)
    
    dias_solicitados = serializers.IntegerField(required=False)

    class Meta:
        model = SolicitudAusencia
        fields = '__all__'
        # ⚠️ IMPORTANTE: Eliminamos 'dias_solicitados' de esta lista
        read_only_fields = ['empleado', 'empresa', 'estado', 'fecha_solicitud', 'fecha_resolucion', 'aprobado_por']
class TareaSerializer(serializers.ModelSerializer):
    # Campos de solo lectura para mostrar nombres bonitos en el frontend
    # Usar SerializerMethodField para mayor control sobre valores nulos
    asignado_nombre = serializers.SerializerMethodField()
    asignado_apellido = serializers.SerializerMethodField()
    asignado_puesto = serializers.SerializerMethodField()
    asignado_foto = serializers.SerializerMethodField()
    creado_por_nombre = serializers.CharField(source='creado_por.username', read_only=True, default='Sistema')
    revisado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Tarea
        fields = '__all__'
        read_only_fields = ['empresa', 'creado_por', 'created_at', 'updated_at', 'completado_at', 'revisado_por']

    def get_asignado_nombre(self, obj):
        try:
            return obj.asignado_a.usuario.first_name or obj.asignado_a.nombres
        except:
            return 'Sin asignar'

    def get_asignado_apellido(self, obj):
        try:
            return obj.asignado_a.usuario.last_name or obj.asignado_a.apellidos
        except:
            return ''

    def get_asignado_puesto(self, obj):
        try:
            return obj.asignado_a.puesto.nombre if obj.asignado_a.puesto else 'Sin cargo'
        except:
            return 'Sin cargo'

    def get_asignado_foto(self, obj):
        try:
            if obj.asignado_a and obj.asignado_a.foto:
                return obj.asignado_a.foto.url
            return None
        except:
            return None

    def get_revisado_por_nombre(self, obj):
        try:
            return obj.revisado_por.get_full_name() or obj.revisado_por.username
        except:
            return None
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Las nuevas contraseñas no coinciden.")
        # Remover confirm_password ya que no se necesita para el cambio
        data.pop('confirm_password', None)
        return data