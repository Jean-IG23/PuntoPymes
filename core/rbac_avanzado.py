"""
╔══════════════════════════════════════════════════════════════════════════╗
║         TALENTTRACK - SISTEMA AVANZADO DE RBAC CON ROW-LEVEL SECURITY   ║
║                                                                          ║
║  Arquitectura: Control de Acceso Basado en Roles (RBAC) + Seguridad    ║
║               a Nivel de Fila (Row-Level Security) + Workflow           ║
║                                                                          ║
║  Fecha: Enero 23, 2026                                                  ║
║  Arquitecto: Senior Security Specialist                                 ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

from functools import wraps
from django.db.models import Q
from rest_framework.response import Response
from rest_framework import status
from personal.models import Empleado
from django.core.exceptions import ValidationError


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 1: DEFINICIÓN DE ROLES Y JERARQUÍA
# ═══════════════════════════════════════════════════════════════════════════

"""
ESTRUCTURA JERÁRQUICA DE ROLES (De mayor a menor autoridad):

Level 4: ADMIN_GLOBAL (RRHH) ─── Acceso total a toda la empresa
         └─ Responsabilidades:
            • Ver/Editar todos los empleados
            • Aprobar/Rechazar solicitudes de ausencia (todas)
            • Crear/Editar/Eliminar configuración
            • Ver estructura organizacional completa (Org Chart)
            • Generar reportes globales
            • Administrar turnos y políticas
            • Acceso a nómina (lectura/creación)

Level 3: GERENTE_SUCURSAL ─────── Máxima autoridad de una sede
         └─ Responsabilidades (SOLO de su sucursal):
            • Ver empleados de su sucursal
            • Crear/Editar tareas para su equipo
            • Aprobar/Rechazar solicitudes de su equipo
            • Ver asistencia de su sucursal
            • Ver reportes de productividad local
            • NO puede: Ver Org Chart, acceder a nómina, crear empleados

Level 2: EMPLEADO_SUPERVISOR ────── Empleado con supervisión de otros
         └─ Responsabilidades:
            • Ver datos de empleados reportados
            • Crear tareas para equipo directo
            • NO puede: Aprobar solicitudes, ver nómina

Level 1: EMPLEADO ─────────────── Usuario operativo sin supervisión
         └─ Responsabilidades:
            • Ver/Editar solo sus datos
            • Marcar asistencia propia
            • Crear solicitudes de ausencia propias
            • Ver/Editar tareas asignadas
            • Ver su nómina personal
"""

JERARQUIA_ROLES = {
    'ADMIN_GLOBAL': {'nivel': 4, 'nombre': 'Administrador Global (RRHH)', 'es_nivel_global': True},
    'GERENTE_SUCURSAL': {'nivel': 3, 'nombre': 'Gerente de Sucursal', 'es_nivel_global': False},
    'EMPLEADO_SUPERVISOR': {'nivel': 2, 'nombre': 'Empleado Supervisor', 'es_nivel_global': False},
    'EMPLEADO': {'nivel': 1, 'nombre': 'Empleado', 'es_nivel_global': False},
}


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 2: MATRIZ MAESTRA DE PERMISOS POR ROL
# ═══════════════════════════════════════════════════════════════════════════

"""
La matriz define QUÉ ACCIONES puede hacer cada rol.
Las RESTRICCIONES DE DATOS (row-level) se aplican por separado en funciones.

