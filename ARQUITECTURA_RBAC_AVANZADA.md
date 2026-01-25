# 🔐 ARQUITECTURA AVANZADA DE RBAC Y SEGURIDAD - TALENTTRACK

**Versión**: 2.0 (Refactorización Completa)  
**Fecha**: Enero 23, 2026  
**Arquitecto**: Senior Security Specialist  
**Estado**: ✅ Listo para Implementación

---

## 📋 ÍNDICE EJECUTIVO

1. [Visión General](#visión-general)
2. [Nuevos Roles Redefinidos](#nuevos-roles-redefinidos)
3. [Matriz de Permisos Completa](#matriz-de-permisos-completa)
4. [Row-Level Security (RLS)](#row-level-security-rls)
5. [Flujos de Trabajo Implementados](#flujos-de-trabajo-implementados)
6. [Restricciones de UI](#restricciones-de-ui)
7. [Ejemplos Prácticos](#ejemplos-prácticos)
8. [Guía de Implementación](#guía-de-implementación)

---

## 🎯 Visión General

### Problema Actual
- ❌ Todos ven todos los datos
- ❌ No hay restricción por sucursal
- ❌ Las solicitudes no se enrutan automáticamente
- ❌ Módulos sensibles accesibles para todos
- ❌ Sem row-level security

### Solución Propuesta
- ✅ **4 Roles Jerárquicos** claramente definidos
- ✅ **Row-Level Security** filtro automático de datos
- ✅ **Workflows de Aprobación** con enrutamiento inteligente
- ✅ **Restricciones de UI** por módulo y rol
- ✅ **Validaciones en 2 capas** (backend + frontend)

---

## 👥 Nuevos Roles Redefinidos

### Estructura Jerárquica

```
LEVEL 4: ADMIN_GLOBAL (RRHH) ─── Autoridad global de la empresa
│        └─ Un único usuario por empresa
│
LEVEL 3: GERENTE_SUCURSAL ──────── Autoridad local de una sucursal
│        └─ Un por sucursal (automáticamente reemplazado)
│
LEVEL 2: EMPLEADO_SUPERVISOR ──── Supervisor de equipo sin poder aprobar
│        └─ Puede haber múltiples por departamento
│
LEVEL 1: EMPLEADO ──────────────── Usuario final operativo
         └─ Sin responsabilidades de supervisión
```

### Descripción Detallada de Roles

#### **ADMIN_GLOBAL (Nivel 4) - Autoridad Total**

```
Perfil Típico: Gerente de RRHH o Dueño de la Empresa

Responsabilidades:
├─ Gestión de Personal
│  ├─ Crear/Editar/Eliminar empleados
│  ├─ Cambiar roles y asignaciones
│  └─ Ver todos los empleados
├─ Aprobaciones Finales
│  ├─ Aprobar/Rechazar solicitudes de ausencia
│  ├─ Resolver escalamientos
│  └─ Tomar decisiones finales
├─ Configuración del Sistema
│  ├─ Crear/Editar turnos
│  ├─ Definir departamentos y áreas
│  ├─ Configurar parámetros de nómina
│  └─ Gestionar sucursales
├─ Reportes y Analytics
│  ├─ Ver todos los reportes
│  ├─ Acceder a nómina consolidada
│  ├─ Analizar productividad global
│  └─ Auditoría de accesos
└─ Estructura Organizacional
   └─ Acceso a Org Chart completo

Restricciones: NINGUNA (acceso total)

Datos Accesibles: TODO
```

---

#### **GERENTE_SUCURSAL (Nivel 3) - Autoridad Local**

```
Perfil Típico: Gerente de oficina local (Quito, Guayaquil, Cuenca)

Responsabilidades:
├─ Supervisión de Equipo
│  ├─ Ver empleados de su sucursal ÚNICAMENTE
│  ├─ Leer asistencia de su sucursal
│  ├─ Ver reportes locales
│  └─ Monitorear productividad
├─ Gestión de Tareas
│  ├─ Crear tareas para su equipo
│  ├─ Editar tareas de su equipo
│  ├─ Aprobar tareas completadas
│  └─ Gestionar prioridades
├─ Aprobación de Solicitudes
│  ├─ RECIBE automáticamente las solicitudes de su equipo
│  ├─ Puede aprobar/rechazar
│  ├─ Si aprueba → Va a RRHH para confirmación
│  └─ Si rechaza → Solicitud cierra
└─ Asignación de Objetivos
   ├─ Crear KPIs para su equipo
   └─ Monitorear progreso

PROHIBICIONES (❌ No puede):
├─ Ver empleados de otras sucursales
├─ Acceder a nómina
├─ Ver estructura organizacional (Org Chart)
├─ Crear/Editar configuración del sistema
├─ Eliminar empleados
├─ Cambiar roles
└─ Acceder a datos de otras sucursales

Datos Accesibles: SOLO su sucursal (filtrado automáticamente)
```

---

#### **EMPLEADO_SUPERVISOR (Nivel 2) - Supervisión Limitada**

```
Perfil Típico: Jefe de proyecto, Supervisor de área

Responsabilidades:
├─ Supervisión de Equipo Directo
│  ├─ Ver datos de empleados reportados
│  ├─ Ver asistencia del equipo
│  └─ Ver tareas de su equipo
├─ Creación de Tareas
│  ├─ Crear tareas para su equipo
│  ├─ Editar tareas asignadas
│  └─ Asignar a miembros del equipo
└─ Reporte de Progreso
   ├─ Ver objetivos del equipo
   └─ Monitorear productividad

PROHIBICIONES (❌ No puede):
├─ Aprobar solicitudes de ausencia
├─ Cambiar roles
├─ Ver estructura organizacional
├─ Acceder a nómina
├─ Crear empleados
├─ Ver datos de otros departamentos
└─ Acceder a configuración

Datos Accesibles: Su equipo directo + datos propios
```

---

#### **EMPLEADO (Nivel 1) - Usuario Final**

```
Perfil Típico: Trabajador, Operario, Colaborador

Responsabilidades:
├─ Gestión de Propia Asistencia
│  ├─ Marcar entrada/salida
│  ├─ Ver registro de asistencia propia
│  └─ Justificar ausencias
├─ Solicitudes de Ausencia
│  ├─ Crear solicitudes de vacaciones
│  ├─ Crear solicitudes de permisos
│  └─ Seguimiento de solicitud
├─ Gestión de Tareas Asignadas
│  ├─ Ver tareas asignadas
│  ├─ Actualizar estado
│  ├─ Agregar comentarios
│  └─ Marcar como completada
└─ Información Personal
   ├─ Ver perfil personal
   ├─ Editar datos propios
   └─ Ver nómina personal

PROHIBICIONES (❌ No puede):
├─ Ver datos de otros empleados
├─ Crear tareas para otros
├─ Aprobar solicitudes
├─ Ver estructura organizacional
├─ Acceder a configuración
├─ Ver datos de nómina de otros
└─ Crear objetivos (solo ver los propios)

Datos Accesibles: SOLO datos propios (filtrado automáticamente)
```

---

## 📊 Matriz de Permisos Completa

### Leyenda
- ✅ = Permitido
- ❌ = Prohibido
- 🔒 = Limitado (solo datos de su ámbito)

```
┌─────────────────────┬──────────┬─────────┬─────────────────┬──────────┐
│      MÓDULO         │  ADMIN   │ GERENTE │   SUPERVISOR    │ EMPLEADO │
├─────────────────────┼──────────┼─────────┼─────────────────┼──────────┤
│ DASHBOARD           │ ✅ Todo  │ 🔒 Local│ 🔒 Equipo       │ ❌       │
│ EMPLEADOS           │ ✅ CRUD  │ 🔒 Lee  │ 🔒 Lee          │ ❌       │
│ ESTRUCTURA ORG      │ ✅       │ ❌      │ ❌              │ ❌       │
│ ASISTENCIA          │ ✅ CRUD  │ 🔒 Lee  │ 🔒 Lee          │ ✅ Propia│
│ TAREAS              │ ✅ CRUD  │ ✅ CRUD │ ✅ CRE (equipo) │ ✅ Suyas │
│ AUSENCIAS           │ ✅ Aprueba│ ✅ Aprob│ 🔒 Lee         │ ✅ Crea  │
│ OBJETIVOS/KPI       │ ✅ CRUD  │ ✅ CRUD │ 🔒 Lee          │ 🔒 Lee   │
│ NÓMINA              │ ✅ CRUD  │ ❌      │ ❌              │ 🔒 Lee   │
│ CONFIGURACIÓN       │ ✅ CRUD  │ ❌      │ ❌              │ ❌       │
│ REPORTES            │ ✅ Todos │ 🔒 Local│ 🔒 Equipo       │ ❌       │
└─────────────────────┴──────────┴─────────┴─────────────────┴──────────┘
```

### Acciones Detalladas

| Módulo | Admin Global | Gerente Sucursal | Supervisor | Empleado |
|--------|---|---|---|---|
| **EMPLEADOS** | C️⃣R️⃣U️⃣D️⃣ | 🔒R (sucursal) | 🔒R (equipo) | ❌ |
| **ESTRUCTURA** | Ver (Org Chart) | ❌ Prohibido | ❌ Prohibido | ❌ Prohibido |
| **ASISTENCIA** | C️⃣R️⃣U️⃣ (todos) | 🔒R (sucursal) | 🔒R (equipo) | C️⃣R️⃣ (propia) |
| **TAREAS** | C️⃣R️⃣U️⃣D️⃣A️⃣ | C️⃣R️⃣U️⃣A️⃣ (equipo) | C️⃣R️⃣U️⃣ (equipo) | R️⃣U️⃣ (propias) |
| **AUSENCIAS** | R️⃣A️⃣R️⃣ (todas) | A️⃣R️⃣ (equipo) | 🔒R (equipo) | C️⃣R️⃣ (propias) |
| **OBJETIVOS** | C️⃣R️⃣U️⃣D️⃣ | C️⃣R️⃣U️⃣ (equipo) | 🔒R (equipo) | 🔒R (propios) |
| **NÓMINA** | C️⃣R️⃣U️⃣D️⃣ | ❌ Prohibido | ❌ Prohibido | 🔒R (propia) |
| **CONFIGURACIÓN** | C️⃣R️⃣U️⃣D️⃣ | ❌ Prohibido | ❌ Prohibido | ❌ Prohibido |

Donde:
- C️⃣ = Crear
- R️⃣ = Leer (Read)
- U️⃣ = Actualizar (Update)
- D️⃣ = Eliminar (Delete)
- A️⃣ = Aprobar

---

## 🔒 Row-Level Security (RLS)

### Concepto

**Row-Level Security** = Filtrar datos según el usuario sin que él mismo lo sepa

```python
# Sin RLS (INCORRECTO)
empleados = Empleado.objects.all()  # Ve todo

# Con RLS (CORRECTO)
empleados = filter_queryset_por_rol(queryset, user, Empleado)
# Si user es GERENTE_SUCURSAL de Quito → solo ve empleados de Quito
# Si user es EMPLEADO → solo ve sus datos
```

### Implementación

#### Caso 1: GERENTE_SUCURSAL

```python
# Código Backend
def filter_queryset_por_rol(queryset, user, modelo):
    empleado = get_empleado_o_none(user)
    
    if empleado.rol == 'GERENTE_SUCURSAL':
        # AUTOMÁTICAMENTE filtrar por su sucursal
        return queryset.filter(
            empresa=empleado.empresa,
            sucursal=empleado.sucursal  # <-- CLAVE
        )

# Resultado:
# Juan es GERENTE_SUCURSAL de Quito
# Juan.get_empleados() → retorna SOLO empleados de Quito
# Aunque haya 1000 empleados en el sistema, solo ve ~50 de Quito
```

#### Caso 2: EMPLEADO

```python
def filter_queryset_por_rol(queryset, user, modelo):
    empleado = get_empleado_o_none(user)
    
    if empleado.rol == 'EMPLEADO':
        # SOLO datos propios
        return queryset.filter(id=empleado.id)

# Resultado:
# María es EMPLEADO
# María.get_empleados() → retorna SOLO su registro
# No puede ver a ningún compañero
```

#### Caso 3: EMPLEADO_SUPERVISOR

```python
def filter_queryset_por_rol(queryset, user, modelo):
    empleado = get_empleado_o_none(user)
    
    if empleado.rol == 'EMPLEADO_SUPERVISOR':
        # Su equipo directo
        return queryset.filter(
            Q(departamento=empleado.departamento) | Q(id=empleado.id)
        )

# Resultado:
# Carlos es SUPERVISOR del Dpto. Ventas
# Carlos.get_empleados() → retorna solo empleados de Ventas + él mismo
```

### Cómo se Aplica Automáticamente

```python
# ViewSet en Django
class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    
    def get_queryset(self):
        # Heredado de RLSQuerySetMixin
        # AUTOMÁTICAMENTE aplica filtros de RLS
        return super().get_queryset()

# Cuando un usuario accede:
# GET /api/empleados/
# ├─ Backend AUTOMÁTICAMENTE filtra por RLS
# ├─ Si es GERENTE_SUCURSAL de Quito
# └─ Retorna SOLO empleados de Quito
```

---

## 🔄 Flujos de Trabajo Implementados

### Workflow 1: Solicitud de Ausencia (Vacaciones/Permisos)

#### **El Problema**
```
Antiguo (INCORRECTO):
Empleado → Crea solicitud → Se pierde en el sistema
                         → RRHH debe buscarla manualmente
```

#### **La Solución**
```
Nuevo (CORRECTO):

Paso 1: Empleado crea solicitud de vacaciones
        ├─ Selecciona: Tipo (Vacación/Permiso)
        ├─ Fechas: 23-26 de enero
        └─ Guarda solicitud

Paso 2: Sistema AUTOMÁTICAMENTE enruta
        ├─ Identifica: "Este empleado es de Sucursal Quito"
        ├─ Busca: "¿Gerente de Quito?"
        ├─ Encuentra: Ricardo (GERENTE_SUCURSAL)
        └─ Asigna solicitud a Ricardo

Paso 3: Ricardo (Gerente) recibe NOTIFICACIÓN
        ├─ Título: "Nueva Solicitud de Ausencia"
        ├─ Empleado: Juan
        ├─ Tipo: Vacaciones
        └─ Fechas: 23-26 enero

Paso 4: Ricardo APRUEBA
        ├─ Estado cambia: PENDIENTE_GERENTE → APROBADA_GERENTE
        ├─ Sistema automáticamente:
        │  ├─ Asigna a RRHH para confirmación
        │  └─ Notifica a RRHH
        └─ Juan recibe: "Tu solicitud fue aprobada por tu gerente"

Paso 5: RRHH (ADMIN_GLOBAL) REVISA y APRUEBA FINALMENTE
        ├─ Estado: APROBADA_FINAL
        └─ Juan recibe: "✅ Tu solicitud fue aprobada finalmente"

Si Ricardo RECHAZA en Paso 4:
├─ Estado: RECHAZADA_GERENTE
├─ Juan recibe: "❌ Tu solicitud fue rechazada. Motivo: ..."
└─ Fin del flujo (no sigue a RRHH)
```

#### **Código de Implementación**

```python
# En workflows.py
def enrutar_solicitud_ausencia(solicitud):
    empleado = solicitud.empleado
    
    # Paso 1: Buscar gerente responsable
    gerente = obtener_gerente_responsable(empleado)
    
    if gerente:
        # Paso 2: Asignar al gerente
        solicitud.aprobador_asignado = gerente
        solicitud.estado = 'PENDIENTE_GERENTE'
        solicitud.save()
        
        # Paso 3: Notificar
        crear_notificacion(
            usuario=gerente.usuario,
            titulo='Nueva Solicitud de Ausencia',
            mensaje=f'{empleado.nombres} solicita {solicitud.tipo}'
        )

# Signal: Se ejecuta automáticamente cuando se crea
@receiver(post_save, sender=SolicitudAusencia)
def solicitud_creada(sender, instance, created, **kwargs):
    if created:
        enrutar_solicitud_ausencia(instance)
```

---

### Workflow 2: Creación de Tarea

```
Paso 1: Gerente (Ricardo) crea una tarea
        ├─ Título: "Preparar reporte de ventas"
        ├─ Asignado a: María (empleado de su sucursal)
        └─ Vencimiento: 25 de enero

Paso 2: Sistema AUTOMÁTICAMENTE valida
        ├─ ¿Ricardo es GERENTE_SUCURSAL? ✅
        ├─ ¿María es de su sucursal? ✅
        └─ ✅ Permitir creación

Paso 3: María recibe NOTIFICACIÓN automática
        ├─ Título: "Nueva Tarea Asignada"
        ├─ Tarea: "Preparar reporte de ventas"
        └─ Vencimiento: 25 de enero

Paso 4: María edita progreso
        ├─ Cambia estado: PENDIENTE → EN_PROCESO
        ├─ Agrega comentarios: "Ya completé 50%"
        └─ Cambia estado: COMPLETADA

Paso 5: Ricardo recibe NOTIFICACIÓN
        └─ "María completó la tarea"

Si Ricardo hubiera intentado asignar a alguien de OTRA sucursal:
├─ Sistema valida: ¿Es de su sucursal? ❌
├─ Bloquea: "Solo puedes asignar a empleados de tu sucursal"
└─ Tarea NO se crea
```

---

### Workflow 3: Seguridad de Datos Sensibles

```
Intento 1: Gerente intenta ver Org Chart
├─ Accede a módulo "Estructura Organizacional"
├─ Sistema verifica: ¿GERENTE puede acceder? ❌
├─ Bloquea acceso: "Este módulo es solo para ADMIN_GLOBAL"
└─ Redirecciona a dashboard

Intento 2: Gerente intenta ver nómina de empleado
├─ Accede a GET /api/nomina/empleados/1/
├─ Sistema verifica: ¿GERENTE puede leer nómina? ❌
├─ Respuesta: 403 Forbidden
├─ Mensaje: "Acceso denegado. Solo ADMIN_GLOBAL puede acceder a nómina"
└─ Registra en auditoría: "Intento de acceso no autorizado"

Intento 3: Empleado intenta ver datos de colega
├─ Accede a GET /api/empleados/
├─ Sistema filtra automáticamente (RLS)
├─ Retorna: Solo SU registro
└─ No sabe que hay otros empleados
```

---

## 🚫 Restricciones de UI

### Módulo: "Estructura Organizacional" (Org Chart)

Este módulo muestra el árbol completo de la empresa (niveles jerárquicos, reportes).

```
¿Quién puede verlo?
├─ ADMIN_GLOBAL: ✅ SÍ (acceso total)
├─ GERENTE_SUCURSAL: ❌ NO (información sensible)
├─ EMPLEADO_SUPERVISOR: ❌ NO
└─ EMPLEADO: ❌ NO

Implementación en Frontend:

// app-config.ts
const moduleVisibility = {
  'org-chart': ['ADMIN_GLOBAL'],  // Solo este rol
};

// app.component.html
<nav *ngIf="auth.isSupervisor() || auth.isAdmin()">
  <!-- Solo mostrar si ADMIN_GLOBAL -->
  <a *ngIf="auth.isAdminGlobal()" href="/org-chart">
    Estructura Organizacional
  </a>
</nav>
```

---

### Módulo: "Nómina"

```
¿Quién puede verlo?
├─ ADMIN_GLOBAL: ✅ SÍ (todos los sueldos, consolidados)
├─ GERENTE_SUCURSAL: ❌ NO (información financiera sensible)
├─ EMPLEADO_SUPERVISOR: ❌ NO
└─ EMPLEADO: ✅ SÍ (SOLO su propia nómina)

Implementación:

// nomina/nomina.component.ts
get recibos() {
  const rol = this.auth.getRole();
  
  if (rol === 'ADMIN_GLOBAL') {
    // Ver todos
    return this.api.getNominaGlobal();
  } else if (rol === 'EMPLEADO') {
    // Ver solo propia
    return this.api.getNominaPropia();
  } else {
    // Otros roles: acceso denegado
    this.router.navigate(['/acceso-denegado']);
  }
}
```

---

### Módulo: "Reportes"

```
Acceso por rol:

ADMIN_GLOBAL:
├─ Reporte Global de Asistencia
├─ Reporte de Nómina Consolidada
├─ Reporte de Productividad por Empresa
├─ Reporte de Ausencias Totales
└─ Auditoría de Accesos

GERENTE_SUCURSAL:
├─ Reporte de Asistencia (su sucursal)
├─ Reporte de Tareas Completadas (su equipo)
├─ Reporte de Ausencias (su sucursal)
└─ Reporte de Productividad (su sucursal)

EMPLEADO_SUPERVISOR:
├─ Reporte de Tareas (su equipo)
└─ Reporte de Productividad (su equipo)

EMPLEADO:
└─ ❌ NO puede ver reportes

Implementación:
// reportes.component.ts
get reportesDisponibles() {
  const rol = this.auth.getRole();
  
  const disponibles = {
    'ADMIN_GLOBAL': [...10 tipos de reportes],
    'GERENTE_SUCURSAL': [...4 tipos de reportes],
    'EMPLEADO_SUPERVISOR': [...2 tipos de reportes],
    'EMPLEADO': [],  // Vacío
  };
  
  return disponibles[rol] || [];
}
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Juan crea Solicitud de Vacaciones

```
Escenario Real:
─────────────
Juan es EMPLEADO en Sucursal Quito
Gerente de Quito: Ricardo (GERENTE_SUCURSAL)
RRHH: Sofía (ADMIN_GLOBAL)

Paso 1: Juan entra a la aplicación
└─ Ve botón: "Solicitar Ausencia"

Paso 2: Juan crea solicitud
├─ Tipo: Vacaciones
├─ Del: 23 de enero
├─ Al: 26 de enero
└─ Presiona: "Crear Solicitud"

Paso 3: Backend ejecuta
────────────────────

from core.workflows import enrutar_solicitud_ausencia

solicitud = SolicitudAusencia.objects.create(
    empleado=juan,
    tipo='VACACION',
    fecha_inicio='2026-01-23',
    fecha_fin='2026-01-26',
    estado='PENDIENTE_GERENTE'
)

# Signal automáticamente:
@receiver(post_save, sender=SolicitudAusencia)
def on_create(sender, instance, created, **kwargs):
    if created:
        # 1. Obtener gerente responsable
        gerente = obtener_gerente_responsable(juan)
        # gerente = Ricardo
        
        # 2. Asignar a gerente
        instance.aprobador_asignado = ricardo
        instance.save()
        
        # 3. Crear notificación
        crear_notificacion(
            usuario=ricardo.usuario,
            titulo='Nueva Solicitud de Ausencia',
            mensaje='Juan Pérez solicita vacaciones (23-26 ene)',
            tipo='SOLICITUD_AUSENCIA',
            datos={'solicitud_id': instance.id}
        )

Paso 4: Ricardo (Gerente) ve notificación
├─ Entra a módulo "Solicitudes"
├─ Ve: "Juan Pérez - Vacaciones 23-26 enero - PENDIENTE"
└─ Presiona: "Ver Detalles"

Paso 5: Ricardo APRUEBA
────────────────────

from core.workflows import aprobar_solicitud_ausencia

exito, mensaje = aprobar_solicitud_ausencia(
    solicitud=solicitud,
    aprobador=ricardo,
    comentarios='Aprobado. Buen desempeño este año.'
)

Backend:
├─ Estado cambia: APROBADA_GERENTE
├─ Asigna a Sofía (ADMIN_GLOBAL) para revisión
├─ Notifica a Sofía: "Ricardo aprobó solicitud de Juan"
└─ Notifica a Juan: "Tu gerente aprobó tu solicitud"

Paso 6: Sofía (RRHH) revisa y APRUEBA FINALMENTE
──────────────────────────────────────────────

exito, mensaje = aprobar_solicitud_ausencia(
    solicitud=solicitud,
    aprobador=sofia,
    comentarios='Confirmado. Reservar fechas en calendario.'
)

Backend:
├─ Estado cambia: APROBADA_FINAL
├─ Cierra solicitud
├─ Notifica a Juan: "✅ Tu solicitud fue aprobada finalmente"
├─ Notifica a Ricardo: "Solicitud de Juan confirmada"
└─ Sistema automáticamente:
   ├─ Ajusta saldo de vacaciones: -4 días
   └─ Bloquea esas fechas en asistencia
```

---

### Ejemplo 2: Intento de Acceso No Autorizado

```
Escenario: Pedro (GERENTE_SUCURSAL de Loja) intenta ver empleados de Quito

Paso 1: Pedro accede
└─ GET /api/empleados/?sucursal=quito

Paso 2: Backend valida permisos (2 capas)
────────────────────────────────────────

# Capa 1: Validación de acción
if not tiene_permiso(pedro, 'empleados', 'leer'):
    return 403  # Pero SÍ puede leer (empleados)

# Capa 2: Validación de RLS (Row-Level Security)
queryset = filter_queryset_por_rol(
    queryset=Empleado.objects.all(),
    user=pedro,
    modelo=Empleado
)

# Código en rbac_avanzado.py:
if empleado.rol == 'GERENTE_SUCURSAL':
    queryset = queryset.filter(
        empresa=empleado.empresa,
        sucursal=empleado.sucursal  # <-- AQUÍ
    )

# Pedro.sucursal = "Loja"
# queryset = empleados de "Loja" únicamente

Paso 3: Pedro recibe respuesta
────────────────────────────

GET /api/empleados/?sucursal=quito

Response: 
{
  "count": 0,
  "results": [],  // VACÍO
  "message": "0 empleados encontrados"
}

Pedro cree: "No hay empleados en Quito"
Realidad: "Hay 50 en Quito, pero no puedes verlos"

✅ SEGURIDAD: Datos protegidos sin mensaje de "acceso denegado"
```

---

### Ejemplo 3: Validación en Cascada

```
Caso: Carlos (EMPLEADO_SUPERVISOR) intenta crear tarea para empleado de otra sucursal

Paso 1: Carlos intenta crear
├─ Asignar a: Lucia (EMPLEADO de Guayaquil)
├─ Sucursal: Quito (la de Carlos)
└─ Presiona: "Crear"

Paso 2: Backend valida
────────────────────

from core.workflows import validar_puede_crear_tarea

puede, motivo = validar_puede_crear_tarea(
    creador=carlos,           # EMPLEADO_SUPERVISOR de Quito
    asignado_a=lucia,         # EMPLEADO de Guayaquil
    sucursal_destino=quito
)

# Lógica:
if creador.rol == 'EMPLEADO_SUPERVISOR':
    # ¿Está en el mismo departamento?
    if asignado_a.departamento != creador.departamento:
        return False, 'Lucia no está en tu departamento'

puede = False
motivo = 'Lucia es de Guayaquil, no puedes asignarle tareas'

Paso 3: Respuesta al usuario
──────────────────────────

Response 400:
{
  "error": "Validación fallida",
  "detalle": "Lucia es de Guayaquil, no puedes asignarle tareas",
  "campo": "asignado_a"
}

Carlos ve: "No puedo asignar a Lucia"
```

---

## 🛠️ Guía de Implementación

### Paso 1: Actualizar Modelos de Empleado

```python
# personal/models.py

class Empleado(models.Model):
    ROLES = [
        ('ADMIN_GLOBAL', 'Administrador Global (RRHH)'),
        ('GERENTE_SUCURSAL', 'Gerente de Sucursal'),
        ('EMPLEADO_SUPERVISOR', 'Empleado Supervisor'),
        ('EMPLEADO', 'Empleado'),
    ]
    
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    nombres = models.CharField(max_length=150)
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE)
    sucursal = models.ForeignKey(Sucursal, on_delete=models.SET_NULL, null=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True)
    rol = models.CharField(max_length=20, choices=ROLES, default='EMPLEADO')
```

### Paso 2: Usar RLS Mixin en ViewSets

```python
# core/views.py

from core.rbac_avanzado import RLSQuerySetMixin, require_permission

class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    
    @require_permission('empleados', 'crear')
    def create(self, request):
        return super().create(request)

class SolicitudAusenciaViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
    queryset = SolicitudAusencia.objects.all()
    
    def create(self, request):
        # Automáticamente enruta al gerente correcto
        solicitud = super().create(request)
        return solicitud
```

### Paso 3: Frontend - Controlar Visibilidad

```typescript
// auth.service.ts

isAdminGlobal(): boolean {
  return this.getRole() === 'ADMIN_GLOBAL';
}

isGerenteSucursal(): boolean {
  return this.getRole() === 'GERENTE_SUCURSAL';
}

isSupervisor(): boolean {
  return this.getRole() === 'EMPLEADO_SUPERVISOR';
}

// app.component.html

<nav *ngIf="auth.isAdminGlobal()">
  <a routerLink="/org-chart">Estructura Organizacional</a>
</nav>

<nav *ngIf="auth.isAdminGlobal() || auth.isGerenteSucursal() || auth.isSupervisor()">
  <a routerLink="/reportes">Reportes</a>
</nav>
```

---

## 📋 Resumen de Cambios

### Antes (Inseguro)
```
❌ Todos ven todos los datos
❌ GERENTE_SUCURSAL ve empleados de otras sucursales
❌ Las solicitudes se pierden
❌ Módulo Org Chart accesible para todos
❌ Sin validaciones cruzadas
```

### Después (Seguro)
```
✅ Row-Level Security automática
✅ GERENTE_SUCURSAL solo ve su sucursal (RLS)
✅ Solicitudes se enrutan automáticamente a aprobador correcto
✅ Módulo Org Chart solo para ADMIN_GLOBAL
✅ Validaciones en 2 capas (backend + frontend)
✅ Auditoría de intentos de acceso
✅ Restricciones UI inteligentes
✅ Workflows de aprobación claros
```

---

**Documentación Completa**  
Enero 23, 2026  
Arquitecto Senior de Seguridad
