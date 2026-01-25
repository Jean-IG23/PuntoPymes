# 🔐 Implementación RBAC Completa - TalentTrack

## Resumen Ejecutivo

Se ha implementado un sistema completo de Control de Acceso Basado en Roles (RBAC) con las siguientes características:

1. **Row-Level Security (Aislamiento de Datos)** - Cada rol solo ve los datos que le corresponden
2. **Restricciones de Módulos** - Ciertos módulos están ocultos para roles específicos
3. **Workflow Automático** - Las solicitudes de vacaciones se asignan automáticamente al gerente
4. **Validaciones de Negocio** - Gerentes solo pueden gestionar empleados de su sucursal

---

## 📋 Definición de Roles

| Rol | Descripción | Alcance de Datos |
|-----|-------------|------------------|
| **SUPERADMIN** | Super Admin del SaaS | Acceso total técnico |
| **ADMIN** | Cliente/Dueño de empresa | Toda su empresa |
| **RRHH** | Recursos Humanos | Toda su empresa |
| **GERENTE** | Gerente de Sucursal | Solo su sucursal |
| **EMPLEADO** | Colaborador | Solo sus propios datos |

---

## 🔒 Reglas de Negocio Implementadas

### 1. Alcance de Datos (Row-Level Security)

#### Empleados
```
SUPERADMIN → Ve todos los empleados
ADMIN/RRHH → Ve todos los empleados de su empresa
GERENTE    → Solo ve empleados de su sucursal
EMPLEADO   → Solo ve su propio perfil
```

#### Tareas
```
SUPERADMIN → Ve todas las tareas
ADMIN/RRHH → Ve todas las tareas de su empresa
GERENTE    → Solo ve tareas de empleados de su sucursal
EMPLEADO   → Solo ve tareas asignadas a él
```

#### Objetivos
```
SUPERADMIN → Ve todos los objetivos
ADMIN/RRHH → Ve todos los objetivos de su empresa
GERENTE    → Solo ve objetivos de empleados de su sucursal
EMPLEADO   → Solo ve sus propios objetivos (NO puede crear)
```

#### Solicitudes de Ausencia
```
SUPERADMIN → Ve todas las solicitudes
ADMIN/RRHH → Ve todas las solicitudes de su empresa
GERENTE    → Solo ve solicitudes de empleados de su sucursal
EMPLEADO   → Solo ve sus propias solicitudes
```

#### Asistencia/Jornadas
```
SUPERADMIN → Ve todas las jornadas
ADMIN/RRHH → Ve todas las jornadas de su empresa
GERENTE    → Solo ve jornadas de empleados de su sucursal
EMPLEADO   → Solo ve sus propias jornadas
```

### 2. Restricciones de Creación

#### Tareas
- **EMPLEADO**: NO puede crear tareas
- **GERENTE**: Solo puede asignar tareas a empleados de su sucursal
- **ADMIN/RRHH**: Pueden asignar tareas a cualquier empleado

#### Objetivos
- **EMPLEADO**: NO puede crear objetivos
- **GERENTE**: Solo puede asignar objetivos a empleados de su sucursal
- **ADMIN/RRHH**: Pueden asignar objetivos a cualquier empleado

### 3. Workflow de Solicitudes de Vacaciones

Cuando un empleado crea una solicitud de vacaciones:

1. Se validan fechas y saldo disponible
2. Se crea la solicitud en estado PENDIENTE
3. **Se busca automáticamente el GERENTE de la sucursal del empleado**
4. Se crea una notificación para el gerente
5. Si no hay gerente, se notifica a RRHH/ADMIN

```
Ejemplo:
- Juan (Sucursal Quito) pide vacaciones
- El sistema busca al Gerente de Sucursal Quito (Ricardo)
- Ricardo recibe una notificación automática
- Ricardo puede aprobar/rechazar la solicitud
```

### 4. Restricciones de UI/Navegación

#### Módulo de Organización (Org Chart)
```
SUPERADMIN → ✅ Puede ver
ADMIN      → ✅ Puede ver
RRHH       → ✅ Puede ver
GERENTE    → ⛔ NO puede ver (información sensible)
EMPLEADO   → ⛔ NO puede ver
```

---

## 📁 Archivos Modificados

### Backend (Django)

| Archivo | Cambios |
|---------|---------|
| `core/permissions.py` | Funciones centralizadas de Row-Level Security |
| `personal/views.py` | EmpleadoViewSet, SolicitudViewSet, TareaViewSet con RLS |
| `kpi/views.py` | ObjetivoViewSet con RLS |
| `asistencia/views.py` | JornadaViewSet con RLS |
| `core/views.py` | Endpoint `/api/permisos/` para el frontend |
| `PuntoPymes/urls.py` | Nueva ruta para permisos |

