# 🔐 IMPLEMENTACIÓN DE PERMISOS - GUÍA TÉCNICA

## 📦 ESTRUCTURA DE PERMISOS EN DJANGO

### 1. Helper Function para Validación de Permisos

Crear en `core/utils.py`:

```python
from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from personal.models import Empleado

def get_empleado_o_none(user):
    """Obtiene el empleado del usuario o None si es SuperUser"""
    if user.is_superuser:
        return None
    try:
        return Empleado.objects.get(usuario=user)
    except Empleado.DoesNotExist:
        return None

def require_role(*roles):
    """Decorador que valida si el usuario tiene uno de los roles especificados"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # SuperUser siempre tiene acceso
            if request.user.is_superuser:
                return view_func(self, request, *args, **kwargs)
            
            # Obtener empleado
            empleado = get_empleado_o_none(request.user)
            if not empleado:
                return Response(
                    {'error': 'Usuario no es empleado'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Validar rol
            if empleado.rol not in roles:
                roles_str = ', '.join(roles)
                return Response(
                    {'error': f'Requiere uno de estos roles: {roles_str}. Tu rol: {empleado.rol}'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator

def can_access_empresa_data(user, empresa_id):
    """
    Valida si el usuario tiene acceso a los datos de una empresa específica.
    SuperUser siempre tiene acceso.
    """
    if user.is_superuser:
        return True
    
    try:
        empleado = Empleado.objects.get(usuario=user)
        # Roles que ven toda su empresa: ADMIN, RRHH
        # Otros solo si es su propia sucursal
        if empleado.rol in ['ADMIN', 'RRHH']:
            return empleado.empresa_id == empresa_id
        
        # GERENTE y EMPLEADO solo ven su sucursal
        if empleado.rol in ['GERENTE', 'EMPLEADO']:
            return empleado.sucursal.empresa_id == empresa_id if empleado.sucursal else False
        
        return False
    except:
        return False

def can_access_sucursal_data(user, sucursal_id):
    """
    Valida si el usuario tiene acceso a datos de una sucursal específica.
    """
    if user.is_superuser:
        return True
    
    try:
        empleado = Empleado.objects.get(usuario=user)
        
        # ADMIN y RRHH ven toda la empresa
        if empleado.rol in ['ADMIN', 'RRHH']:
            from core.models import Sucursal
            sucursal = Sucursal.objects.get(id=sucursal_id)
            return sucursal.empresa_id == empleado.empresa_id
        
        # GERENTE solo su sucursal
        if empleado.rol == 'GERENTE':
            return empleado.sucursal_id == sucursal_id
        
        # EMPLEADO solo su sucursal
        if empleado.rol == 'EMPLEADO':
            return empleado.sucursal_id == sucursal_id
        
        return False
    except:
        return False

def can_manage_empleado(user, empleado_id):
    """
    Valida si el usuario puede gestionar (crear/editar) un empleado.
    Solo ADMIN, RRHH y SUPERUSER pueden hacerlo.
    """
    if user.is_superuser:
        return True
    
    try:
        user_empleado = Empleado.objects.get(usuario=user)
        
        # ADMIN y RRHH pueden gestionar empleados
        if user_empleado.rol in ['ADMIN', 'RRHH']:
            return True
        
        # GERENTE y EMPLEADO no pueden gestionar
        return False
    except:
        return False

def get_filtered_queryset_for_user(user, base_queryset, empresa_field='empresa', sucursal_field='sucursal'):
    """
    Retorna un queryset filtrado según el rol del usuario.
    
    Args:
        user: El usuario autenticado
        base_queryset: QuerySet base a filtrar
        empresa_field: Nombre del campo de empresa (default: 'empresa')
        sucursal_field: Nombre del campo de sucursal (default: 'sucursal')
    
    Returns:
        QuerySet filtrado o vacío si no tiene acceso
    """
    if user.is_superuser:
        return base_queryset
    
    try:
        empleado = Empleado.objects.get(usuario=user)
        
        # ADMIN y RRHH: ven toda su empresa
        if empleado.rol in ['ADMIN', 'RRHH']:
            filter_kwargs = {f'{empresa_field}': empleado.empresa}
            return base_queryset.filter(**filter_kwargs)
        
        # GERENTE: solo su sucursal
        if empleado.rol == 'GERENTE':
            if empleado.sucursal:
                filter_kwargs = {f'{sucursal_field}': empleado.sucursal}
                return base_queryset.filter(**filter_kwargs)
            return base_queryset.none()
        
        # EMPLEADO: solo sus propios datos
        return base_queryset.none()
    
    except Empleado.DoesNotExist:
        return base_queryset.none()
```

---

## 🎯 PATRONES DE VALIDACIÓN EN VIEWSETS

### Patrón 1: Validación Simple (Solo Roles)

```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from personal.models import Empleado
from core.utils import require_role

class TareaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    @require_role('ADMIN', 'RRHH', 'GERENTE')
    def listar_para_aprobar(self, request):
        """Solo ADMIN, RRHH y GERENTE pueden ver tareas para aprobar"""
        # Lógica aquí...
        pass
    
    def create(self, request, *args, **kwargs):
        """Crear tarea - validar permisos"""
        if request.user.is_superuser:
            # SuperUser siempre puede
            return super().create(request, *args, **kwargs)
        
        try:
            empleado = Empleado.objects.get(usuario=request.user)
            if empleado.rol not in ['ADMIN', 'RRHH', 'GERENTE']:
                return Response(
                    {'error': 'Solo ADMIN, RRHH y GERENTE pueden crear tareas'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return super().create(request, *args, **kwargs)
        except Empleado.DoesNotExist:
            return Response({'error': 'Usuario no es empleado'}, status=403)
```

