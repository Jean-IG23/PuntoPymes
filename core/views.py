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
    if user.is_superuser: return None
    try:
        # Busca empleado activo vinculado al usuario
        return Empleado.objects.get(email=user.email).empresa
    except Empleado.DoesNotExist:
        return None

# ==================================================
# 1. AUTENTICACIÓN
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
# 2. DASHBOARD
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

    def create(self, request, *args, **kwargs):
        """
        Crea Empresa + Sucursal + Usuario + Empleado.
        INCLUYE PARCHE PARA DESCONECTAR SIGNALS FANTASMAS.
        """
        data = request.data.copy()
        
        admin_email = data.get('admin_email')
        admin_pass = data.get('admin_password')
        admin_nombre = data.get('admin_nombre') or 'Administrador'

        if not admin_email or not admin_pass:
            return Response({'error': 'Faltan credenciales del admin'}, status=400)
        
        if User.objects.filter(username=admin_email).exists():
            return Response({'error': 'El usuario ya existe'}, status=400)

        try:
            with transaction.atomic():
                # 1. Crear Empresa
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                empresa = serializer.save()

                # 2. Crear Sucursal Matriz
                matriz = Sucursal.objects.create(
                    empresa=empresa, 
                    nombre="Casa Matriz", 
                    es_matriz=True,
                    direccion=empresa.direccion
                )

                # ==============================================================================
                # 🛑 CIRUGÍA DE SIGNALS: DESCONEXIÓN TEMPORAL
                # ==============================================================================
                # Buscamos quién está escuchando la creación de usuarios y los desconectamos.
                # Esto evita que el código "fantasma" se ejecute y rompa la BD.
                receivers = post_save._live_receivers(User)
                for receiver in receivers:
                    post_save.disconnect(receiver, sender=User)
                # ==============================================================================

                # 3. Crear Usuario (Ahora es seguro, el signal fantasma está mudo)
                user = User.objects.create_user(
                    username=admin_email, 
                    email=admin_email, 
                    password=admin_pass, 
                    first_name=admin_nombre
                )

                # 4. Crear Empleado Manualmente (Con datos CORRECTOS)
                Empleado.objects.create(
                    usuario=user,
                    empresa=empresa,
                    sucursal=matriz,
                    nombres=admin_nombre,
                    apellidos="(Dueño)",
                    email=admin_email,
                    rol='ADMIN',
                    fecha_ingreso=timezone.now().date(), # ¡Esto evita el error NULL!
                    sueldo=0,
                    saldo_vacaciones=0,
                    estado='ACTIVO'
                )

                headers = self.get_success_headers(serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

        except Exception as e:
            import traceback
            traceback.print_exc() 
            return Response({'error': f'Error interno: {str(e)}'}, status=400)

class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Sucursal.objects.all()
        empresa = get_empresa_usuario(self.request.user)
        
        # 1. Seguridad: Filtrar por mi empresa
        if empresa:
            queryset = queryset.filter(empresa=empresa)
        
        # 2. Filtro Opcional (Para SuperAdmin)
        empresa_param = self.request.query_params.get('empresa')
        if empresa_param:
            queryset = queryset.filter(empresa_id=empresa_param)
            
        return queryset

class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Departamento.objects.all()
        empresa = get_empresa_usuario(self.request.user)

        if empresa:
            queryset = queryset.filter(sucursal__empresa=empresa)

        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            queryset = queryset.filter(sucursal_id=sucursal_id)
            
        return queryset

class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return Area.objects.filter(empresa=empresa)
        
        queryset = Area.objects.all()
        empresa_param = self.request.query_params.get('empresa')
        if empresa_param:
            queryset = queryset.filter(empresa_id=empresa_param)
        return queryset

    def perform_create(self, serializer):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            serializer.save(empresa=empresa)
        else:
            serializer.save()

class PuestoViewSet(viewsets.ModelViewSet):
    queryset = Puesto.objects.all()
    serializer_class = PuestoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Puesto.objects.all()
        empresa = get_empresa_usuario(self.request.user)
        
        if empresa:
            queryset = queryset.filter(empresa=empresa)
        else:
            empresa_param = self.request.query_params.get('empresa')
            if empresa_param:
                queryset = queryset.filter(empresa_id=empresa_param)
        
        area_id = self.request.query_params.get('area')
        if area_id:
            queryset = queryset.filter(area_id=area_id)
            
        return queryset

    def perform_create(self, serializer):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            serializer.save(empresa=empresa)
        else:
            serializer.save()

class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all()
    serializer_class = TurnoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return Turno.objects.filter(empresa=empresa)
        return Turno.objects.all()

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
        data['saldo_vacaciones'] = perfil.saldo_vacaciones or 0
        data['estado'] = perfil.estado
        data['es_lider'] = perfil.rol in ['GERENTE', 'RRHH', 'ADMIN', 'SUPERADMIN']

        if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
            data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                estado='PENDIENTE'
            ).exclude(empleado=perfil).count()
        elif perfil.rol == 'GERENTE':
            data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                estado='PENDIENTE',
                empleado__departamento=perfil.departamento
            ).exclude(empleado=perfil).count()

    except Empleado.DoesNotExist:
        if user.is_superuser:
            data['rol'] = 'Super Administrador'
            data['es_lider'] = True

    return Response(data)