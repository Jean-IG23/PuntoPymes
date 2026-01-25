# ✅ CHECKLIST DE IMPLEMENTACIÓN - ROLES Y PERMISOS

## 📋 FASE 1: BACKEND - DJANGO

### 1.1 Setup Inicial
- [ ] Crear archivo `core/permissions.py` con todas las funciones helper
- [ ] Importar en los ViewSets necesarios
- [ ] Verificar que no hay errores de importación

```bash
# Verificar que el archivo se creó correctamente
python manage.py check
```

### 1.2 ViewSets a Actualizar

#### EmpleadoViewSet (personal/views.py)
```python
from core.permissions import require_roles

class EmpleadoViewSet(viewsets.ModelViewSet):
    
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def create(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden crear empleados"""
        return super().create(request, *args, **kwargs)
    
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def destroy(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden eliminar empleados"""
        return super().destroy(request, *args, **kwargs)
```

- [ ] Actualizar `create()` con `@require_roles('ADMIN', 'RRHH')`
- [ ] Actualizar `destroy()` con `@require_roles('ADMIN')`
- [ ] Testear: ADMIN puede crear ✅ / EMPLEADO no puede ❌

#### TareaViewSet (personal/views.py)
```python
from core.permissions import require_roles, require_permission

class TareaViewSet(viewsets.ModelViewSet):
    
    @require_permission('tareas', 'crear')
    def create(self, request, *args, **kwargs):
        """Crear tarea"""
        return super().create(request, *args, **kwargs)
    
    @require_permission('tareas', 'aprobar')
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar tarea"""
        # lógica...
```

- [ ] Actualizar `create()` con permisos
- [ ] Actualizar `aprobar()` con permisos
- [ ] Actualizar `rechazar()` con permisos
- [ ] Testear aprobación

#### SolicitudAusenciaViewSet (personal/views.py)
```python
@require_permission('ausencias', 'aprobar')
@action(detail=True, methods=['post'])
def aprobar(self, request, pk=None):
    """Aprobar ausencia"""
```

- [ ] Actualizar `aprobar()` con permisos
- [ ] Actualizar `rechazar()` con permisos

#### ConfiguracionNominaViewSet (core/views.py)
- [ ] Ya tiene validaciones de ADMIN/RRHH ✅
- [ ] Testear que EMPLEADO no accede

#### OtrosViewSets
- [ ] DocumentoViewSet
- [ ] ContratoViewSet
- [ ] PuestoViewSet
- [ ] Etc...

### 1.3 Validación Backend

```bash
# Ejecutar en terminal
python manage.py check

# Si todo está bien:
# System check identified no issues (0 silenced).

# Correr tests si existen
python manage.py test
```

- [ ] `python manage.py check` sin errores

---

## 📋 FASE 2: FRONTEND - ANGULAR

### 2.1 Crear Guard
- [ ] Crear archivo `src/app/guards/role-based.guard.ts`
- [ ] Implementar lógica de validación de roles
- [ ] Exportar en módulos necesarios

### 2.2 Actualizar AuthService
- [ ] Verificar que existen métodos:
  - `isSuperAdmin()` ✅
  - `isAdmin()` ✅
  - `isRRHH()` ✅
  - `isManagement()` ✅
  
```typescript
// En auth.service.ts, estos deben existir:
isSuperAdmin(): boolean { return this.getRole() === 'SUPERADMIN'; }
isAdmin(): boolean { return this.getRole() === 'ADMIN'; }
isRRHH(): boolean { return this.getRole() === 'RRHH'; }
isManagement(): boolean { /* ✅ */ }
```

- [ ] Todos los métodos presentes en AuthService

### 2.3 Actualizar Rutas (app.routes.ts)
```typescript
const routes: Routes = [
  // Admin routes
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [RoleBasedGuard],
    data: { roles: ['ADMIN', 'SUPERADMIN'] }
  },
  
  // Management routes
  {
    path: 'personal',
    component: PersonalComponent,
    canActivate: [RoleBasedGuard],
    data: { roles: ['ADMIN', 'RRHH', 'GERENTE', 'SUPERADMIN'] }
  },
  
  // Public routes
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  }
];
```