Acciones disponibles:
- crear: Crear nuevos registros
- leer: Ver/Listar registros
- editar: Modificar registros
- eliminar: Borrar registros
- aprobar: Aprobar solicitudes/workflows
- rechazar: Rechazar solicitudes/workflows
- ver_org_chart: Ver estructura organizacional
"""

PERMISOS_POR_ROL_NUEVO = {
    # ───────────────────────────────────────────────────────────────────────
    # NIVEL 4: ADMIN_GLOBAL (RRHH) - Acceso Total
    # ───────────────────────────────────────────────────────────────────────
    'ADMIN_GLOBAL': {
        'dashboard': {
            'acciones': ['ver', 'editar'],
            'descripcion': 'Dashboard completo con estadísticas globales'
        },
        'empleados': {
            'acciones': ['crear', 'leer', 'editar', 'eliminar'],
            'descripcion': 'CRUD completo de empleados',
            'datos_accesibles': 'todos',  # Todos en su empresa
        },
        'estructura_organizacional': {
            'acciones': ['ver'],
            'descripcion': 'Org chart completo con todas las sucursales',
            'datos_accesibles': 'todos',
        },
        'asistencia': {
            'acciones': ['crear', 'leer', 'editar'],
            'descripcion': 'Ver asistencia de todos los empleados',
            'datos_accesibles': 'todos',
        },
        'tareas': {
            'acciones': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],
            'descripcion': 'Gestión completa de tareas',
            'datos_accesibles': 'todos',
        },
        'ausencias': {
            'acciones': ['leer', 'aprobar', 'rechazar', 'crear'],
            'descripcion': 'Aprobación de solicitudes (todas)',
            'datos_accesibles': 'todos',
        },
        'objetivos': {
            'acciones': ['crear', 'leer', 'editar', 'eliminar'],
            'descripcion': 'Gestión de objetivos y KPI',
            'datos_accesibles': 'todos',
        },
        'nomina': {
            'acciones': ['crear', 'leer', 'editar', 'eliminar'],
            'descripcion': 'Procesamiento y gestión de nómina',
            'datos_accesibles': 'todos',
        },
        'configuracion': {
            'acciones': ['crear', 'leer', 'editar', 'eliminar'],
            'descripcion': 'Turnos, departamentos, áreas, puestos',
            'datos_accesibles': 'todos',
        },
        'reportes': {
            'acciones': ['leer'],
            'descripcion': 'Todos los reportes disponibles',
            'datos_accesibles': 'todos',
        },
    },

    # ───────────────────────────────────────────────────────────────────────
    # NIVEL 3: GERENTE_SUCURSAL - Autoridad Local
    # ───────────────────────────────────────────────────────────────────────
    'GERENTE_SUCURSAL': {
        'dashboard': {
            'acciones': ['ver'],
            'descripcion': 'Dashboard solo de su sucursal',
            'datos_accesibles': 'su_sucursal',
        },
        'empleados': {
            'acciones': ['leer'],  # SOLO LECTURA de su sucursal
            'descripcion': 'Ver empleados de su sucursal',
            'datos_accesibles': 'su_sucursal',
        },
        'estructura_organizacional': {
            'acciones': [],  # ❌ PROHIBIDO: No puede ver Org Chart
            'descripcion': 'ACCESO DENEGADO - Información sensible',
            'datos_accesibles': 'ninguno',
        },
        'asistencia': {
            'acciones': ['leer'],  # SOLO LECTURA de su sucursal
            'descripcion': 'Ver asistencia de su sucursal',
            'datos_accesibles': 'su_sucursal',
        },
        'tareas': {
            'acciones': ['crear', 'leer', 'editar', 'aprobar'],
            'descripcion': 'Crear/Gestionar tareas de su equipo',
            'datos_accesibles': 'su_sucursal',
        },
        'ausencias': {
            'acciones': ['leer', 'aprobar', 'rechazar'],
            'descripcion': 'Aprobar solicitudes de su equipo',
            'datos_accesibles': 'su_sucursal',
        },
        'objetivos': {
            'acciones': ['crear', 'leer', 'editar'],
            'descripcion': 'Crear objetivos para su equipo',
            'datos_accesibles': 'su_sucursal',
        },
        'nomina': {
            'acciones': [],  # ❌ PROHIBIDO: No puede acceder a nómina
            'descripcion': 'ACCESO DENEGADO - Solo ADMIN_GLOBAL',
            'datos_accesibles': 'ninguno',
        },
        'configuracion': {
            'acciones': [],  # ❌ PROHIBIDO: No puede configurar sistema
            'descripcion': 'ACCESO DENEGADO - Solo ADMIN_GLOBAL',
            'datos_accesibles': 'ninguno',
        },
        'reportes': {
            'acciones': ['leer'],
            'descripcion': 'Reportes de su sucursal',
            'datos_accesibles': 'su_sucursal',
        },
    },

    # ───────────────────────────────────────────────────────────────────────
    # NIVEL 2: EMPLEADO_SUPERVISOR - Supervisión Limitada
    # ───────────────────────────────────────────────────────────────────────
    'EMPLEADO_SUPERVISOR': {
        'dashboard': {
            'acciones': ['ver'],
            'descripcion': 'Dashboard personal con equipo directo',
            'datos_accesibles': 'su_equipo',
        },
        'empleados': {
            'acciones': ['leer'],
            'descripcion': 'Ver empleados de su equipo',
            'datos_accesibles': 'su_equipo',
        },
        'estructura_organizacional': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'asistencia': {
            'acciones': ['leer'],
            'descripcion': 'Ver asistencia de su equipo',
            'datos_accesibles': 'su_equipo',
        },
        'tareas': {
            'acciones': ['crear', 'leer', 'editar'],  # Sin 'aprobar'
            'descripcion': 'Crear/ver tareas de su equipo',
            'datos_accesibles': 'su_equipo_y_propia',
        },
        'ausencias': {
            'acciones': ['leer'],  # ❌ NO puede aprobar
            'descripcion': 'Ver solicitudes de ausencia',
            'datos_accesibles': 'su_equipo',
        },
        'objetivos': {
            'acciones': ['leer'],
            'descripcion': 'Ver objetivos de su equipo',
            'datos_accesibles': 'su_equipo',
        },
        'nomina': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'configuracion': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'reportes': {
            'acciones': ['leer'],
            'descripcion': 'Reportes de su equipo',
            'datos_accesibles': 'su_equipo',
        },
    },

    # ───────────────────────────────────────────────────────────────────────
    # NIVEL 1: EMPLEADO - Usuario Final
    # ───────────────────────────────────────────────────────────────────────
    'EMPLEADO': {
        'dashboard': {
            'acciones': [],  # ❌ NO puede ver dashboard
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'empleados': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'estructura_organizacional': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'asistencia': {
            'acciones': ['crear', 'leer'],  # Solo propia
            'descripcion': 'Marcar asistencia propia',
            'datos_accesibles': 'propia',
        },
        'tareas': {
            'acciones': ['leer', 'editar'],  # Solo propias
            'descripcion': 'Ver/Editar tareas asignadas',
            'datos_accesibles': 'propias',
        },
        'ausencias': {
            'acciones': ['crear', 'leer'],  # Solo propias
            'descripcion': 'Crear solicitudes de ausencia propias',
            'datos_accesibles': 'propias',
        },
        'objetivos': {
            'acciones': ['leer'],  # Solo propios
            'descripcion': 'Ver objetivos personales',
            'datos_accesibles': 'propios',
        },
        'nomina': {
            'acciones': ['leer'],  # Solo propia
            'descripcion': 'Ver nómina personal',
            'datos_accesibles': 'propia',
        },
        'configuracion': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
        'reportes': {
            'acciones': [],  # ❌ PROHIBIDO
            'descripcion': 'ACCESO DENEGADO',
            'datos_accesibles': 'ninguno',
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 3: FUNCIONES DE SEGURIDAD A NIVEL DE FILA (ROW-LEVEL SECURITY)
# ═══════════════════════════════════════════════════════════════════════════

"""
ROW-LEVEL SECURITY (RLS) = Filtrar datos según el usuario

