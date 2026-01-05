from rest_framework import serializers
from django.contrib.auth.models import User, Group

# Importamos SOLO los modelos de esta App (Personal)
from .models import Empleado, Contrato, DocumentoEmpleado, SolicitudAusencia, TipoAusencia

# 1. SERIALIZER DE EMPLEADO (El Principal)
class EmpleadoSerializer(serializers.ModelSerializer):
    # Campo extra para crear usuario admin desde el frontend (no se guarda en BD empleado)
    crear_usuario_admin = serializers.BooleanField(write_only=True, required=False, default=False)
    
    # Campos de lectura (ReadOnly) para mostrar nombres en lugar de solo IDs en el JSON
    nombre_empresa = serializers.CharField(source='empresa.nombre_comercial', read_only=True)
    nombre_sucursal = serializers.CharField(source='sucursal.nombre', read_only=True)
    nombre_departamento = serializers.CharField(source='departamento.nombre', read_only=True)
    nombre_puesto = serializers.CharField(source='puesto.nombre', read_only=True)
    nombre_jefe = serializers.CharField(source='jefe_inmediato.nombres', read_only=True)
    
    class Meta:
        model = Empleado
        fields = '__all__'

    def create(self, validated_data):
        # 1. Extraemos el checkbox que no es parte del modelo Empleado
        crear_admin = validated_data.pop('crear_usuario_admin', False) 
        
        # 2. Creamos la ficha del empleado
        empleado = Empleado.objects.create(**validated_data)
        
        # 3. Lógica automática de Usuario (Login)
        email = empleado.email
        cedula = empleado.documento
        
        if email and cedula:
            # Buscamos o creamos el usuario de Django
            user, created = User.objects.get_or_create(username=email, defaults={'email': email})
            
            if created:
                user.set_password(cedula) # Contraseña por defecto = Cédula
                user.save()
                
                # Asignar Grupo según el Rol del Empleado
                nombre_grupo = 'EMPLEADO' # Default
                if empleado.rol == 'CLIENTE': nombre_grupo = 'CLIENTE'
                elif empleado.rol == 'RRHH': nombre_grupo = 'RRHH'
                elif empleado.rol == 'GERENTE': nombre_grupo = 'GERENTE'
                
                group, _ = Group.objects.get_or_create(name=nombre_grupo)
                user.groups.add(group)
            
            # 4. Asignar permisos de Staff (Admin) si corresponde
            # Se da acceso al admin panel SI: se marcó el check O el rol es administrativo
            if crear_admin or empleado.rol in ['CLIENTE', 'RRHH']:
                user.is_staff = True 
                user.save()
                
            # Vinculamos (Si agregaste el OneToOneField 'usuario' en el modelo Empleado)
            if hasattr(empleado, 'usuario'):
                empleado.usuario = user
                empleado.save()
                
        return empleado

    def validate(self, data):
        """
        Validación de coherencia organizacional.
        Evita que asignes un 'Vendedor' (Depto Ventas) al departamento de 'Sistemas'.
        """
        depto = data.get('departamento') # Objeto Departamento
        puesto = data.get('puesto')      # Objeto Puesto

        # Solo validamos si ambos campos vienen en la petición
        if depto and puesto:
            # En nuestro modelo Core, Puesto tiene ForeignKey a Departamento.
            # Por tanto, un Puesto solo puede pertenecer a SU departamento original.
            if puesto.departamento != depto:
                raise serializers.ValidationError({
                    'puesto': f"Incoherencia: El cargo '{puesto.nombre}' pertenece al departamento '{puesto.departamento.nombre}', no puedes asignarlo a '{depto.nombre}'."
                })
        
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
    # Mostramos datos extra para la tabla del frontend
    nombre_empleado = serializers.CharField(source='empleado.nombres', read_only=True)
    apellido_empleado = serializers.CharField(source='empleado.apellidos', read_only=True)
    nombre_tipo = serializers.CharField(source='tipo_ausencia.nombre', read_only=True)

    class Meta:
        model = SolicitudAusencia
        fields = '__all__'

# 5. TIPOS DE AUSENCIA (Catálogo)
class TipoAusenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoAusencia
        fields = '__all__'