- [ ] Actualizar rutas sensibles con guards
- [ ] Agregar `data: { roles: [...] }` a cada ruta
- [ ] Compilar frontend sin errores

### 2.4 Visibilidad de UI
```typescript
// En cada componente:
export class MiComponente {
  isSuperAdmin = this.auth.isSuperAdmin();
  isAdmin = this.auth.isAdmin();
  isRRHH = this.auth.isRRHH();
  isManagement = this.auth.isManagement();
}
```

```html
<!-- En templates -->
<button *ngIf="isAdmin || isSuperAdmin">Crear Empleado</button>
<button *ngIf="isManagement">Ver Dashboard</button>
<button *ngIf="true">Mi Perfil</button>
```

- [ ] PersonalComponent: solo ADMIN/RRHH/GERENTE ven botón "Crear"
- [ ] ConfiguracionComponent: solo ADMIN/RRHH/SUPERADMIN ven
- [ ] TareasComponent: aprobación solo para gestores
- [ ] DashboardComponent: filtrado por rol

---

## 🧪 FASE 3: TESTING MANUAL

### 3.1 Test como SUPERADMIN
```
Usuario: admin@gmail.com
Rol: SUPERADMIN

- [ ] Navegar a /configuracion → ✅ Acceso
- [ ] Navegar a /personal → ✅ Acceso
- [ ] Navegar a /tareas → ✅ Acceso
- [ ] Ver botón "Crear Empleado" → ✅ Visible
- [ ] Ver botón "Crear Tarea" → ✅ Visible
- [ ] Clickear "Crear Empleado" → ✅ Funciona
```

### 3.2 Test como ADMIN
```
Usuario: admin-empresa1@gmail.com
Rol: ADMIN

- [ ] Navegar a /configuracion → ✅ Acceso
- [ ] Navegar a /personal → ✅ Acceso
- [ ] Navegar a /tareas → ✅ Acceso
- [ ] Ver botón "Crear Empleado" → ✅ Visible
- [ ] Crear empleado → ✅ Funciona
- [ ] Navegar a /admin (SaaS) → ❌ Denegado
- [ ] Ver solo empleados de su empresa → ✅ Correcto
```

### 3.3 Test como RRHH
```
Usuario: maria-rrhh@gmail.com
Rol: RRHH

- [ ] Ver /personal → ✅ Acceso
- [ ] Ver /tareas → ✅ Acceso
- [ ] Ver /configuracion → ✅ Acceso (parcial)
- [ ] Ver botón "Crear Empleado" → ✅ Visible
- [ ] Ver botón "Editar Config Nómina" → ❌ No visible
- [ ] Intentar editar sucursal → ❌ No puede
- [ ] Crear tipo de ausencia → ✅ Puede
```

### 3.4 Test como GERENTE
```
Usuario: carlos-gerente@gmail.com
Rol: GERENTE
Sucursal: Centro

- [ ] Ver /personal → ✅ Acceso (solo su sucursal)
- [ ] Ver /tareas → ✅ Acceso
- [ ] Ver /configuracion → ❌ Denegado
- [ ] Ver empleados de otra sucursal → ❌ No visible
- [ ] Ver empleados de su sucursal → ✅ Visible
- [ ] Crear tarea para empleado de su sucursal → ✅ Puede
- [ ] Crear tarea para empleado de otra sucursal → ❌ No debe poder
- [ ] Aprobar tarea de su equipo → ✅ Puede
- [ ] Aprobar tarea de otro gerente → ❌ No puede
```

### 3.5 Test como EMPLEADO
```
Usuario: pedro-empleado@gmail.com
Rol: EMPLEADO

- [ ] Navegar a /configuracion → ❌ Denegado
- [ ] Navegar a /personal → ❌ Denegado
- [ ] Navegar a /dashboard → ✅ Acceso
- [ ] Ver botón "Crear Empleado" → ❌ No visible
- [ ] Ver "Mis Tareas" → ✅ Visible
- [ ] Ver tareas de otros → ❌ No visible
- [ ] Completar su tarea → ✅ Puede
- [ ] Crear tarea → ❌ No puede
```

