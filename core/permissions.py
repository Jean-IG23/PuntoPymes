"""
Sistema centralizado de permisos por rol (RBAC).
Define qué puede hacer cada rol en cada módulo.

ROLES DEFINIDOS:
- SUPERADMIN: Super Admin del SaaS (acceso total técnico)
- ADMIN: Cliente/Dueño de empresa (configuración total de su empresa)
- RRHH: Recursos Humanos (gestión operativa, permisos, contratos)
- GERENTE: Gerente de Sucursal (gestiona sucursal completa, asistencia, equipo, reportes)
- EMPLEADO: Colaborador (usuario final, solo ve lo suyo)

REGLAS DE NEGOCIO:
1. GERENTE solo puede ver/gestionar empleados de SU sucursal
2. EMPLEADO solo puede ver sus propios datos
3. GERENTE NO puede ver el módulo de Organización (Org Chart)
4. Las solicitudes de vacaciones se asignan automáticamente al gerente de la sucursal
"""

from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from personal.models import Empleado


# ============================================================================
# DICCIONARIO MAESTRO DE PERMISOS
# ============================================================================

PERMISOS_POR_ROL = {
    'SUPERADMIN': {
        'dashboard': ['ver', 'editar'],
        'empleados': ['crear', 'leer', 'editar', 'eliminar'],
        'configuracion': ['crear', 'leer', 'editar', 'eliminar'],
        'asistencia': ['crear', 'leer', 'editar', 'eliminar'],
        'tareas': ['crear', 'leer', 'editar', 'eliminar', 'aprobar', 'rechazar'],
        'ausencias': ['crear', 'leer', 'editar', 'eliminar', 'aprobar', 'rechazar'],
        'objetivos': ['crear', 'leer', 'editar', 'eliminar'],
        'nomina': ['crear', 'leer', 'editar', 'eliminar'],
        'empresas': ['crear', 'leer', 'editar', 'eliminar'],
        'organizacion': ['ver'],  # Puede ver estructura organizacional
    },
    'ADMIN': {
        'dashboard': ['ver', 'editar'],
        'empleados': ['crear', 'leer', 'editar', 'eliminar'],
        'configuracion': ['crear', 'leer', 'editar'],
        'asistencia': ['crear', 'leer', 'editar'],
        'tareas': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],
        'ausencias': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],
        'objetivos': ['crear', 'leer', 'editar'],
        'nomina': ['crear', 'leer', 'editar'],
        'empresas': [],  # No puede crear empresas
        'organizacion': ['ver'],  # Puede ver estructura organizacional
    },
    'RRHH': {
        'dashboard': ['ver'],
        'empleados': ['crear', 'leer', 'editar'],
        'configuracion': ['crear', 'leer', 'editar'],
        'asistencia': ['leer', 'crear'],
        'tareas': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],
        'ausencias': ['leer', 'aprobar', 'rechazar'],
        'objetivos': ['crear', 'leer', 'editar'],
        'nomina': ['leer', 'crear'],
        'empresas': [],
        'organizacion': ['ver'],  # Puede ver estructura organizacional
    },
    'GERENTE': {
        'dashboard': ['ver'],
        'empleados': ['leer'],  # Solo de su sucursal (Row-Level Security)
        'configuracion': [],
        'asistencia': ['leer'],  # Solo de su sucursal (Row-Level Security)
        'tareas': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],  # Solo para su sucursal
        'ausencias': ['leer', 'aprobar', 'rechazar'],  # Solo del equipo de su sucursal
        'objetivos': ['crear', 'leer', 'editar'],  # Solo para empleados de su sucursal
        'nomina': [],
        'empresas': [],
        'organizacion': [],  # ⛔ NO puede ver estructura organizacional
    },
    'EMPLEADO': {
        'dashboard': [],
        'empleados': [],
        'configuracion': [],
        'asistencia': ['leer', 'crear'],  # Solo la propia
        'tareas': ['leer', 'editar'],  # Solo las propias (actualizar progreso)
        'ausencias': ['crear', 'leer'],  # Solo las propias
        'objetivos': ['leer'],  # Solo los propios (NO puede crear ni editar)
        'nomina': ['leer'],  # Solo la propia
        'empresas': [],
        'organizacion': [],  # ⛔ NO puede ver estructura organizacional
    },
}


# ============================================================================
# MÓDULOS RESTRINGIDOS POR ROL
# ============================================================================

MODULOS_RESTRINGIDOS = {
    'GERENTE': ['organizacion', 'empresas', 'configuracion'],
    'EMPLEADO': ['organizacion', 'empresas', 'configuracion', 'empleados'],
}


