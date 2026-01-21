from django.forms import ValidationError
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models.signals import post_save # <--- IMPORTANTE: Necesario para el parche
import pandas as pd
from rest_framework.parsers import MultiPartParser, FormParser
# Modelos
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion
from personal.models import Empleado, SolicitudAusencia
from asistencia.models import Jornada

# Serializers
from .serializers import (
    EmpresaSerializer, SucursalSerializer, DepartamentoSerializer, 
    PuestoSerializer, TurnoSerializer, AreaSerializer, NotificacionSerializer
)

# Helper para obtener empresa del usuario logueado
def get_empresa_usuario(user):
    try:
        # Buscamos el empleado asociado al usuario logueado
        perfil = Empleado.objects.get(usuario=user)
        return perfil.empresa
    except Empleado.DoesNotExist:
        return None

# ==================================================
# MIXIN DE SEGURIDAD (Inyecta Empresa Automáticamente)
# ==================================================
class EmpresaContextMixin:
    """
    Este Mixin intercepta el guardado para asignar la empresa automáticamente
    basada en el usuario logueado.
    """
    def perform_create(self, serializer):
        user = self.request.user
        
        # 1. Si es Superadmin, dejamos que pase (puede venir en el JSON o ser null)
        if user.is_superuser:
            serializer.save()
            return

        # 2. Si es usuario normal, forzamos SU empresa
        try:
            empleado = Empleado.objects.get(usuario=user)
            # El serializer.save() acepta argumentos extra que no vienen del request
            serializer.save(empresa=empleado.empresa)
        except Empleado.DoesNotExist:
            raise ValidationError({"error": "No tienes un perfil de empleado asociado."})

# ==================================================
# 1. AUTENTICACIÓN (Tu código estaba bien aquí)
# ==================================================
class CustomLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        role = 'SUPERADMIN'
        empresa_id = None
        nombre_empresa = None
        user_data = {'id': user.id, 'email': user.email, 'nombres': user.username}

        try:
            empleado = Empleado.objects.get(email=user.email)
            if not empleado.empresa.estado:
                 return Response({'error': 'ACCESO DENEGADO: Empresa inactiva.'}, status=403)
            role = empleado.rol
            empresa_id = empleado.empresa.id
            nombre_empresa = empleado.empresa.nombre_comercial
            user_data = {
                'id': empleado.id, 
                'nombres': empleado.nombres,
                'apellidos': empleado.apellidos,
                'email': empleado.email,
                'puesto': empleado.puesto.nombre if empleado.puesto else 'Sin cargo',
                'saldo_vacaciones': empleado.saldo_vacaciones,
                'rol': empleado.rol
            }
        except Empleado.DoesNotExist:
            if not user.is_superuser:
                return Response({'error': 'Usuario sin ficha de empleado activa'}, status=400)

        return Response({
            'token': token.key,
            'role': role,
            'empresa_id': empresa_id,
            'nombre_empresa': nombre_empresa,
            'user': user_data
        })

# ==================================================
# 2. DASHBOARD (Tu código estaba bien aquí)
# ==================================================
class DashboardStatsView(APIView):
    def get(self, request):
        user = request.user
        hoy = timezone.now().date()
        empleados_qs = Empleado.objects.all()
        
        if not user.is_superuser:
            try:
                perfil = Empleado.objects.get(email=user.email)
                empleados_qs = empleados_qs.filter(empresa=perfil.empresa)
            except:
                return Response({'error': 'Usuario sin perfil'}, status=400)
        
        total_empleados = empleados_qs.filter(estado='ACTIVO').count()
        asistencias_hoy = Jornada.objects.filter(fecha=hoy, empleado__in=empleados_qs).count()
        ausencias_hoy = SolicitudAusencia.objects.filter(
            fecha_inicio__lte=hoy, fecha_fin__gte=hoy, estado='APROBADA', empleado__in=empleados_qs
        ).count()
        
        return Response({
            'total_empleados': total_empleados,
            'presentes_hoy': asistencias_hoy,
            'ausentes_hoy': ausencias_hoy,
            'porcentaje_asistencia': round((asistencias_hoy / total_empleados * 100), 1) if total_empleados > 0 else 0
        })

