from django.forms import ValidationError
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework.decorators import action
from datetime import timedelta

from django.db.models.signals import post_save 
import pandas as pd
from rest_framework.parsers import MultiPartParser, FormParser
# Modelos
from .models import Empresa, Sucursal, Departamento, Puesto, Turno, Area, Notificacion, ConfiguracionNomina
from personal.models import Empleado, SolicitudAusencia, Tarea
from asistencia.models import Jornada
from .serializers import ConfiguracionNominaSerializer
# Serializers
from .serializers import (
    EmpresaSerializer, SucursalSerializer, DepartamentoSerializer, 
    PuestoSerializer, TurnoSerializer, AreaSerializer, NotificacionSerializer
)

# Helper para obtener empresa del usuario logueado
def get_empresa_usuario(user):
    try:
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

            # Validar que la empresa esté activa
            if not empleado.empresa.estado:
                 return Response({'error': 'ACCESO DENEGADO: Empresa inactiva.'}, status=403)

            # Validar que el empleado esté activo
            if empleado.estado != 'ACTIVO':
                return Response({'error': 'ACCESO DENEGADO: Tu cuenta de empleado está inactiva.'}, status=403)

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
        print("INICIANDO CREACION DE EMPRESA...")  # DEBUG
        
        # Copiamos datos para no alterar el request original
        data = request.data.copy()
        
        # FIX: Normalizar strings para encoding issues en Windows
        for field in ['razon_social', 'nombre_comercial', 'ruc', 'direccion']:
            if field in data and isinstance(data[field], str):
                try:
                    data[field] = data[field].encode('utf-8', errors='replace').decode('utf-8', errors='replace').strip()
                except Exception as e:
                    print(f"⚠️ Error normalizando {field}: {e}")
        
        # Extraemos datos del admin
        admin_email = data.get('admin_email')
        admin_pass = data.get('admin_password')
        admin_nombre = data.get('admin_nombre') or 'Administrador'

        print(f"Admin Email: {admin_email}") # DEBUG

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
            print(f"CRASH ERROR: {str(e)}")
            import traceback
            traceback.print_exc() # Esto imprimirá el error exacto en tu terminal
            return Response({'error': f'Error interno: {str(e)}'}, status=400)

    @action(detail=True, methods=['post'], url_path='toggle-estado')
    def toggle_estado(self, request, pk=None):
        """Activar/Desactivar empresa"""
        empresa = self.get_object()

        # Solo SUPERADMIN puede cambiar estado de empresas
        if not request.user.is_superuser:
            return Response({'error': 'Solo el SuperAdmin puede cambiar el estado de empresas.'}, status=403)

        # Cambiar estado
        empresa.estado = not empresa.estado
        empresa.save(update_fields=['estado'])

        return Response({
            'id': empresa.id,
            'estado': empresa.estado,
            'mensaje': f'Empresa {"activada" if empresa.estado else "desactivada"} correctamente'
        })


class SucursalViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Sucursal.objects.all()
    serializer_class = SucursalSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Si es superuser, mostrar todas las sucursales
        if self.request.user.is_superuser:
            return self.queryset.all()
        
        # Si no es superuser, filtrar por empresa del usuario
        empresa = get_empresa_usuario(self.request.user)
        if empresa:
            return self.queryset.filter(empresa=empresa)
        
        return self.queryset.none()