---

### Patrón 2: Validación con Filtrado de Datos

```python
from core.utils import get_filtered_queryset_for_user, can_manage_empleado

class EmpleadoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Empleado.objects.all()
    
    def get_queryset(self):
        """Retorna empleados según el rol del usuario"""
        queryset = super().get_queryset()
        
        if self.request.user.is_superuser:
            return queryset
        
        try:
            user_empleado = Empleado.objects.get(usuario=self.request.user)
            
            # ADMIN y RRHH: ven empleados de su empresa
            if user_empleado.rol in ['ADMIN', 'RRHH']:
                return queryset.filter(empresa=user_empleado.empresa)
            
            # GERENTE: solo su sucursal
            if user_empleado.rol == 'GERENTE':
                return queryset.filter(sucursal=user_empleado.sucursal)
            
            # EMPLEADO: solo a sí mismo
            return queryset.filter(usuario=self.request.user)
        
        except Empleado.DoesNotExist:
            return queryset.none()
    
    def create(self, request, *args, **kwargs):
        """Crear empleado - solo ADMIN y RRHH"""
        if not can_manage_empleado(request.user, None):
            return Response(
                {'error': 'Solo ADMIN y RRHH pueden crear empleados'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Editar empleado - solo ADMIN y RRHH"""
        if not can_manage_empleado(request.user, kwargs.get('pk')):
            return Response(
                {'error': 'No tienes permisos para editar este empleado'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Eliminar empleado - solo ADMIN"""
        if request.user.is_superuser:
            return super().destroy(request, *args, **kwargs)
        
        try:
            empleado = Empleado.objects.get(usuario=request.user)
            if empleado.rol != 'ADMIN':
                return Response(
                    {'error': 'Solo ADMIN puede eliminar empleados'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            return super().destroy(request, *args, **kwargs)
        except:
            return Response({'error': 'Usuario no es empleado'}, status=403)
```

---

### Patrón 3: Acciones Específicas por Rol

```python
from rest_framework.decorators import action

class SolicitudAusenciaViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar solicitud - ADMIN, RRHH, GERENTE"""
        # Validar permisos
        if request.user.is_superuser:
            pass  # SuperUser siempre puede
        else:
            try:
                empleado = Empleado.objects.get(usuario=request.user)
                if empleado.rol not in ['ADMIN', 'RRHH', 'GERENTE']:
                    return Response(
                        {'error': 'Solo supervisores pueden aprobar'}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # GERENTE solo puede aprobar su equipo
                if empleado.rol == 'GERENTE':
                    solicitud = self.get_object()
                    if solicitud.empleado.sucursal != empleado.sucursal:
                        return Response(
                            {'error': 'Solo puedes aprobar ausencias de tu equipo'}, 
                            status=status.HTTP_403_FORBIDDEN
                        )
            except Empleado.DoesNotExist:
                return Response({'error': 'Usuario no es empleado'}, status=403)
        
        # Lógica de aprobación
        solicitud = self.get_object()
        solicitud.estado = 'APROBADA'
        solicitud.save()
        return Response({'message': 'Solicitud aprobada'})
    
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar solicitud - ADMIN, RRHH, GERENTE"""
        # Mismo patrón que aprobar...
        pass
```

---

## 🛡️ GUARDS ESPECÍFICOS EN FRONTEND

### Guard 1: Solo ADMIN

```typescript
// admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.auth.isSuperAdmin() || this.auth.isAdmin()) {
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }
}
```

### Guard 2: Solo Gestión

```typescript
// management.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class ManagementGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.auth.isManagement()) {  // ADMIN, RRHH, GERENTE, SUPERADMIN
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }
}
```

### Guard 3: Solo RRHH

```typescript
// rrhh.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RRHHGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.auth.isSuperAdmin() || this.auth.isRRHH()) {
      return true;
    }
    this.router.navigate(['/dashboard']);
    return false;
  }
}
```

---

## 📋 RUTAS CON GUARDS

```typescript
// app.routes.ts
const routes: Routes = [
  // Admin routes
  {
    path: 'admin',
    canActivate: [AdminGuard],
    children: [
      { path: 'empresas', component: EmpresasComponent },
      { path: 'licencias', component: LicenciasComponent },
    ]
  },
  
  // Management routes (Admin, RRHH, Gerente, SuperAdmin)
  {
    path: 'gestion',
    canActivate: [ManagementGuard],
    children: [
      { path: 'empleados', component: PersonalComponent },
      { path: 'tareas', component: TareasComponent },
      { path: 'ausencias', component: AusenciasComponent },
    ]
  },
  
  // RRHH routes
  {
    path: 'rrhh',
    canActivate: [RRHHGuard],
    children: [
      { path: 'nomina', component: NominaComponent },
      { path: 'configuracion', component: ConfiguracionComponent },
    ]
  },
  
  // Employee routes (Todos autenticados)
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    component: DashboardComponent
  }
];
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Agregar helpers en `core/utils.py`
- [ ] Validar permisos en todos los ViewSets
- [ ] Crear guards en frontend
- [ ] Actualizar rutas con guards
- [ ] Esconder UI según rol
- [ ] Documentar excepciones
- [ ] Testear acceso por rol
- [ ] Agregar auditoría en backend