### Frontend (Angular)

| Archivo | Cambios |
|---------|---------|
| `auth.service.ts` | Métodos `canSeeOrganization()`, `canSeeEmployees()`, etc. |
| `main-layout.component.html` | Oculta "Organización" para GERENTE |
| `organization.guard.ts` | Guard para bloquear acceso directo por URL |
| `app.routes.ts` | Ruta de organización protegida con guard |

---

## 🔧 Funciones de Permisos Disponibles

### Backend (`core/permissions.py`)

```python
# Filtrar querysets según rol
get_queryset_filtrado_empleados(user, queryset)
get_queryset_filtrado_tareas(user, queryset)
get_queryset_filtrado_objetivos(user, queryset)
get_queryset_filtrado_ausencias(user, queryset)

# Verificar permisos
tiene_permiso(user, modulo, accion)
puede_ver_modulo(user, modulo)
puede_gestionar_empleado(user, empleado_objetivo)

# Workflow
get_gerente_sucursal(empleado)  # Obtiene el gerente de la sucursal

# Para el frontend
get_permisos_usuario(user)  # Retorna dict con todos los permisos
```

### Frontend (`auth.service.ts`)

```typescript
// Verificar acceso a módulos
canSeeOrganization(): boolean  // Solo ADMIN, RRHH, SUPERADMIN
canSeeEmployees(): boolean     // Todos menos EMPLEADO
canCreateObjectives(): boolean // Todos menos EMPLEADO
canApproveRequests(): boolean  // GERENTE, RRHH, ADMIN, SUPERADMIN
```

---

## 🧪 Cómo Probar

### 1. Probar Row-Level Security

```bash
# Crear usuarios de prueba con diferentes roles
# Iniciar sesión con cada uno y verificar que solo ven sus datos

# GERENTE de Sucursal Quito:
# - Solo debe ver empleados de Sucursal Quito
# - Solo debe ver tareas de empleados de Sucursal Quito
# - NO debe ver el módulo de Organización

# EMPLEADO:
# - Solo debe ver su propio perfil
# - Solo debe ver sus propias tareas
# - NO puede crear tareas ni objetivos
```

### 2. Probar Workflow de Vacaciones

```bash
# 1. Iniciar sesión como EMPLEADO de Sucursal Quito
# 2. Crear una solicitud de vacaciones
# 3. Verificar que el GERENTE de Sucursal Quito recibe notificación
# 4. Iniciar sesión como GERENTE
# 5. Aprobar/Rechazar la solicitud
```

### 3. Probar Restricciones de UI

```bash
# 1. Iniciar sesión como GERENTE
# 2. Verificar que NO aparece el enlace "Organización" en el menú
# 3. Intentar acceder directamente a /gestion/organizacion
# 4. Verificar que se muestra alerta y redirige al dashboard
```

---

## 📊 API de Permisos

### Endpoint: `GET /api/permisos/`

Retorna los permisos del usuario autenticado:

```json
{
  "rol": "GERENTE",
  "permisos": {
    "dashboard": ["ver"],
    "empleados": ["leer"],
    "tareas": ["crear", "leer", "editar", "aprobar", "rechazar"],
    "ausencias": ["leer", "aprobar", "rechazar"],
    "objetivos": ["crear", "leer", "editar"],
    "organizacion": []
  },
  "modulos_restringidos": ["organizacion", "empresas", "configuracion"],
  "puede_ver_organizacion": false,
  "puede_ver_empleados": true,
  "puede_ver_configuracion": false,
  "sucursal_id": 1,
  "empresa_id": 1
}
```

---

## ⚠️ Consideraciones Importantes

1. **Los gerentes automáticamente gestionan la sucursal donde están asignados**
   - Ya no existe el campo `sucursal_a_cargo`
   - El gerente gestiona `empleado.sucursal`

2. **Un empleado solo puede tener un gerente**
   - Si se asigna un nuevo gerente a una sucursal, el anterior se convierte en EMPLEADO

3. **Las notificaciones se crean automáticamente**
   - Al crear solicitudes de vacaciones
   - Al asignar objetivos

4. **El frontend debe respetar los permisos del backend**
   - Aunque se oculten elementos en la UI, el backend siempre valida

---

## 🚀 Próximos Pasos Sugeridos

1. [ ] Agregar logs de auditoría para cambios de permisos
2. [ ] Implementar permisos granulares por departamento
3. [ ] Agregar notificaciones push/email
4. [ ] Dashboard de métricas por sucursal para gerentes
5. [ ] Reportes de cumplimiento de objetivos por equipo