# 2. ÁREA (Limpio)
class AreaViewSet(EmpresaContextMixin, viewsets.ModelViewSet):
    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Si es superuser, mostrar todas las áreas
        if self.request.user.is_superuser:
            return self.queryset.all()
        
        # Si no es superuser, filtrar por empresa del usuario
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
        # Si es superuser, mostrar todos los departamentos
        if self.request.user.is_superuser:
            return self.queryset.all()
        
        # Si no es superuser, filtrar por empresa del usuario
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
        # Si es superuser, mostrar todos los puestos
        if self.request.user.is_superuser:
            return self.queryset.all()
        
        # Si no es superuser, filtrar por empresa del usuario
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
        # Si es superuser, mostrar todos los turnos
        if self.request.user.is_superuser:
            return self.queryset.all()
        
        # Si no es superuser, filtrar por empresa del usuario
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
    hoy = timezone.now().date()
    data = {
        'nombres': user.first_name or user.username,
        'rol': 'Usuario',
        'puesto': 'General',
        'saldo_vacaciones': 0,
        'solicitudes_pendientes': 0,
        'es_lider': False,
        'estado': 'Activo',
        'jornada_abierta': False,
        'total_empleados': 0,
        'presentes_hoy': 0,
        'ausentes_hoy': 0,
        'porcentaje_asistencia': 0
    }

    try:
        perfil = Empleado.objects.get(usuario=user)
        empresa = perfil.empresa
        data['nombres'] = f"{perfil.nombres} {perfil.apellidos}".split()[0]
        data['rol'] = perfil.get_rol_display()
        data['puesto'] = perfil.puesto.nombre if perfil.puesto else "Sin puesto"
        data['saldo_vacaciones'] = perfil.saldo_vacaciones 
        data['estado'] = perfil.estado
        data['es_lider'] = perfil.rol in ['GERENTE', 'RRHH', 'ADMIN', 'SUPERADMIN']
        jornada_activa = Jornada.objects.filter(
            empleado=perfil, 
            estado='ABIERTA'
        ).exists()
        
        data['jornada_abierta'] = jornada_activa
        
        # ===== DATOS DE ASISTENCIA DE HOY =====
        if perfil.rol in ['ADMIN', 'RRHH']:
            empleados_empresa = Empleado.objects.filter(empresa=empresa, estado='ACTIVO')
            data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                estado='PENDIENTE',
                empresa=empresa
            ).exclude(empleado=perfil).count()
        elif perfil.rol == 'GERENTE':
            # Los gerentes ven empleados de su propia sucursal
            if perfil.sucursal:
                empleados_empresa = Empleado.objects.filter(empresa=empresa, sucursal=perfil.sucursal, estado='ACTIVO')
                data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                    estado='PENDIENTE',
                    empresa=empresa,
                    empleado__sucursal=perfil.sucursal
                ).exclude(empleado=perfil).count()
            else:
                empleados_empresa = Empleado.objects.filter(empresa=empresa, departamento=perfil.departamento, estado='ACTIVO')
                data['solicitudes_pendientes'] = SolicitudAusencia.objects.filter(
                    estado='PENDIENTE',
                    empresa=empresa,
                    empleado__departamento=perfil.departamento
                ).exclude(empleado=perfil).count()
        else:
            empleados_empresa = Empleado.objects.filter(id=perfil.id)
        
        # Calcular asistencia hoy
        total_empleados = empleados_empresa.count()
        presentes_hoy = Jornada.objects.filter(empleado__in=empleados_empresa, fecha=hoy).count()
        ausencias_autorizadas = SolicitudAusencia.objects.filter(
            fecha_inicio__lte=hoy, fecha_fin__gte=hoy, 
            estado='APROBADA', empleado__in=empleados_empresa
        ).count()
        ausentes_hoy = total_empleados - presentes_hoy - ausencias_autorizadas
        
        data['total_empleados'] = total_empleados
        data['presentes_hoy'] = presentes_hoy
        data['ausentes_hoy'] = max(0, ausentes_hoy)
        data['porcentaje_asistencia'] = round((presentes_hoy / total_empleados * 100), 1) if total_empleados > 0 else 0

        # ===== DATOS DE TAREAS PENDIENTES =====
        if perfil.rol == 'EMPLEADO':
            # Para empleados: contar tareas asignadas que no estén completadas
            data['tareas_pendientes'] = Tarea.objects.filter(
                asignado_a=perfil,
                estado__in=['PENDIENTE', 'PROGRESO', 'REVISION']
            ).count()
        elif perfil.rol in ['ADMIN', 'RRHH']:
            # Para admin/rrhh: contar todas las tareas pendientes de la empresa
            data['tareas_pendientes'] = Tarea.objects.filter(
                empresa=empresa,
                estado__in=['PENDIENTE', 'PROGRESO', 'REVISION']
            ).count()
        elif perfil.rol == 'GERENTE':
            # Para gerentes: contar tareas pendientes de su equipo (sucursal o departamento)
            if perfil.sucursal:
                data['tareas_pendientes'] = Tarea.objects.filter(
                    empresa=empresa,
                    asignado_a__sucursal=perfil.sucursal,
                    estado__in=['PENDIENTE', 'PROGRESO', 'REVISION']
                ).count()
            else:
                data['tareas_pendientes'] = Tarea.objects.filter(
                    empresa=empresa,
                    asignado_a__departamento=perfil.departamento,
                    estado__in=['PENDIENTE', 'PROGRESO', 'REVISION']
                ).count()
        else:
            data['tareas_pendientes'] = 0

    except Empleado.DoesNotExist:
        if user.is_superuser:
            data['rol'] = 'Super Administrador'
            data['es_lider'] = True

    return Response(data)