# ============================================================================
# FUNCIONES HELPER
# ============================================================================

def get_empleado_o_none(user):
    """Obtiene el empleado del usuario o None si no existe"""
    if user.is_superuser:
        return None
    try:
        return Empleado.objects.get(usuario=user)
    except Empleado.DoesNotExist:
        return None


def tiene_permiso(user, modulo, accion):
    """
    Valida si un usuario tiene permiso para una acción en un módulo.
    
    Args:
        user: Usuario autenticado
        modulo: 'empleados', 'tareas', 'configuracion', etc.
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
    if rol not in PERMISOS_POR_ROL:
        return False
    
    acciones_permitidas = PERMISOS_POR_ROL[rol].get(modulo, [])
    return accion in acciones_permitidas


def require_permission(modulo, accion):
    """
    Decorador para validar permisos de manera centralizada.
    
    Usage:
        @require_permission('tareas', 'crear')
        def create(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if not tiene_permiso(request.user, modulo, accion):
                rol = get_empleado_o_none(request.user).rol if not request.user.is_superuser else 'SUPERADMIN'
                return Response(
                    {
                        'error': f'Permiso denegado. Tu rol ({rol}) no puede {accion} en {modulo}',
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
    """
    Decorador para validar si el usuario tiene CUALQUIERA de las acciones.
    
    Usage:
        @require_any_permission('tareas', 'crear', 'editar')
        def update(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            tiene_alguno = any(
                tiene_permiso(request.user, modulo, accion)
                for accion in acciones
            )
            if not tiene_alguno:
                rol = get_empleado_o_none(request.user).rol if not request.user.is_superuser else 'SUPERADMIN'
                return Response(
                    {
                        'error': f'Permiso denegado. Tu rol ({rol}) no puede hacer ninguna de estas acciones: {", ".join(acciones)}',
                        'acciones_solicitadas': list(acciones),
                        'modulo': modulo,
                        'rol_usuario': rol,
                    }, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def require_roles(*roles_permitidos):
    """
    Decorador más simple que solo valida el rol.
    
    Usage:
        @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
        def crear_empleado(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if request.user.is_superuser:
                return view_func(self, request, *args, **kwargs)
            
            empleado = get_empleado_o_none(request.user)
            if not empleado or empleado.rol not in roles_permitidos:
                return Response(
                    {
                        'error': f'Acceso denegado. Se requieren uno de estos roles: {", ".join(roles_permitidos)}',
                        'rol_usuario': empleado.rol if empleado else 'DESCONOCIDO',
                    }, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator


def can_access_empresa_data(user, empresa_id):
    """Valida si el usuario puede acceder a datos de una empresa"""
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    # ADMIN y RRHH acceden a su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return empleado.empresa_id == empresa_id
    
    # GERENTE y EMPLEADO: a través de su sucursal
    if empleado.sucursal:
        return empleado.sucursal.empresa_id == empresa_id
    
    return False


def can_access_sucursal_data(user, sucursal_id):
    """Valida si el usuario puede acceder a datos de una sucursal"""
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    # ADMIN y RRHH ven toda su empresa (deben validar empresa primero)
    if empleado.rol in ['ADMIN', 'RRHH']:
        from core.models import Sucursal
        try:
            sucursal = Sucursal.objects.get(id=sucursal_id)
            return sucursal.empresa_id == empleado.empresa_id
        except:
            return False
    
    # GERENTE: solo su sucursal_a_cargo
    if empleado.rol == 'GERENTE':
        return empleado.sucursal_a_cargo_id == sucursal_id
    
    # EMPLEADO: solo su sucursal
    if empleado.rol == 'EMPLEADO':
        return empleado.sucursal_id == sucursal_id
    
    return False


def get_queryset_filtrado(user, queryset, campo_empresa='empresa', campo_sucursal='sucursal'):
    """
    Filtra un queryset según el rol del usuario.
    
    REGLAS DE ROW-LEVEL SECURITY:
    - SUPERADMIN: Ve todo (sin filtro)
    - ADMIN/RRHH: Ven toda su empresa
    - GERENTE: Solo ve datos de su sucursal (donde está asignado)
    - EMPLEADO: Solo ve sus propios datos
    
    Args:
        user: Usuario autenticado
        queryset: QuerySet base
        campo_empresa: nombre del campo de empresa en el modelo
        campo_sucursal: nombre del campo de sucursal en el modelo
    
    Returns:
        QuerySet filtrado
    """
    if user.is_superuser:
        return queryset
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()
    
    # ADMIN y RRHH: ven toda su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        filter_dict = {f'{campo_empresa}': empleado.empresa}
        return queryset.filter(**filter_dict)
    
    # GERENTE: solo datos de su sucursal (donde está asignado)
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            filter_dict = {f'{campo_sucursal}': empleado.sucursal}
            return queryset.filter(**filter_dict)
        return queryset.none()
    
    # EMPLEADO: solo datos propios
    return queryset.filter(usuario=user)


def get_queryset_filtrado_empleados(user, queryset):
    """
    Filtra un queryset de Empleados según el rol del usuario.
    
    REGLAS DE ROW-LEVEL SECURITY:
    - SUPERADMIN: Ve todos los empleados
    - ADMIN/RRHH: Ven todos los empleados de su empresa
    - GERENTE: Solo ve empleados de su sucursal
    - EMPLEADO: Solo ve su propio perfil
    
    Args:
        user: Usuario autenticado
        queryset: QuerySet de Empleados
    
    Returns:
        QuerySet filtrado
    """
    if user.is_superuser:
        return queryset
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()
    
    # ADMIN y RRHH: ven todos los empleados de su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return queryset.filter(empresa=empleado.empresa)
    
    # GERENTE: solo empleados de su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            return queryset.filter(empresa=empleado.empresa, sucursal=empleado.sucursal)
        return queryset.none()
    
    # EMPLEADO: solo su propio perfil
    return queryset.filter(id=empleado.id)


def get_queryset_filtrado_tareas(user, queryset):
    """
    Filtra un queryset de Tareas según el rol del usuario.
    
    REGLAS:
    - SUPERADMIN: Ve todas las tareas
    - ADMIN/RRHH: Ven todas las tareas de su empresa
    - GERENTE: Solo ve tareas de empleados de su sucursal
    - EMPLEADO: Solo ve tareas asignadas a él
    
    Args:
        user: Usuario autenticado
        queryset: QuerySet de Tareas
    
    Returns:
        QuerySet filtrado
    """
    if user.is_superuser:
        return queryset
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()
    
    # ADMIN y RRHH: ven todas las tareas de su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return queryset.filter(empresa=empleado.empresa)
    
    # GERENTE: solo tareas de empleados de su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            return queryset.filter(
                empresa=empleado.empresa,
                asignado_a__sucursal=empleado.sucursal
            )
        return queryset.none()
    
    # EMPLEADO: solo tareas asignadas a él
    return queryset.filter(asignado_a=empleado)


def get_queryset_filtrado_objetivos(user, queryset):
    """
    Filtra un queryset de Objetivos según el rol del usuario.
    
    REGLAS:
    - SUPERADMIN: Ve todos los objetivos
    - ADMIN/RRHH: Ven todos los objetivos de su empresa
    - GERENTE: Solo ve objetivos de empleados de su sucursal
    - EMPLEADO: Solo ve sus propios objetivos
    
    Args:
        user: Usuario autenticado
        queryset: QuerySet de Objetivos
    
    Returns:
        QuerySet filtrado
    """
    if user.is_superuser:
        return queryset
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()
    
    # ADMIN y RRHH: ven todos los objetivos de su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return queryset.filter(empresa=empleado.empresa)
    
    # GERENTE: solo objetivos de empleados de su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            return queryset.filter(
                empresa=empleado.empresa,
                empleado__sucursal=empleado.sucursal
            )
        return queryset.none()
    
    # EMPLEADO: solo sus propios objetivos
    return queryset.filter(empleado=empleado)


def get_queryset_filtrado_ausencias(user, queryset):
    """
    Filtra un queryset de SolicitudAusencia según el rol del usuario.
    
    REGLAS:
    - SUPERADMIN: Ve todas las solicitudes
    - ADMIN/RRHH: Ven todas las solicitudes de su empresa
    - GERENTE: Solo ve solicitudes de empleados de su sucursal
    - EMPLEADO: Solo ve sus propias solicitudes
    
    Args:
        user: Usuario autenticado
        queryset: QuerySet de SolicitudAusencia
    
    Returns:
        QuerySet filtrado
    """
    if user.is_superuser:
        return queryset
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return queryset.none()
    
    # ADMIN y RRHH: ven todas las solicitudes de su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return queryset.filter(empresa=empleado.empresa)
    
    # GERENTE: solo solicitudes de empleados de su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            return queryset.filter(
                empresa=empleado.empresa,
                empleado__sucursal=empleado.sucursal
            )
        return queryset.none()
    
    # EMPLEADO: solo sus propias solicitudes
    return queryset.filter(empleado=empleado)


def puede_ver_modulo(user, modulo):
    """
    Verifica si un usuario puede ver un módulo específico.
    
    Args:
        user: Usuario autenticado
        modulo: Nombre del módulo ('organizacion', 'empleados', etc.)
    
    Returns:
        True si puede ver el módulo, False si no
    """
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    rol = empleado.rol
    
    # Verificar si el módulo está restringido para este rol
    if rol in MODULOS_RESTRINGIDOS:
        if modulo in MODULOS_RESTRINGIDOS[rol]:
            return False
    
    return True


def get_gerente_sucursal(empleado):
    """
    Obtiene el gerente de la sucursal de un empleado.
    Útil para asignar automáticamente solicitudes de vacaciones.
    
    Args:
        empleado: Instancia de Empleado
    
    Returns:
        Empleado con rol GERENTE de la misma sucursal, o None
    """
    if not empleado.sucursal:
        return None
    
    gerente = Empleado.objects.filter(
        empresa=empleado.empresa,
        sucursal=empleado.sucursal,
        rol='GERENTE',
        estado='ACTIVO'
    ).first()
    
    return gerente


def puede_gestionar_empleado(user, empleado_objetivo):
    """
    Verifica si un usuario puede gestionar (editar/aprobar) a otro empleado.
    
    REGLAS:
    - SUPERADMIN: Puede gestionar a cualquiera
    - ADMIN/RRHH: Pueden gestionar a cualquier empleado de su empresa
    - GERENTE: Solo puede gestionar empleados de su sucursal
    - EMPLEADO: No puede gestionar a nadie
    
    Args:
        user: Usuario autenticado
        empleado_objetivo: Empleado que se quiere gestionar
    
    Returns:
        True si puede gestionar, False si no
    """
    if user.is_superuser:
        return True
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return False
    
    # Verificar misma empresa
    if empleado.empresa_id != empleado_objetivo.empresa_id:
        return False
    
    # ADMIN y RRHH: pueden gestionar a cualquiera de su empresa
    if empleado.rol in ['ADMIN', 'RRHH']:
        return True
    
    # GERENTE: solo puede gestionar empleados de su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal and empleado_objetivo.sucursal:
            return empleado.sucursal_id == empleado_objetivo.sucursal_id
        return False
    
    # EMPLEADO: no puede gestionar a nadie
    return False


def get_permisos_usuario(user):
    """
    Retorna un diccionario con todos los permisos del usuario.
    Útil para enviar al frontend.
    
    Args:
        user: Usuario autenticado
    
    Returns:
        Dict con permisos por módulo y módulos restringidos
    """
    if user.is_superuser:
        return {
            'rol': 'SUPERADMIN',
            'permisos': PERMISOS_POR_ROL.get('SUPERADMIN', {}),
            'modulos_restringidos': [],
            'puede_ver_organizacion': True,
            'puede_ver_empleados': True,
            'puede_ver_configuracion': True,
        }
    
    empleado = get_empleado_o_none(user)
    if not empleado:
        return {
            'rol': 'DESCONOCIDO',
            'permisos': {},
            'modulos_restringidos': [],
            'puede_ver_organizacion': False,
            'puede_ver_empleados': False,
            'puede_ver_configuracion': False,
        }
    
    rol = empleado.rol
    permisos = PERMISOS_POR_ROL.get(rol, {})
    modulos_restringidos = MODULOS_RESTRINGIDOS.get(rol, [])
    
    return {
        'rol': rol,
        'permisos': permisos,
        'modulos_restringidos': modulos_restringidos,
        'puede_ver_organizacion': 'organizacion' not in modulos_restringidos,
        'puede_ver_empleados': 'empleados' not in modulos_restringidos,
        'puede_ver_configuracion': 'configuracion' not in modulos_restringidos,
        'sucursal_id': empleado.sucursal_id if empleado.sucursal else None,
        'empresa_id': empleado.empresa_id,
    }


def solo_superadmin(view_func):
    """Decorador que solo permite SUPERADMIN"""
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response(
                {'error': 'Solo el SuperAdmin puede acceder a esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        return view_func(self, request, *args, **kwargs)
    return wrapper


def solo_admin_o_superadmin(view_func):
    """Decorador que solo permite ADMIN o SUPERADMIN"""
    @wraps(view_func)
    def wrapper(self, request, *args, **kwargs):
        if request.user.is_superuser:
            return view_func(self, request, *args, **kwargs)
        
        empleado = get_empleado_o_none(request.user)
        if empleado and empleado.rol == 'ADMIN':
            return view_func(self, request, *args, **kwargs)
        
        return Response(
            {'error': 'Solo ADMIN puede acceder a esta acción'},
            status=status.HTTP_403_FORBIDDEN
        )
    return wrapper