Ejemplo:
  Si Juan es GERENTE_SUCURSAL de Quito, solo debe ver empleados de Quito.
  Si María es EMPLEADO, solo debe ver su propio registro.
"""

def get_empleado_o_none(user):
    """Obtiene el empleado del usuario o None si es superuser"""
    if user.is_superuser:
        return None
    try:
        return Empleado.objects.get(usuario=user)
    except Empleado.DoesNotExist:
        return None


def get_sucursal_scope(user):
    """Retorna el objeto Sucursal del usuario si es GERENTE_SUCURSAL"""
    empleado = get_empleado_o_none(user)
    if not empleado:
        return None
    
    if empleado.rol == 'GERENTE_SUCURSAL':
        return empleado.sucursal  # El gerente trabaja en su sucursal
    
    return None


def get_equipo_directo(user):
    """Retorna empleados reportados directamente a este usuario (SUPERVISOR)"""
    empleado = get_empleado_o_none(user)
    if not empleado or empleado.rol not in ['EMPLEADO_SUPERVISOR', 'GERENTE_SUCURSAL']:
        return Empleado.objects.none()
    
    # Los reportados son empleados que tienen este usuario como jefe
    # (Asumiendo que hay un campo "jefe" en Empleado)
    # Por ahora, retornamos empleados de su sucursal/departamento
    
    if empleado.rol == 'GERENTE_SUCURSAL':
        return Empleado.objects.filter(sucursal=empleado.sucursal)
    
    if empleado.rol == 'EMPLEADO_SUPERVISOR':
        # Empleados del mismo departamento
        return Empleado.objects.filter(departamento=empleado.departamento)
    
    return Empleado.objects.none()


def filter_queryset_por_rol(queryset, user, modelo):
    """
    FUNCIÓN CLAVE DE ROW-LEVEL SECURITY
    
    Filtra un queryset según el rol del usuario:
    - ADMIN_GLOBAL: Ve todo
    - GERENTE_SUCURSAL: Solo su sucursal
    - EMPLEADO_SUPERVISOR: Solo su equipo + datos propios
    - EMPLEADO: Solo sus datos
    """
    if user.is_superuser:
        return queryset  # SUPERADMIN ve todo
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()  # Usuario sin perfil = sin datos
    
    empresa = empleado.empresa
    
    # Filtro base: siempre restringir a la empresa del usuario
    queryset = queryset.filter(empresa=empresa)
    
    # ─────────────────────────────────────────────────────────────────────
    # ADMIN_GLOBAL: Sin restricciones adicionales
    # ─────────────────────────────────────────────────────────────────────
    if empleado.rol == 'ADMIN_GLOBAL':
        return queryset
    
    # ─────────────────────────────────────────────────────────────────────
    # GERENTE_SUCURSAL: Solo su sucursal
    # ─────────────────────────────────────────────────────────────────────
    if empleado.rol == 'GERENTE_SUCURSAL':
        if modelo == Empleado:
            return queryset.filter(sucursal=empleado.sucursal)
        # Para otros modelos que tengan referencia a sucursal
        if hasattr(modelo, '_meta'):
            if 'sucursal' in [f.name for f in modelo._meta.get_fields()]:
                return queryset.filter(sucursal=empleado.sucursal)
        return queryset
    
    # ─────────────────────────────────────────────────────────────────────
    # EMPLEADO_SUPERVISOR: Su equipo + datos propios
    # ─────────────────────────────────────────────────────────────────────
    if empleado.rol == 'EMPLEADO_SUPERVISOR':
        if modelo == Empleado:
            # Solo empleados de su departamento + él mismo
            return queryset.filter(
                Q(departamento=empleado.departamento) | Q(id=empleado.id)
            )
        return queryset
    
    # ─────────────────────────────────────────────────────────────────────
    # EMPLEADO: Solo datos propios
    # ─────────────────────────────────────────────────────────────────────
    if empleado.rol == 'EMPLEADO':
        if modelo == Empleado:
            return queryset.filter(id=empleado.id)
        # Para otros modelos, filtrar por empleado_id si existe
        if hasattr(modelo, '_meta'):
            if 'empleado' in [f.name for f in modelo._meta.get_fields()]:
                return queryset.filter(empleado=empleado)
        return queryset.none()
    
    return queryset.none()


def puede_ver_empleado(user, empleado_objetivo):
    """
    Valida si user puede ver datos de empleado_objetivo.
    Retorna: True/False
    """
    if user.is_superuser:
        return True
    
    empleado_user = get_empleado_o_none(user)
    if not empleado_user:
        return False
    
    # Mismo usuario siempre puede verse a sí mismo
    if empleado_user.id == empleado_objetivo.id:
        return True
    
    # ADMIN_GLOBAL ve todo
    if empleado_user.rol == 'ADMIN_GLOBAL':
        return True
    
    # GERENTE_SUCURSAL solo ve su sucursal
    if empleado_user.rol == 'GERENTE_SUCURSAL':
        return empleado_objetivo.sucursal == empleado_user.sucursal
    
    # EMPLEADO_SUPERVISOR ve su equipo
    if empleado_user.rol == 'EMPLEADO_SUPERVISOR':
        return empleado_objetivo.departamento == empleado_user.departamento
    
    # EMPLEADO solo ve sus datos (ya cubierto arriba)
    return False


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 4: VALIDACIÓN DE PERMISOS (ACTION-LEVEL)
# ═══════════════════════════════════════════════════════════════════════════

def tiene_permiso(user, modulo, accion):
    """
    Valida si un usuario tiene permiso para una acción en un módulo.
    
    Args:
        user: Usuario autenticado
        modulo: 'empleados', 'tareas', 'ausencias', etc.
        accion: 'crear', 'leer', 'editar', 'eliminar', 'aprobar', 'rechazar'
    
    Returns:
        True si tiene permiso, False si no
    """
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    rol = empleado.rol
    if rol not in PERMISOS_POR_ROL_NUEVO:
        return False
    
    modulo_perms = PERMISOS_POR_ROL_NUEVO[rol].get(modulo, {})
    acciones_permitidas = modulo_perms.get('acciones', [])
    
    return accion in acciones_permitidas


def puede_acceder_modulo(user, modulo):
    """
    Valida si un usuario puede acceder a un módulo completo.
    Retorna True si tiene al menos una acción permitida.
    """
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    rol = empleado.rol
    if rol not in PERMISOS_POR_ROL_NUEVO:
        return False
    
    modulo_perms = PERMISOS_POR_ROL_NUEVO[rol].get(modulo, {})
    acciones = modulo_perms.get('acciones', [])
    
    return len(acciones) > 0


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 5: DECORADORES PARA PROTEGER VISTAS
# ═══════════════════════════════════════════════════════════════════════════

def require_permission(modulo, accion):
    """
    Decorador para validar permisos de manera centralizada.
    
    Usage:
        @require_permission('ausencias', 'aprobar')
        def approve_absence(self, request, pk):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if not tiene_permiso(request.user, modulo, accion):
                empleado = get_empleado_o_none(request.user)
                rol = empleado.rol if empleado else 'DESCONOCIDO'
                
                return Response(
                    {
                        'error': f'Permiso denegado',
                        'detalle': f'Tu rol ({rol}) no puede {accion} en {modulo}',
                        'accion_solicitada': accion,
                        'modulo': modulo,
                        'rol_usuario': rol,
                    }, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def require_any_permission(modulo, *acciones):
    """Validar si el usuario tiene CUALQUIERA de las acciones"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            tiene_alguna = any(tiene_permiso(request.user, modulo, a) for a in acciones)
            
            if not tiene_alguna:
                empleado = get_empleado_o_none(request.user)
                rol = empleado.rol if empleado else 'DESCONOCIDO'
                
                return Response(
                    {
                        'error': f'Permiso denegado',
                        'detalle': f'Tu rol ({rol}) no puede hacer ninguna de estas acciones: {acciones}',
                    }, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def require_rol(*roles):
    """Validar que el usuario tenga uno de los roles especificados"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if request.user.is_superuser:
                return view_func(self, request, *args, **kwargs)
            
            empleado = get_empleado_o_none(request.user)
            if not empleado or empleado.rol not in roles:
                rol_actual = empleado.rol if empleado else 'DESCONOCIDO'
                roles_requeridos = ', '.join(roles)
                
                return Response(
                    {
                        'error': f'Acceso denegado',
                        'detalle': f'Se requiere uno de estos roles: {roles_requeridos}. Tu rol: {rol_actual}',
                    }, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 6: FUNCIONES AUXILIARES
# ═══════════════════════════════════════════════════════════════════════════

def get_descripcion_permisos(rol):
    """Retorna una descripción legible de los permisos de un rol"""
    if rol not in PERMISOS_POR_ROL_NUEVO:
        return None
    
    perms = PERMISOS_POR_ROL_NUEVO[rol]
    descripcion = []
    
    for modulo, detalles in perms.items():
        acciones = ', '.join(detalles['acciones']) if detalles['acciones'] else 'NINGÚN ACCESO'
        descripcion.append(f"  {modulo}: {acciones}")
    
    return '\n'.join(descripcion)


def get_rol_jerarquia(rol):
    """Retorna información de jerarquía del rol"""
    return JERARQUIA_ROLES.get(rol, None)


def es_nivel_global(rol):
    """Retorna True si el rol tiene acceso a nivel global (ADMIN_GLOBAL)"""
    info = get_rol_jerarquia(rol)
    return info['es_nivel_global'] if info else False


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 7: VALIDACIÓN DE DATOS A NIVEL DE QUERYSET (Usado en ViewSets)
# ═══════════════════════════════════════════════════════════════════════════

class RLSQuerySetMixin:
    """
    Mixin para aplicar Row-Level Security automáticamente a los QuerySets.
    
    Uso en ViewSet:
        class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
            queryset = Empleado.objects.all()
            serializer_class = EmpleadoSerializer
    """
    
    def get_queryset(self):
        """Filtra el queryset según el rol del usuario"""
        queryset = super().get_queryset()
        
        # Obtener el modelo
        modelo = queryset.model
        
        # Aplicar filtros de seguridad
        return filter_queryset_por_rol(queryset, self.request.user, modelo)


# ═══════════════════════════════════════════════════════════════════════════
# PARTE 8: RESPUESTAS DE ERROR ESTÁNDAR
# ═══════════════════════════════════════════════════════════════════════════

def response_acceso_denegado(modulo=None, razon=None):
    """Respuesta estándar cuando se deniega acceso"""
    return Response(
        {
            'error': 'Acceso denegado',
            'modulo': modulo,
            'razon': razon or 'No tienes permisos para esta operación',
        },
        status=status.HTTP_403_FORBIDDEN
    )


def response_objeto_no_encontrado():
    """Respuesta cuando un objeto no existe o no es accesible"""
    return Response(
        {
            'error': 'No encontrado',
            'detalle': 'El objeto que buscas no existe o no tienes acceso a él',
        },
        status=status.HTTP_404_NOT_FOUND
    )