class ConfiguracionNominaViewSet(viewsets.GenericViewSet):
    """
    Vista Singleton: Solo existe una configuración por empresa.
    No usamos ModelViewSet completo porque no queremos una lista, solo un objeto único.
    """
    serializer_class = ConfiguracionNominaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ConfiguracionNomina.objects.none() # No se usa lista directa

    @action(detail=False, methods=['get', 'put', 'patch'])
    def mi_configuracion(self, request):
        try:
            empresa = None
            
            # Si es superuser, obtener su empresa del request
            if request.user.is_superuser:
                try:
                    empresa = get_empresa_usuario(request.user)
                except:
                    empresa = None
                
                if not empresa:
                    # Si no tiene empresa, intentar obtener la primera empresa del sistema
                    from .models import Empresa as EmpresaModel
                    empresa = EmpresaModel.objects.first()
                    if not empresa:
                        return Response({'error': 'No hay empresas configuradas en el sistema.'}, status=400)
            else:
                empleado = Empleado.objects.get(usuario=request.user)
                empresa = empleado.empresa
            
            # Buscamos la config de SU empresa, o la creamos si no existe
            config, created = ConfiguracionNomina.objects.get_or_create(
                empresa=empresa
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(config)
                return Response(serializer.data)
            
            elif request.method in ['PUT', 'PATCH']:
                # Solo Admin, RRHH, SUPERADMIN o Superuser pueden editar
                if not request.user.is_superuser:
                    empleado = Empleado.objects.get(usuario=request.user)
                    if empleado.rol not in ['ADMIN', 'RRHH', 'SUPERADMIN']:
                        return Response({'error': 'No tienes permisos para editar la nómina.'}, status=403)

                serializer = self.get_serializer(config, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=400)

        except Empleado.DoesNotExist:
            return Response({'error': 'Usuario no es empleado.'}, status=403)
        except Exception as e:
            import traceback
            print(f"ERROR en mi_configuracion: {e}")
            print(traceback.format_exc())
            return Response({'error': f'Error interno: {str(e)}'}, status=500)
class DashboardChartsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        print(f"DashboardChartsView called by user: {user.username}")
        try:
            # Si es superuser, obtener empresa del contexto
            if user.is_superuser:
                empresa = get_empresa_usuario(user)
                if not empresa:
                    from .models import Empresa as EmpresaModel
                    empresa = EmpresaModel.objects.first()
                    if not empresa:
                        return Response({'error': 'No hay empresas configuradas.'}, status=400)
            else:
                empleado = Empleado.objects.get(usuario=user)
                empresa = empleado.empresa
                print(f"Empleado: {empleado.nombres} {empleado.apellidos}, rol: {empleado.rol}, empresa: {empresa.nombre}")
            
            hoy = timezone.now().date()
            print(f"Fecha hoy: {hoy}")

            # --- GRÁFICO 1: ASISTENCIA DE HOY (Pie Chart) ---
            total_empleados = Empleado.objects.filter(empresa=empresa, estado='ACTIVO').count()
            jornadas_hoy = Jornada.objects.filter(empresa=empresa, fecha=hoy)

            presentes = jornadas_hoy.count()
            atrasos = jornadas_hoy.filter(es_atraso=True).count()
            puntuales = presentes - atrasos
            ausentes = total_empleados - presentes

            print(f"Total empleados: {total_empleados}, jornadas hoy: {presentes}, atrasos: {atrasos}, ausentes: {ausentes}")
            
            # --- GRÁFICO 2: PRODUCTIVIDAD SEMANAL (Bar Chart) ---
            # Tareas completadas en los últimos 7 días
            hace_una_semana = timezone.now() - timedelta(days=6) # 6 días atrás + hoy
            
            tareas_semana = Tarea.objects.filter(
                empresa=empresa,
                estado='COMPLETADA',
                completado_at__gte=hace_una_semana
            ).annotate(
                dia=TruncDate('completado_at')
            ).values('dia').annotate(total=Count('id')).order_by('dia')

            # Formatear para Chart.js (Labels y Data)
            labels_semana = []
            data_semana = []
            
            # Rellenar días vacíos (si no hubo tareas el martes, que salga 0)
            for i in range(7):
                dia_check = (hace_una_semana + timedelta(days=i)).date()
                dia_str = dia_check.strftime("%a %d") # Ej: "Lun 21"
                labels_semana.append(dia_str)
                
                # Buscar si hay datos para este día
                encontrado = next((item for item in tareas_semana if item['dia'] == dia_check), None)
                data_semana.append(encontrado['total'] if encontrado else 0)

            response_data = {
                'asistencia': {
                    'labels': ['Puntuales', 'Atrasos', 'Ausentes'],
                    'data': [puntuales, atrasos, ausentes]
                },
                'productividad': {
                    'labels': labels_semana,
                    'data': data_semana
                }
            }
            print(f"Response data: {response_data}")
            return Response(response_data)

        except Empleado.DoesNotExist:
            return Response({'error': 'No autorizado'}, status=403)
        except Exception as e:
            import traceback
            error_msg = str(e)
            traceback._print_exc()
            print(f"ERROR en DashboardChartsView: {error_msg}")
            print(traceback.format_exc())
            return Response({'error': f'Error interno: {error_msg}'}, status=500)


# ============================================================================
# API DE PERMISOS - Para el Frontend
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_permissions(request):
    """
    Retorna los permisos del usuario autenticado para el frontend.
    
    Esto permite que el frontend sepa qué módulos mostrar/ocultar
    y qué acciones puede realizar el usuario.
    
    Returns:
        {
            'rol': 'GERENTE',
            'permisos': {...},
            'modulos_restringidos': ['organizacion', 'empresas', 'configuracion'],
            'puede_ver_organizacion': False,
            'puede_ver_empleados': True,
            'puede_ver_configuracion': False,
            'sucursal_id': 1,
            'empresa_id': 1,
        }
    """
    from core.permissions import get_permisos_usuario
    
    permisos = get_permisos_usuario(request.user)
    return Response(permisos)