from rest_framework import viewsets, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.contrib.auth.models import User
from personal.models import Empleado
from django.db import transaction
# Modelos
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion
from personal.models import Empleado, SolicitudAusencia
from asistencia.models import Jornada
from rest_framework import status
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
# 1. AUTENTICACIÓN (Sin cambios, tu código estaba bien)
# ==================================================
class CustomLoginView(ObtainAuthToken):
    # ... (Mantén tu código de Login tal cual estaba, es correcto) ...
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
# 2. DASHBOARD (Sin cambios, estaba bien)
# ==================================================
class DashboardStatsView(APIView):
    # ... (Mantén tu código, es correcto) ...
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
# 3. VIEWSETS DEL CORE (CORREGIDOS)
# ==================================================

class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer

    def create(self, request, *args, **kwargs):
        # 1. Separar datos de Admin y Empresa
        data = request.data.copy()
        
        admin_email = data.pop('admin_email', None)
        admin_password = data.pop('admin_password', None)
        admin_nombre = data.pop('admin_nombre', None)

        # 2. Validación Manual
        if not admin_email or not admin_password:
            return Response(
                {"error": "Faltan credenciales del Administrador (Email o Password)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # 3. Serializar y Guardar Empresa
                serializer = self.get_serializer(data=data)
                if not serializer.is_valid():
                    print("❌ Error Val Empresa:", serializer.errors)
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
                empresa = serializer.save()

                # 4. Validar Usuario existente
                if User.objects.filter(email=admin_email).exists():
                    raise Exception(f"El email {admin_email} ya está registrado.")
                
                # 5. Crear Usuario Django
                user = User.objects.create_user(
                    username=admin_email, 
                    email=admin_email, 
                    password=admin_password,
                    first_name=admin_nombre or "Admin"
                )

                # 6. Crear Sucursal Matriz
                sucursal_matriz = Sucursal.objects.create(
                    nombre="Matriz Principal",
                    empresa=empresa,
                    es_matriz=True,
                    direccion=empresa.direccion or "Dirección Principal"
                )

                # 7. Crear Departamento Gerencia
                depto_admin = Departamento.objects.create(
                    nombre="Gerencia General",
                    sucursal=sucursal_matriz
                )

                # 8. Crear Empleado (Lazy Import)
                from personal.models import Empleado
                Empleado.objects.create(
                    usuario=user,
                    nombres=admin_nombre or "Administrador",
                    apellidos="",
                    email=admin_email,
                    empresa=empresa,
                    rol='ADMIN',
                    # sucursal=sucursal_matriz, <--- ¡ESTA LÍNEA SE BORRA!
                    departamento=depto_admin, # El departamento ya vincula la sucursal
                    fecha_ingreso=timezone.now().date(),
                    sueldo=0,
                    estado='ACTIVO'
                )

                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"🔥 Error en Create Empresa: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

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
        
        # 2. Filtro Opcional (Para SuperAdmin viendo una empresa X)
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

        # 1. Seguridad: Solo deptos de sucursales de mi empresa
        if empresa:
            queryset = queryset.filter(sucursal__empresa=empresa)

        # 2. Filtros Frontend
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
        # Seguridad: Solo ver mis áreas
        if empresa:
            return Area.objects.filter(empresa=empresa)
        
        # Si es superadmin, ver todas o filtrar por param
        queryset = Area.objects.all()
        empresa_param = self.request.query_params.get('empresa')
        if empresa_param:
            queryset = queryset.filter(empresa_id=empresa_param)
        return queryset

    def perform_create(self, serializer):
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            # Cliente creando área -> Asignar su empresa
            serializer.save(empresa=empresa)
        else:
            # Superadmin creando área -> Debe venir 'empresa' en el JSON
            serializer.save()

class PuestoViewSet(viewsets.ModelViewSet):
    queryset = Puesto.objects.all()
    serializer_class = PuestoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Puesto.objects.all()
        empresa = get_empresa_usuario(self.request.user)
        
        # 1. Seguridad
        if empresa:
            queryset = queryset.filter(empresa=empresa)
        else:
            # Superadmin filtrando
            empresa_param = self.request.query_params.get('empresa')
            if empresa_param:
                queryset = queryset.filter(empresa_id=empresa_param)
        
        # 2. Filtros de Cascada (Frontend)
        # Filtro por DEPARTAMENTO (Opcional, si tu modelo Puesto tiene FK a Depto)
        # Nota: En el nuevo modelo sugerido, Puesto se vincula a ÁREA, no Depto.
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
        # Cada usuario solo ve SUS notificaciones
        return Notificacion.objects.filter(usuario_destino=self.request.user)