---

## 📊 FASE 4: TESTING CON API

### 4.1 Endpoint: Crear Empleado

```bash
# SUPERADMIN - Debe funcionar ✅
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_SUPERADMIN" \
  -d '{"nombres":"Juan","email":"juan@test.com"}'
# Respuesta: 201 Created

# ADMIN - Debe funcionar ✅
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_ADMIN" \
  -d '{"nombres":"Juan","email":"juan@test.com"}'
# Respuesta: 201 Created

# RRHH - Debe funcionar ✅
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_RRHH" \
  -d '{"nombres":"Juan","email":"juan@test.com"}'
# Respuesta: 201 Created

# GERENTE - Debe fallar ❌
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_GERENTE" \
  -d '{"nombres":"Juan","email":"juan@test.com"}'
# Respuesta: 403 Forbidden
# Mensaje: "Acceso denegado. Se requieren uno de estos roles: ADMIN, RRHH, SUPERADMIN"

# EMPLEADO - Debe fallar ❌
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_EMPLEADO" \
  -d '{"nombres":"Juan","email":"juan@test.com"}'
# Respuesta: 403 Forbidden
```

- [ ] SUPERADMIN puede crear empleados
- [ ] ADMIN puede crear empleados
- [ ] RRHH puede crear empleados
- [ ] GERENTE no puede (403)
- [ ] EMPLEADO no puede (403)

### 4.2 Endpoint: Aprobar Tarea

```bash
# ADMIN - Debe funcionar ✅
curl -X POST http://localhost:8000/api/tareas/1/aprobar/ \
  -H "Authorization: Token TOKEN_ADMIN"
# Respuesta: 200 OK

# RRHH - Debe funcionar ✅
# GERENTE - Debe funcionar ✅
# EMPLEADO - Debe fallar ❌
```

- [ ] ADMIN/RRHH/GERENTE pueden aprobar
- [ ] EMPLEADO no puede (403)

### 4.3 Endpoint: Ver Empleados (Filtrado)

```bash
# ADMIN - Ve todos los de su empresa
curl -X GET http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_ADMIN"
# Respuesta: [empleado1, empleado2, ...] solo de su empresa

# GERENTE - Ve solo los de su sucursal
curl -X GET http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_GERENTE"
# Respuesta: [empleado1, empleado2] solo de su sucursal

# EMPLEADO - Ve solo él mismo
curl -X GET http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_EMPLEADO"
# Respuesta: [el empleado autenticado]
```

- [ ] ADMIN ve empleados de su empresa
- [ ] GERENTE ve empleados de su sucursal
- [ ] EMPLEADO ve solo sus datos

---

## 🎨 FASE 5: TESTING DE UI

### 5.1 Test Navbar/Menu

```
Loguear como SUPERADMIN
├─ Ver: SaaS, Gestion, Dashboard
├─ Click SaaS → Ve Empresas, Licencias
└─ Click Gestion → Ve Personal, Configuracion

Loguear como ADMIN
├─ Ver: Gestion, Dashboard
├─ NO ver: SaaS
└─ Click Gestion → Ve Personal, Configuracion, Tareas

Loguear como RRHH
├─ Ver: Personal, Tareas, Dashboard
├─ NO ver: SaaS, Configuracion
└─ Todo funciona

Loguear como GERENTE
├─ Ver: Mi Equipo, Tareas, Dashboard
├─ NO ver: Personal, Configuracion
└─ Solo ve su sucursal

Loguear como EMPLEADO
├─ Ver: Reloj, Mis Tareas, Mi Asistencia
├─ NO ver: Nada de admin
└─ Solo sus datos
```

- [ ] SUPERADMIN: menú completo
- [ ] ADMIN: menú de gestión
- [ ] RRHH: menú de RRHH
- [ ] GERENTE: menú de gerente
- [ ] EMPLEADO: menú de empleado

### 5.2 Test Botones

