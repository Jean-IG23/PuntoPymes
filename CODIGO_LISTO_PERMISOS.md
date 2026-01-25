# 🔐 CÓDIGO LISTO PARA COPIAR - PERMISOS POR ROL

## 📁 core/permissions.py (NUEVO ARCHIVO)

Crear archivo en `c:\Users\mateo\Desktop\PuntoPymes\core\permissions.py`:

```python
"""
Sistema centralizado de permisos por rol.
Define qué puede hacer cada rol en cada módulo.
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
    },
    'GERENTE': {
        'dashboard': ['ver'],
        'empleados': ['leer'],  # Solo de su sucursal
        'configuracion': [],
        'asistencia': ['leer'],  # Solo de su sucursal
        'tareas': ['crear', 'leer', 'editar', 'aprobar', 'rechazar'],
        'ausencias': ['leer', 'aprobar', 'rechazar'],  # Solo del equipo
        'objetivos': ['crear', 'leer', 'editar'],
        'nomina': [],
        'empresas': [],
    },
    'EMPLEADO': {
        'dashboard': [],
        'empleados': [],
        'configuracion': [],
        'asistencia': ['leer', 'crear'],  # Solo la propia
        'tareas': ['leer', 'editar'],  # Solo las propias
        'ausencias': ['crear', 'leer'],  # Solo las propias
        'objetivos': ['leer', 'editar'],  # Solo los propios
        'nomina': ['leer'],  # Solo la propia
        'empresas': [],
    },
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
    
    # GERENTE y EMPLEADO solo su sucursal
    if empleado.rol in ['GERENTE', 'EMPLEADO']:
        return empleado.sucursal_id == sucursal_id
    
    return False


def get_queryset_filtrado(user, queryset, campo_empresa='empresa', campo_sucursal='sucursal'):
    """
    Filtra un queryset según el rol del usuario.
    
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
    
    # GERENTE: solo su sucursal
    if empleado.rol == 'GERENTE':
        if empleado.sucursal:
            filter_dict = {f'{campo_sucursal}': empleado.sucursal}
            return queryset.filter(**filter_dict)
        return queryset.none()
    
    # EMPLEADO: solo datos propios
    return queryset.filter(usuario=user)


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
```

---

## 📝 EJEMPLOS DE USO EN VIEWSETS

### Ejemplo 1: Crear Empleado (Solo ADMIN y RRHH)

```python
from core.permissions import require_roles, can_manage_empleado
from rest_framework import viewsets

class EmpleadoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def create(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden crear empleados"""
        return super().create(request, *args, **kwargs)
```

### Ejemplo 2: Crear Tarea (Varios Roles)

```python
from core.permissions import require_permission

class TareaViewSet(viewsets.ModelViewSet):
    
    @require_permission('tareas', 'crear')
    def create(self, request, *args, **kwargs):
        """Crear tarea - ADMIN, RRHH, GERENTE pueden"""
        return super().create(request, *args, **kwargs)
    
    @require_permission('tareas', 'aprobar')
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar tarea - ADMIN, RRHH, GERENTE pueden"""
        tarea = self.get_object()
        tarea.estado = 'COMPLETADA'
        tarea.save()
        return Response({'status': 'aprobada'})
```

### Ejemplo 3: Filtrar por Rol

```python
from core.permissions import get_queryset_filtrado

class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.all()
    
    def get_queryset(self):
        """Retorna tareas según el rol"""
        queryset = super().get_queryset()
        return get_queryset_filtrado(
            self.request.user,
            queryset,
            campo_empresa='empresa',
            campo_sucursal='sucursal'
        )
```

### Ejemplo 4: Validar Acceso a Empresa

```python
from core.permissions import can_access_empresa_data

class ConfiguracionViewSet(viewsets.ViewSet):
    
    @action(detail=False, methods=['get'])
    def por_empresa(self, request):
        empresa_id = request.query_params.get('empresa_id')
        
        if not can_access_empresa_data(request.user, empresa_id):
            return Response(
                {'error': 'No tienes acceso a esta empresa'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Proceder con la lógica...
        pass
```

---

## 🛡️ GUARDS EN ANGULAR

Crear archivo `talent-track-frontend/src/app/guards/role-based.guard.ts`:

```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleBasedGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;  // Sin restricción
    }
    
    const userRole = this.auth.getRole();
    
    if (requiredRoles.includes(userRole) || this.auth.isSuperAdmin()) {
      return true;
    }
    
    // Denegar acceso
    alert(`⛔ Acceso denegado. Se requieren uno de estos roles: ${requiredRoles.join(', ')}`);
    this.router.navigate(['/dashboard']);
    return false;
  }
}
```

### Uso en rutas:

```typescript
const routes: Routes = [
  // Admin only
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [RoleBasedGuard],
    data: { roles: ['ADMIN', 'SUPERADMIN'] }
  },
  
  // Management (Admin, RRHH, Gerente)
  {
    path: 'personal',
    component: PersonalComponent,
    canActivate: [RoleBasedGuard],
    data: { roles: ['ADMIN', 'RRHH', 'GERENTE'] }
  },
  
  // Todos
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  }
];
```

---

## ✅ PASOS DE IMPLEMENTACIÓN

1. **Crear archivo core/permissions.py** con todo el código anterior
2. **Importar y usar en ViewSets**:
   ```python
   from core.permissions import require_roles, require_permission
   ```
3. **Crear guard en Angular**:
   ```typescript
   import { RoleBasedGuard } from './guards/role-based.guard';
   ```
4. **Aplicar a rutas**:
   ```typescript
   canActivate: [RoleBasedGuard],
   data: { roles: ['ADMIN', 'RRHH'] }
   ```
5. **Testear con diferentes roles**
