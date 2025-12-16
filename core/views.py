from rest_framework import viewsets, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User

# Modelos
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion
from personal.models import Empleado

# Serializers
from .serializers import (
    EmpresaSerializer, SucursalSerializer, DepartamentoSerializer, 
    PuestoSerializer, TurnoSerializer, AreaSerializer, NotificacionSerializer
)
def get_empresa_usuario(user):
    if user.is_superuser: return None
    try:
        return Empleado.objects.get(email=user.email).empresa
    except Empleado.DoesNotExist:
        return None
# 1. EMPRESAS
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all() # <--- IMPORTANTE
    serializer_class = EmpresaSerializer

# 2. SUCURSALES
class SucursalViewSet(viewsets.ModelViewSet):
    queryset = Sucursal.objects.all() # <--- IMPORTANTE
    serializer_class = SucursalSerializer
    
    def get_queryset(self):
        queryset = Sucursal.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            queryset = queryset.filter(empresa_id=empresa_id)
        return queryset

# 3. DEPARTAMENTOS
class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.all() # <--- IMPORTANTE
    serializer_class = DepartamentoSerializer
    
    def get_queryset(self):
        queryset = Departamento.objects.all()
        sucursal_id = self.request.query_params.get('sucursal')
        if sucursal_id:
            queryset = queryset.filter(sucursal_id=sucursal_id)
        return queryset

# 4. ÁREAS (Aquí estaba el error de guardar)
class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return Area.objects.filter(empresa=empresa)
        return Area.objects.all() # Superadmin ve todo

    def perform_create(self, serializer):
        # AUTOMÁTICO: Asigna la empresa del usuario logueado
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            serializer.save(empresa=empresa)
        elif self.request.user.is_superuser:
            serializer.save() # Superadmin debe mandar el ID en el JSON
        else:
            raise serializers.ValidationError({"error": "No tienes una empresa asignada."})

    # Auto-asignar empresa al crear
    def perform_create(self, serializer):
        user = self.request.user
        if user.is_staff and not user.is_superuser:
            try:
                perfil = Empleado.objects.get(email=user.email)
                serializer.save(empresa=perfil.empresa)
            except:
                raise serializers.ValidationError("No tienes perfil de empleado.")
        else:
            serializer.save()

# 5. PUESTOS (Aquí estaba el error de lista vacía)
class PuestoViewSet(viewsets.ModelViewSet):
    queryset = Puesto.objects.all()
    serializer_class = PuestoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Puesto.objects.all()
        empresa = get_empresa_usuario(self.request.user)
        
        # Filtro de Seguridad
        if empresa:
            queryset = queryset.filter(empresa=empresa)
        
        # Filtros opcionales (URL)
        dept_id = self.request.query_params.get('departamento')
        if dept_id:
            queryset = queryset.filter(departamento_id=dept_id)
            
        return queryset

    def perform_create(self, serializer):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            serializer.save(empresa=empresa)
        else:
            serializer.save()

# 6. TURNOS
class TurnoViewSet(viewsets.ModelViewSet):
    queryset = Turno.objects.all() # <--- IMPORTANTE
    serializer_class = TurnoSerializer

# 7. NOTIFICACIONES
class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all() # <--- IMPORTANTE
    serializer_class = NotificacionSerializer
    
    def get_queryset(self):
        return Notificacion.objects.filter(usuario_destino=self.request.user)

# --- VISTAS EXTRA ---

class DashboardStatsView(APIView):
    def get(self, request):
        stats = {
            "total_empleados": Empleado.objects.count(),
            "total_empresas": Empresa.objects.count(),
            "total_sucursales": Sucursal.objects.count(),
            "total_departamentos": Departamento.objects.count(),
        }
        return Response(stats)

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        empresa_id = None
        nombre_empresa = None
        es_admin_empresa = user.is_staff
        rol = 'EMPLOYEE'

        if user.is_superuser:
            rol = 'SUPERADMIN'
        elif user.groups.filter(name='OWNER').exists():
            rol = 'CLIENT'   # Dueño de Empresa
        elif user.groups.filter(name='MANAGER').exists():
            rol = 'MANAGER'  # Gerente / Supervisor

        if not user.is_superuser:
            try:
                perfil = Empleado.objects.get(email=user.email)
                empresa_id = perfil.empresa.id
                nombre_empresa = perfil.empresa.razon_social
            except Empleado.DoesNotExist:
                pass

        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'role': rol,
            'es_superadmin': user.is_superuser,
            'es_admin_empresa': es_admin_empresa,
            'empresa_id': empresa_id,
            'nombre_empresa': nombre_empresa
        })