En **Personal Component**:
- [ ] ADMIN/RRHH: botón "Crear Empleado" visible
- [ ] GERENTE: botón no visible
- [ ] EMPLEADO: botón no visible

En **Tareas Component**:
- [ ] ADMIN/RRHH/GERENTE: botón "Crear Tarea" visible
- [ ] EMPLEADO: botón no visible

En **Configuración Component**:
- [ ] ADMIN/RRHH: componente cargado
- [ ] GERENTE/EMPLEADO: acceso denegado

---

## 🔍 FASE 6: VALIDACIÓN DE RESTRICCIONES

### Test: GERENTE no puede ver empleados de otra sucursal

```
Crear 2 sucursales: Centro y Mall
Crear GERENTE asignado a Centro
Crear empleado en Mall

GERENTE intenta:
- [ ] GET /api/empleados/ → Solo ve empleados de Centro ✅
- [ ] GET /api/empleados/?sucursal=mall → No retorna nada ✅
```

### Test: EMPLEADO no puede ver datos de otros

```
EMPLEADO intenta:
- [ ] GET /api/empleados/ → Solo ve sus datos ✅
- [ ] GET /api/empleados/2/ → 404 Forbidden ✅
- [ ] GET /api/tareas/ → Solo sus tareas ✅
- [ ] GET /api/asistencia/otros/ → Forbidden ✅
```

### Test: ADMIN de una empresa no ve datos de otra empresa

```
Crear 2 empresas: EmpA y EmpB
Crear ADMIN para cada una

ADMIN_EmpA intenta:
- [ ] GET /api/empleados/ (EmpB) → 403 Forbidden ✅
- [ ] GET /api/tareas/ (EmpB) → Filtrado a EmpA ✅
```

---

## 📝 FASE 7: DOCUMENTACIÓN

- [ ] Documentar qué puede hacer cada rol
- [ ] Crear matriz de permisos visual
- [ ] Escribir casos de uso prácticos
- [ ] Documentar excepciones
- [ ] Crear guía de troubleshooting

---

## ✅ FIRMA DE VALIDACIÓN

Cuando todo esté listo:

```
Fecha: ___________
Validador: ___________

Backend:
- [ ] Permisos implementados
- [ ] Tests pasando
- [ ] No hay errores en manage.py check

Frontend:
- [ ] Guards funcionales
- [ ] Rutas protegidas
- [ ] UI filtrada por rol

Testing:
- [ ] Manual testing completado
- [ ] API testing completado
- [ ] Todos los casos de uso funcionan

Producción:
- [ ] Backup realizado
- [ ] Deploy realizado
- [ ] Monitoreo activo
```

---

## 🆘 TROUBLESHOOTING

### Problema: "403 Forbidden" cuando debería ser permitido
```
Verificar:
1. ¿El usuario tiene el rol correcto? 
   - GET /api/empleados/me/
   - Ver rol en respuesta
   
2. ¿El decorator está correcto?
   - @require_roles('ADMIN', 'RRHH')
   - ¿Incluye el rol del usuario?
   
3. ¿La función get_empleado_o_none() retorna None para SuperUser?
   - Es intencional
   - SuperUser siempre puede

4. ¿Hay errores en consola del servidor?
   - Ver logs: `tail -f logs/django.log`
```

### Problema: Guard bloquea cuando no debería
```
Verificar:
1. ¿El data.roles incluye el rol del usuario?
   - data: { roles: ['ADMIN', 'RRHH'] }
   - ¿El usuario tiene uno de esos roles?

2. ¿isSuperAdmin() retorna true?
   - SuperAdmin siempre pasa guards
   - Verificar en AuthService

3. ¿getRole() retorna el rol correcto?
   - Loguear: console.log(this.auth.getRole())
   - Verificar en localStorage
```

### Problema: Filtrado de datos no funciona
```
Verificar:
1. ¿get_queryset_filtrado() está siendo usado?
2. ¿Los campos de filtrado existen en el modelo?
3. ¿Hay queryset.none() cuando no debería?
4. ¿SuperUser está siendo excluido del filtrado?
```
