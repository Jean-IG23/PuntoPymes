from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Sucursal, Departamento, Puesto, Area, Turno, Empresa
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia, Tarea

# ==============================================================================
#  CARGA MASIVA
# ==============================================================================
class CargaMasivaEmpleadoSerializer(serializers.Serializer):
    # Campos de Texto (Entrada)
    documento = serializers.CharField()
    nombres = serializers.CharField()
    apellidos = serializers.CharField()
    email = serializers.EmailField(required=False, allow_blank=True)
    
    # Estructura Organizacional
    nombre_sucursal = serializers.CharField(required=False, allow_blank=True)
    nombre_area = serializers.CharField(required=False, allow_blank=True)
    nombre_departamento = serializers.CharField(required=False, allow_blank=True)
    nombre_puesto = serializers.CharField(required=False, allow_blank=True)
    nombre_turno = serializers.CharField(required=False, allow_blank=True)
    
    # Configuración
    fecha_ingreso = serializers.DateField(required=False)
    sueldo = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    
    
    rol = serializers.CharField(required=False, allow_blank=True)
    
    es_supervisor_puesto = serializers.BooleanField(default=False)

    def create(self, validated_data):
        empresa = self.context['empresa_destino'] 

        def normalizar(texto):
            if not texto: return None
            return " ".join(texto.split()).title()

        # 1. PROCESAR SUCURSAL
        sucursal_obj = None
        raw_sucursal = validated_data.get('nombre_sucursal')
        if raw_sucursal:
            clean_sucursal = normalizar(raw_sucursal)
            sucursal_obj, _ = Sucursal.objects.get_or_create(
                nombre__iexact=clean_sucursal, 
                empresa=empresa,
                defaults={'nombre': clean_sucursal, 'direccion': 'Dirección por definir'}
            )

        # 2. PROCESAR ÁREA
        area_obj = None
        raw_area = validated_data.get('nombre_area')
        if raw_area:
            clean_area = normalizar(raw_area)
            area_obj, _ = Area.objects.get_or_create(
                nombre__iexact=clean_area, 
                empresa=empresa,
                defaults={'nombre': clean_area}
            )

        # 3. PROCESAR DEPARTAMENTO
        depto_obj = None
        raw_depto = validated_data.get('nombre_departamento')
        if raw_depto and sucursal_obj:
            clean_depto = normalizar(raw_depto)
            # Nota: Si usas unique_together, asegúrate de manejar posibles errores aquí
            depto_obj, _ = Departamento.objects.get_or_create(
                nombre__iexact=clean_depto,
                sucursal=sucursal_obj,
                defaults={'nombre': clean_depto, 'area': area_obj}
            )

        # 4. PROCESAR PUESTO (CARGO)
        puesto_obj = None
        raw_puesto = validated_data.get('nombre_puesto')
        if raw_puesto:
            clean_puesto = normalizar(raw_puesto)
            datos_puesto = {'nombre': clean_puesto, 'area': area_obj}
            
            # Verificamos campos opcionales del modelo Puesto
            try:
                Puesto._meta.get_field('es_supervision')
                datos_puesto['es_supervision'] = validated_data.get('es_supervisor_puesto', False)
            except:
                pass

            puesto_obj, _ = Puesto.objects.get_or_create(
                nombre__iexact=clean_puesto,
                empresa=empresa,
                defaults=datos_puesto
            )

        # 5. PROCESAR TURNO
        turno_obj = None
        raw_turno = validated_data.get('nombre_turno')
        if raw_turno:
            clean_turno = normalizar(raw_turno)
            turno_obj, _ = Turno.objects.get_or_create(
                nombre__iexact=clean_turno,
                empresa=empresa,
                defaults={
                    'nombre': clean_turno,
                    'hora_entrada': '09:00',
                    'hora_salida': '18:00',
                    'tipo_jornada': 'RIGIDO'
                }
            )

        # 6. GESTIÓN DE USUARIO (GLOBAL)
        email = validated_data.get('email')
        doc = validated_data.get('documento')
        nombres = validated_data.get('nombres')
        apellidos = validated_data.get('apellidos')
        
        # El username será el email, o la cédula si no hay email
        username = email if email else doc
        
        # Buscamos o creamos el usuario de Django
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email or '',
                'first_name': nombres,
                'last_name': apellidos
            }
        )
        if created: 
            user.set_password(doc) # Clave por defecto: la cédula
            user.save()

        # 👇 AQUÍ ESTABA EL ERROR: Faltaba definir esta variable
        rol_final = validated_data.get('rol')
        if not rol_final:
            rol_final = 'EMPLEADO'
        
        # 7. GESTIÓN DE EMPLEADO (POR EMPRESA)
        # Usamos update_or_create para que si ya existe en ESTA empresa, lo actualice
        empleado, _ = Empleado.objects.update_or_create(
            usuario=user,
            empresa=empresa, # Clave: Usuario + Empresa = Perfil Único
            defaults={
                'documento': doc,
                'nombres': nombres,
                'apellidos': apellidos,
                'email': email,
                'sucursal': sucursal_obj,
                'departamento': depto_obj,
                'puesto': puesto_obj,
                # 'area': area_obj,  <-- COMENTADO (Ya no existe en tu modelo)
                'turno_asignado': turno_obj, # <-- CORREGIDO (Nombre correcto del campo)
                'rol': rol_final.upper(), # Ahora sí existe la variable
                'fecha_ingreso': validated_data.get('fecha_ingreso'),
                'sueldo': validated_data.get('sueldo', 0),
                'estado': 'ACTIVO'
            }
        )

        return empleado
class EmpleadoSerializer(serializers.ModelSerializer):
    nombre_sucursal = serializers.CharField(source='sucursal.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True)
    nombre_turno = serializers.CharField(source='turno_asignado.nombre', read_only=True)
    
    class Meta:
        model = Empleado
        fields = '__all__'
        read_only_fields = ['empresa', 'saldo_vacaciones']

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
    asignado_nombre = serializers.CharField(source='asignado_a.usuario.first_name', read_only=True)
    asignado_apellido = serializers.CharField(source='asignado_a.usuario.last_name', read_only=True)
    asignado_puesto = serializers.CharField(source='asignado_a.puesto.nombre', read_only=True, default='')
    creado_por_nombre = serializers.CharField(source='creado_por.username', read_only=True)

    class Meta:
        model = Tarea
        fields = '__all__'
        read_only_fields = ['empresa', 'creado_por', 'created_at', 'updated_at', 'completado_at']
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Las nuevas contraseñas no coinciden.")
        return data