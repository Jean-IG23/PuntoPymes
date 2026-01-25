# 🔐 REFERENCIA RÁPIDA - RBAC v2.0

**Para consulta rápida durante implementación**

---

## Roles (Memoria)

```
ADMIN_GLOBAL       → Todo, aprueba finalmente
GERENTE_SUCURSAL   → Su sucursal, aprueba primero
EMPLEADO_SUPERVISOR → Su equipo, NO aprueba
EMPLEADO           → Solo sus datos
```

---

## Row-Level Security (RLS)

**Qué es**: Filtrar datos automáticamente según el usuario

**Dónde se aplica**:
- Backend: `RLSQuerySetMixin` en ViewSets
- Automático en `filter_queryset_por_rol()`

**Cómo**:
```python
class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    # ✅ RLS automática aplicada
```

---

## Flujos Clave

### Solicitud de Ausencia
```
EMPLEADO crea 
    ↓ Sistema busca GERENTE de su sucursal
GERENTE recibe automáticamente
    ↓ GERENTE aprueba
RRHH recibe automáticamente
    ↓ RRHH aprueba finalmente
EMPLEADO notificado ✅
```

### Tarea Creada
```
GERENTE crea tarea
    ↓ Sistema valida: ¿empleado de su sucursal?
EMPLEADO notificado automáticamente
    ↓ EMPLEADO actualiza progreso
```

---

## Permisos Rápidos

| Módulo | ADMIN | GERENTE | SUPERVISOR | EMPLEADO |
|--------|-------|---------|------------|----------|
| Empleados | CRUD | R | R | ❌ |
| Org Chart | ✅ | ❌ | ❌ | ❌ |
| Asistencia | CRUD | R | R | R (propia) |
| Tareas | CRUD | CRUD | CRU | RU |
| Ausencias | Aprueba | Aprueba | Lee | Crea |
| Nómina | CRUD | ❌ | ❌ | R (propia) |

---

## Decoradores Útiles

```python
# Requerir permiso específico
@require_permission('ausencias', 'aprobar')
def approve(self, request):
    pass

# Requerir uno de varios
@require_any_permission('tareas', 'crear', 'editar')
def update(self, request):
    pass

# Requerir rol específico
@require_rol('ADMIN_GLOBAL', 'GERENTE_SUCURSAL')
def view(self, request):
    pass
```

---

## Validaciones RLS

```python
# ¿Puede ver este empleado?
if not puede_ver_empleado(user, empleado_objetivo):
    return 403

# ¿Puede crear tarea?
puede, motivo = validar_puede_crear_tarea(creador, asignado_a, sucursal)
if not puede:
    return Response({'error': motivo}, status=400)

# ¿Puede aprobar?
puede, motivo = validar_puede_aprobar_ausencia(aprobador, solicitud)
if not puede:
    return Response({'error': motivo}, status=403)
```

---

## Frontend: Mostrar/Ocultar

```html
<!-- Solo ADMIN_GLOBAL -->
<div *ngIf="auth.isAdminGlobal()">
  Org Chart y Configuración
</div>

<!-- ADMIN + GERENTE + SUPERVISOR -->
<div *ngIf="auth.isAdminGlobal() || auth.isGerenteSucursal() || auth.isSupervisor()">
  Reportes
</div>

<!-- Todos excepto EMPLEADO -->
<div *ngIf="auth.getRole() !== 'EMPLEADO'">
  Dashboard
</div>
```

---

## Migrations (Base de Datos)

```bash
# Actualizar roles de Empleado
python manage.py makemigrations

# Agregar campos a SolicitudAusencia
python manage.py makemigrations

# Ejecutar
python manage.py migrate
```

---

## Archivos Creados

```
core/rbac_avanzado.py
├─ filter_queryset_por_rol()      → RLS automática
├─ tiene_permiso()                 → Validar acceso
├─ require_permission()            → Decorador
├─ RLSQuerySetMixin               → Para ViewSets
└─ puede_ver_empleado()           → Validar acceso a registro

core/workflows.py
├─ obtener_gerente_responsable()  → Buscar aprobador
├─ enrutar_solicitud_ausencia()   → Enrutar automático
├─ aprobar_solicitud_ausencia()   → Aprobar
├─ rechazar_solicitud_ausencia()  → Rechazar
└─ @receiver (signals)             → Automático en creación
```

---

## Testing Rápido