# ==================================================
# 3. VIEWSETS DEL CORE (ESTRUCTURA)
# ==================================================

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all().order_by('-id')
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # 1. SuperAdmin ve TODO
        if self.request.user.is_superuser:
            return Empresa.objects.all().order_by('-id')
        
        # 2. Usuarios normales ven SU empresa
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return Empresa.objects.filter(id=empresa.id)
        return Empresa.objects.none()

    def create(self, request, *args, **kwargs):
        print("🚀 INICIANDO CREACIÓN DE EMPRESA...") # DEBUG
        
        # Copiamos datos para no alterar el request original
        data = request.data.copy()
        
        # Extraemos datos del admin
        admin_email = data.get('admin_email')
        admin_pass = data.get('admin_password')
        admin_nombre = data.get('admin_nombre') or 'Administrador'

        print(f"📧 Admin Email: {admin_email}") # DEBUG

        if not admin_email or not admin_pass:
            print("❌ ERROR: Faltan credenciales")
            return Response({'error': 'Faltan credenciales del admin'}, status=400)
        
        if User.objects.filter(username=admin_email).exists():
            print("❌ ERROR: Usuario ya existe")
            return Response({'error': 'El correo del administrador ya está registrado'}, status=400)

        try:
            # INICIO DE TRANSACCIÓN: O todo se guarda, o nada se guarda.
            with transaction.atomic():
                
                # 1. Crear Empresa
                print("1️⃣ Guardando Empresa...")
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                empresa = serializer.save()
                print(f"✅ Empresa creada: ID {empresa.id}")

                # 2. Crear Sucursal Matriz
                print("2️⃣ Creando Matriz...")
                matriz = Sucursal.objects.create(
                    empresa=empresa, 
                    nombre="Casa Matriz", 
                    es_matriz=True,
                    direccion=empresa.direccion
                )

                # 3. Desconexión de Signals (Evita correos fantasma)
                print("3️⃣ Gestionando Signals...")
                receivers = post_save._live_receivers(User)
                for receiver in receivers:
                    post_save.disconnect(receiver, sender=User)

                # 4. Crear Usuario
                print("4️⃣ Creando Usuario Admin...")
                user = User.objects.create_user(
                    username=admin_email, 
                    email=admin_email, 
                    password=admin_pass, 
                    first_name=admin_nombre
                )

                # 5. Crear Empleado (Perfil)
                print("5️⃣ Creando Ficha Empleado...")
                Empleado.objects.create(
                    usuario=user,
                    empresa=empresa,
                    sucursal=matriz,
                    nombres=admin_nombre,
                    apellidos="(Dueño)",
                    email=admin_email,
                    rol='ADMIN',
                    fecha_ingreso=timezone.now().date(),
                    sueldo=0,
                    saldo_vacaciones=0,
                    estado='ACTIVO'
                )
                
                print("✨ TODO LISTO. COMMIT DE TRANSACCIÓN.")
                
                # Preparamos respuesta exitosa
                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            # Si algo falla, entra aquí y la BD se deshace (Rollback)
            print(f"🔥 CRASH ERROR: {str(e)}")
            import traceback
            traceback.print_exc() # Esto imprimirá el error exacto en tu terminal
            return Response({'error': f'Error interno: {str(e)}'}, status=400)


class SucursalViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Intentamos obtener la empresa del usuario (incluso si es SuperAdmin)
        empresa = get_empresa_usuario(self.request.user)
        
        if empresa:
            # Si tiene empresa asignada, filtra por ella
            return self.queryset.filter(empresa=empresa)
        
        # Si es SuperAdmin PERO NO TIENE empresa asignada (caso raro), no ve nada
        return self.queryset.none()

# 2. ÁREA (Limpio)
class AreaViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return self.queryset.filter(empresa=empresa)
        return self.queryset.none()

# 3. DEPARTAMENTO (Limpio)
class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            qs = self.queryset.filter(sucursal__empresa=empresa)
            # Filtro opcional por sucursal
            sucursal_id = self.request.query_params.get('sucursal')
            if sucursal_id:
                qs = qs.filter(sucursal_id=sucursal_id)
            return qs
        return self.queryset.none()

# 4. PUESTO (Limpio)
class PuestoViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Puesto.objects.all()
    serializer_class = PuestoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            qs = self.queryset.filter(empresa=empresa)
            area_id = self.request.query_params.get('area')
            if area_id:
                qs = qs.filter(area_id=area_id)
            return qs
        return self.queryset.none()

# 5. TURNO (Limpio)
class TurnoViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return self.queryset.filter(empresa=empresa)
        return self.queryset.none()
    

class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notificacion.objects.filter(usuario_destino=self.request.user)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    data = {
        'nombres': user.first_name or user.username,
        'rol': 'Usuario',
        'puesto': 'General',
        'saldo_vacaciones': 0,
        'solicitudes_pendientes': 0,
        'es_lider': False,
        'estado': 'Activo'
    }

    try:
        perfil = Empleado.objects.get(usuario=user)
        data['nombres'] = f"{perfil.nombres} {perfil.apellidos}".split()[0]
        data['rol'] = perfil.get_rol_display()
        data['puesto'] = perfil.puesto.nombre if perfil.puesto else "Sin puesto"
        data['saldo_vacaciones'] = perfil.saldo_vacaciones 
        data['estado'] = perfil.estado
        data['es_lider'] = perfil.rol in ['GERENTE', 'RRHH', 'ADMIN', 'SUPERADMIN']

        if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
            data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                estado='PENDIENTE'
            ).exclude(empleado=perfil).count()
        elif perfil.rol == 'GERENTE':
            # Verificamos si manda en sucursales
            sucursales_a_cargo = perfil.sucursales_a_cargo.all()
            
            if sucursales_a_cargo.exists():
                # Cuenta pendientes de TODA la sucursal
                data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                    estado='PENDIENTE',
                    empleado__sucursal__in=sucursales_a_cargo
                ).exclude(empleado=perfil).count()
            else:
                # Cuenta solo de su departamento (Jefe de Área)
                data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                    estado='PENDIENTE',
                    empleado__departamento=perfil.departamento
                ).exclude(empleado=perfil).count()

    except Empleado.DoesNotExist:
        if user.is_superuser:
            data['rol'] = 'Super Administrador'
            data['es_lider'] = True

    return Response(data)

