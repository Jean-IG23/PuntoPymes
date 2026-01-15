from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Sucursal, Departamento, Puesto, Area, Turno, Empresa
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia

# ==============================================================================
# 📥 SERIALIZER MAESTRO DE CARGA MASIVA
# ==============================================================================
class CargaMasivaEmpleadoSerializer(serializers.Serializer):
    # --- DATOS PERSONALES ---
    nombres = serializers.CharField()
    apellidos = serializers.CharField()
    email = serializers.EmailField()
    documento = serializers.CharField()
    
    # --- ESTRUCTURA ORGANIZACIONAL ---
    nombre_sucursal = serializers.CharField(required=False, allow_blank=True)
    nombre_area = serializers.CharField(required=False, allow_blank=True)
    nombre_departamento = serializers.CharField(required=False, allow_blank=True)
    
    # --- PUESTO Y JERARQUÍA ---
    nombre_puesto = serializers.CharField(required=False, allow_blank=True)
    es_supervisor_puesto = serializers.BooleanField(default=False)
    
    # 👇 NUEVO CAMPO: ROL EXPLÍCITO
    rol = serializers.CharField(required=False, allow_blank=True)
    
    # --- TIEMPO Y DINERO ---
    nombre_turno = serializers.CharField(required=False, allow_blank=True)
    fecha_ingreso = serializers.DateField()
    sueldo = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=460)

    def create(self, validated_data):
        request = self.context.get('request')
        
        # 1. OBTENER EMPRESA
        try:
            uploader = Empleado.objects.get(usuario=request.user)
            empresa = uploader.empresa
        except Empleado.DoesNotExist:
            raise serializers.ValidationError("El usuario que sube el archivo no tiene perfil de empleado.")

        # ======================================================================
        # A. LOGICA DE ESTRUCTURA (Sucursal, Area, Depto, Puesto, Turno)
        # ======================================================================
        # (Esta parte se mantiene igual que antes, copiamos la lógica Find or Create)
        
        # SUCURSAL
        sucursal = None
        nom_suc = validated_data.get('nombre_sucursal')
        if nom_suc:
            sucursal, _ = Sucursal.objects.get_or_create(empresa=empresa, nombre__iexact=nom_suc, defaults={'nombre': nom_suc})
        else:
            sucursal = Sucursal.objects.filter(empresa=empresa, es_matriz=True).first()

        # AREA
        area = None
        nom_area = validated_data.get('nombre_area')
        if nom_area:
            area, _ = Area.objects.get_or_create(empresa=empresa, nombre__iexact=nom_area, defaults={'nombre': nom_area})

        # DEPARTAMENTO
        departamento = None
        nom_depto = validated_data.get('nombre_departamento')
        if nom_depto and sucursal:
            departamento, _ = Departamento.objects.get_or_create(sucursal=sucursal, nombre__iexact=nom_depto, defaults={'nombre': nom_depto, 'area': area})

        # PUESTO
        puesto = None
        nom_puesto = validated_data.get('nombre_puesto')
        es_supervisor_flag = validated_data.get('es_supervisor_puesto', False)

        if nom_puesto:
            puesto, created = Puesto.objects.get_or_create(
                empresa=empresa, nombre__iexact=nom_puesto,
                defaults={'nombre': nom_puesto, 'area': area, 'es_supervisor': es_supervisor_flag}
            )
            if not created and es_supervisor_flag and not puesto.es_supervisor:
                puesto.es_supervisor = True
                puesto.save()

        # TURNO
        turno = None
        nom_turno = validated_data.get('nombre_turno')
        if nom_turno:
            turno = Turno.objects.filter(empresa=empresa, nombre__iexact=nom_turno).first()


        # ======================================================================
        # B. USUARIO Y ROL (AQUÍ ESTÁ EL CAMBIO)
        # ======================================================================
        email = validated_data['email']
        cedula = validated_data['documento']
        
        user = User.objects.create_user(
            username=email, email=email, password=cedula,
            first_name=validated_data['nombres'], last_name=validated_data['apellidos']
        )

        
        rol_input = validated_data.get('rol', '').upper().strip()
        
        # Roles válidos en tu sistema
        roles_validos = ['ADMIN', 'RRHH', 'GERENTE', 'EMPLEADO', 'CLIENTE']
        
        rol_asignado = 'EMPLEADO' # Default base

        if rol_input in roles_validos:
            # 1. Prioridad Máxima: Lo que diga el Excel
            rol_asignado = rol_input
        elif puesto and puesto.es_supervisor:
            # 2. Prioridad Media: Si es supervisor, es GERENTE
            rol_asignado = 'GERENTE'
        
        # 3. Crear Ficha
        empleado = Empleado.objects.create(
            usuario=user, 
            empresa=empresa, 
            sucursal=sucursal, 
            departamento=departamento, 
            puesto=puesto, 
            turno_asignado=turno, 
            nombres=validated_data['nombres'], 
            apellidos=validated_data['apellidos'], 
            email=email, 
            documento=cedula,
            fecha_ingreso=validated_data['fecha_ingreso'], 
            sueldo=validated_data.get('sueldo', 460),
            rol=rol_asignado,  # <--- Usamos el rol calculado
            estado='ACTIVO', 
            saldo_vacaciones=15
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
    
    class Meta:
        model = SolicitudAusencia
        fields = '__all__'
        read_only_fields = ['empleado', 'empresa', 'estado', 'fecha_solicitud', 'fecha_resolucion', 'aprobado_por']