```python
# Test RLS
def test_ger ente_solo_ve_su_sucursal():
    gerente = Empleado(rol='GERENTE_SUCURSAL', sucursal=quito)
    empleado_quito = Empleado(sucursal=quito)
    empleado_loja = Empleado(sucursal=loja)
    
    assert puede_ver_empleado(gerente.usuario, empleado_quito)
    assert not puede_ver_empleado(gerente.usuario, empleado_loja)

# Test Permisos
def test_empleado_no_puede_aprobar():
    empleado = Empleado(rol='EMPLEADO')
    assert not tiene_permiso(empleado.usuario, 'ausencias', 'aprobar')

# Test Enrutamiento
def test_solicitud_enrutada_a_gerente():
    juan = Empleado(rol='EMPLEADO', sucursal=quito)
    solicitud = SolicitudAusencia(empleado=juan)
    
    enrutar_solicitud_ausencia(solicitud)
    
    assert solicitud.aprobador_asignado.rol == 'GERENTE_SUCURSAL'
    assert solicitud.aprobador_asignado.sucursal == quito
```

---

## Errores Comunes

```
❌ "Me aparece toda la data aunque sea GERENTE"
   → Falta agregar RLSQuerySetMixin a ViewSet
   
❌ "El botón de Org Chart aparece para todos"
   → Falta *ngIf="auth.isAdminGlobal()" en HTML
   
❌ "Las solicitudes no se enrutan"
   → Falta signal @receiver en signals.py
   
❌ "Puedo crear tarea para empleados de otra sucursal"
   → Falta validar con validar_puede_crear_tarea()
   
❌ "Los datos no están auditados"
   → Falta registrar en AuditoriaAcceso
```

---

## URLs de API

```
# Crear solicitud (EMPLEADO)
POST /api/ausencias/solicitudes/
{
  "tipo": "VACACION",
  "fecha_inicio": "2026-01-23",
  "fecha_fin": "2026-01-26"
}

# Aprobar (GERENTE o ADMIN)
POST /api/ausencias/solicitudes/{id}/approve_solicitud/
{
  "comentarios": "Aprobado"
}

# Rechazar (GERENTE o ADMIN)
POST /api/ausencias/solicitudes/{id}/reject_solicitud/
{
  "motivo": "Necesitamos cobertura esa fecha"
}

# Crear tarea (GERENTE)
POST /api/tareas/
{
  "titulo": "Reporte de ventas",
  "asignado_a": 5,
  "fecha_vencimiento": "2026-01-25"
}
```

---

## Servicios Importantes

```python
from core.rbac_avanzado import (
    filter_queryset_por_rol,
    tiene_permiso,
    puede_ver_empleado,
    require_permission,
    RLSQuerySetMixin,
)

from core.workflows import (
    obtener_gerente_responsable,
    enrutar_solicitud_ausencia,
    aprobar_solicitud_ausencia,
    rechazar_solicitud_ausencia,
    validar_puede_crear_tarea,
    validar_puede_aprobar_ausencia,
)
```

---

## Quick Setup

```bash
# 1. Copiar archivos
cp rbac_avanzado.py core/
cp workflows.py core/

# 2. Actualizar models.py
# - Cambiar ROLES en Empleado
# - Agregar campos a SolicitudAusencia

# 3. Crear migrations
python manage.py makemigrations
python manage.py migrate

# 4. Usar en ViewSets
from core.rbac_avanzado import RLSQuerySetMixin

class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()

# 5. Frontend: Actualizar auth.service.ts
isAdminGlobal() { return this.getRole() === 'ADMIN_GLOBAL'; }
isGerenteSucursal() { return this.getRole() === 'GERENTE_SUCURSAL'; }
```

---

## Dashboard de Implementación

| Componente | Estado | Fecha |
|------------|--------|-------|
| rbac_avanzado.py | ✅ HECHO | Ene 23 |
| workflows.py | ✅ HECHO | Ene 23 |
| Actualizar modelos | ⏳ TODO | |
| Aplicar RLS en ViewSets | ⏳ TODO | |
| Implementar workflows | ⏳ TODO | |
| Restricciones UI | ⏳ TODO | |
| Testing completo | ⏳ TODO | |
| Deploy producción | ⏳ TODO | |

---

**Última Actualización**: Enero 23, 2026  
**Versión**: RBAC 2.0

Para más detalles ver: `ARQUITECTURA_RBAC_AVANZADA.md`
