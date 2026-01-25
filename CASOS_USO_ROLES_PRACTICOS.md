# 📊 JERARQUÍA DE ROLES - CASOS DE USO PRÁCTICOS

## 🎯 Esquema Visual de Jerarquía

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 SUPERADMIN (Nivel 5)                                        │
│  ├─ Owner de la Plataforma SaaS                                 │
│  ├─ Acceso Total sin Restricciones                              │
│  └─ Puede gestionar múltiples empresas clientes                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  🟠 ADMIN (Nivel 4)                                             │
│  ├─ Cliente/Dueño de la Empresa                                 │
│  ├─ Administrador Total de su Empresa                           │
│  └─ Puede delegar a RRHH y Gerentes                             │
└─────────────────────────────────────────────────────────────────┘
                    ↙──────────────────────↖
    ┌─────────────────────────────┐   ┌──────────────────────┐
    │  🟡 RRHH (Nivel 3)          │   │  🟢 GERENTE (Nivel 2)│
    │  ├─ Gestión de RRHH         │   │  ├─ Líder de Área    │
    │  ├─ Nómina                  │   │  ├─ Supervisión      │
    │  └─ Empleados               │   │  └─ Equipo           │
    └─────────────────────────────┘   └──────────────────────┘
                    ↙────────────────────────↖
    ┌──────────────────────────────────────────────────────────┐
    │  🔵 EMPLEADO (Nivel 1)                                   │
    │  ├─ Colaborador                                          │
    │  ├─ Solo datos propios                                   │
    │  └─ Tareas y Asistencia personal                         │
    └──────────────────────────────────────────────────────────┘
```

---

## 📋 TABLA COMPARATIVA RÁPIDA

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Dashboard KPI** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear Empleado** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar Configuración** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver Asistencia General** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Aprobar Tareas** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Aprobar Ausencias** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Crear Tareas** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver Tareas Asignadas** | ✅ | ✅ | ✅ | ✅* | ✅** |
| **Marcar Asistencia** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver Nómina Propia** | ✅ | ✅ | ✅ | ✅ | ✅ |

*Solo de su equipo/sucursal  
**Solo las propias

---

## 🔍 CASOS DE USO DETALLADOS

### CASO 1: Mateo (SUPERADMIN)

```
Rol: SUPERADMIN
Empresa: Todas
Acceso: Global

Puede hacer:
  ✅ Crear nueva empresa cliente
  ✅ Asignar licencias SaaS
  ✅ Ver dashboard de ALL empresas
  ✅ Ver nómina de cualquier empleado
  ✅ Auditar cualquier acción en el sistema
  ✅ Crear/editar/eliminar usuarios
  ✅ Ver reportes consolidados

Casos de uso:
  • Crear una nueva empresa: "Tienda ABC S.A."
    - Crear empresa
    - Crear usuario admin (email: admin@abcstore.com)
    - Crear sucursal matriz
    
  • Monitorear salud de clientes
    - Ver dashboard multi-empresa
    - Validar licencias activas
    - Resolver problemas técnicos
```

---

### CASO 2: Juan (ADMIN - Dueño de Tienda ABC)

```
Rol: ADMIN
Empresa: Tienda ABC S.A.
Alcance: 1 empresa, múltiples sucursales

Puede hacer:
  ✅ Contratar empleados
  ✅ Crear sucursales
  ✅ Crear departamentos
  ✅ Configurar nómina
  ✅ Ver asistencia de todos
  ✅ Aprobar vacaciones/ausencias
  ✅ Crear tareas y aprobarlas
  ✅ Ver reportes de su empresa

No puede hacer:
  ❌ Crear otra empresa
  ❌ Ver datos de otras empresas
  ❌ Gestionar licencias

Casos de uso:
  • Contratar nuevo empleado
    - Crear empleado con rol EMPLEADO
    - Asignar sucursal y departamento
    - Sistema envía credenciales
    
  • Abrir nueva sucursal
    - Crear sucursal "Centro"
    - Crear departamentos en esa sucursal
    - Asignar gerente para esa sucursal
    
  • Configurar nómina
    - Editar valores base (AFP, ISAPRE, etc)
    - Aplicar a toda la empresa
```

---

### CASO 3: María (RRHH)

```
Rol: RRHH
Empresa: Tienda ABC S.A.
Alcance: 1 empresa completa (mismo que ADMIN pero sin config)

Puede hacer:
  ✅ Crear/editar empleados
  ✅ Crear tipos de ausencia
  ✅ Ver configuración de nómina
  ✅ Procesar ausencias/vacaciones
  ✅ Crear y asignar tareas
  ✅ Aprobar tareas del equipo
  ✅ Importar empleados en lote

No puede hacer:
  ❌ Editar empresa/sucursal
  ❌ Ver/editar nómina
  ❌ Crear nuevas configuraciones

Casos de uso:
  • Procesar vacaciones
    - Empleado solicita 15 días
    - María valida saldo
    - María aprueba/rechaza
    - Sistema actualiza saldo
    
  • Importar 50 empleados
    - Descarga plantilla Excel
    - Carga datos de todos
    - Sistema crea automáticamente
    - Envía credenciales a todos
    
  • Crear tipos de ausencia
    - Añade "Licencia por Enfermedad"
    - Configura duración máxima
    - Los empleados pueden usarla
```

---

### CASO 4: Carlos (GERENTE - Jefe de Ventas)

```
Rol: GERENTE
Empresa: Tienda ABC S.A.
Sucursal: Sucursal Centro
Equipo: 15 empleados en Ventas

Puede ver/hacer:
  ✅ Listar empleados de su sucursal
  ✅ Ver asistencia de su equipo (no empresa entera)
  ✅ Crear tareas para su equipo
  ✅ Aprobar/rechazar tareas del equipo
  ✅ Aprobar ausencias del equipo (15 días max)
  ✅ Ver productividad de su área
  ✅ Marcar su propia asistencia

No puede ver/hacer:
  ❌ Empleados de otras sucursales
  ❌ Nómina
  ❌ Crear empleados
  ❌ Editar configuración
  ❌ Tareas creadas por RRHH (solo las suyas)

Casos de uso:
  • Supervisar equipo
    - Ve 15 empleados de su sucursal
    - Crea tarea: "Vender 100 artículos"
    - Asigna a 3 mejores vendedores
    - Aprueba cuando completen
    
  • Aprobar ausencia
    - Empleado solicita ausentarse viernes
    - Carlos ve la solicitud (solo su equipo)
    - Aprueba si tiene cobertura
    - Rechaza si necesita ese día
    
  • Seguimiento diario
    - Ve gráfico de asistencia (su sucursal)
    - Ve ranking de vendedores
    - Identifica empleados con problemas
```

---

### CASO 5: Pedro (EMPLEADO - Vendedor)

```
Rol: EMPLEADO
Empresa: Tienda ABC S.A.
Sucursal: Centro
Equipo: Ventas (bajo Carlos)

Puede ver/hacer:
  ✅ Marcar entrada/salida
  ✅ Ver su propia asistencia
  ✅ Ver tareas asignadas
  ✅ Completar sus tareas
  ✅ Solicitar ausencias
  ✅ Ver su nómina
  ✅ Completar sus objetivos

No puede ver/hacer:
  ❌ Empleados de otra sucursal
  ❌ Tareas de otros vendedores
  ❌ Asistencia de otros
  ❌ Nómina de otros
  ❌ Crear o editar configuraciones

Casos de uso:
  • Día laboral típico
    - Llega a tienda: "Marcar entrada" (09:00)
    - Ve 3 tareas asignadas por Carlos
    - Completa venta: "Marcar tarea como hecha"
    - Sale: "Marcar salida" (18:00)
    - Sistema registra 9 horas
    
  • Solicitar vacaciones
    - Solicita 5 días en Diciembre
    - Carlos ve la solicitud
    - Carlos aprueba
    - Sistema actualiza su saldo
    
  • Consultar su desempeño
    - Ve gráfico de tareas completadas
    - Ve objetivos mensuales
    - Ve posición en ranking (si existe)
```

---

## 🔐 REGLAS DE ACCESO A DATOS

### Regla 1: Filtrado por Empresa
```
SUPERADMIN → Todas las empresas
ADMIN      → Su empresa solamente
RRHH       → Su empresa solamente
GERENTE    → Su sucursal solamente
EMPLEADO   → Solo sus datos
```

### Regla 2: Filtrado por Sucursal
```
SUPERADMIN → Todas las sucursales
ADMIN      → Todas las sucursales de su empresa
RRHH       → Todas las sucursales de su empresa
GERENTE    → Solo su sucursal asignada
EMPLEADO   → Solo su sucursal asignada
```

### Regla 3: Filtrado por Usuario
```
SUPERADMIN → Todos los datos
ADMIN      → Todos en su empresa
RRHH       → Todos en su empresa
GERENTE    → Equipo en su sucursal
EMPLEADO   → Solo los propios
```

---

## 🚀 EJEMPLOS DE LLAMADAS A API

### ✅ PERMITIDO: ADMIN ve empleados de su empresa
```
GET /api/empleados/?empresa=1
Resultado: Todos los empleados de empresa 1
```

### ❌ DENEGADO: ADMIN intenta ver empresa diferente
```
GET /api/empleados/?empresa=2
Resultado: 403 Forbidden - "No tienes acceso a esa empresa"
```

### ✅ PERMITIDO: GERENTE crea tarea
```
POST /api/tareas/
Body: { titulo: "Vender 10 items", asignado_a: 5 }
Resultado: 201 Created - Tarea creada
```

### ❌ DENEGADO: EMPLEADO intenta crear tarea
```
POST /api/tareas/
Body: { titulo: "...", asignado_a: 5 }
Resultado: 403 Forbidden - "Solo ADMIN, RRHH, GERENTE pueden crear tareas"
```

### ✅ PERMITIDO: RRHH aprueba ausencia
```
POST /api/ausencias/123/aprobar/
Resultado: 200 OK - Ausencia aprobada
```

### ❌ DENEGADO: GERENTE aprueba ausencia fuera de su equipo
```
POST /api/ausencias/456/aprobar/  (empleado de otra sucursal)
Resultado: 403 Forbidden - "Solo puedes aprobar ausencias de tu equipo"
```

---

## 📱 VISIBILIDAD EN FRONTEND

### Dashboard (Home)
```
SUPERADMIN → Ve módulos SaaS + todos los módulos
ADMIN      → Ve Dashboard Admin + Gestión
RRHH       → Ve Dashboard RRHH + Gestión Personal
GERENTE    → Ve Dashboard Gerente + Tareas
EMPLEADO   → Ve Reloj Digital + Mis Tareas
```

### Menú de Navegación
```
SUPERADMIN:
  ├─ SaaS
  │  ├─ Empresas
  │  └─ Licencias
  ├─ Gestion
  │  ├─ Personal
  │  └─ Configuracion
  └─ Dashboard

ADMIN:
  ├─ Gestion
  │  ├─ Personal
  │  ├─ Configuracion
  │  ├─ Tareas
  │  └─ Ausencias
  └─ Dashboard

RRHH:
  ├─ Personal
  ├─ Tareas
  ├─ Nómina
  └─ Dashboard

GERENTE:
  ├─ Mi Equipo
  ├─ Tareas
  └─ Dashboard

EMPLEADO:
  ├─ Reloj
  ├─ Mis Tareas
  └─ Mi Asistencia
```

---

## ✅ VALIDACIÓN DE IMPLEMENTACIÓN

Para cada módulo/endpoint, verificar:

- [ ] ¿Quién debería tener acceso?
- [ ] ¿Qué datos ve cada rol?
- [ ] ¿Qué acciones puede hacer?
- [ ] ¿Cómo se filtran los datos?
- [ ] ¿Hay excepciones por sucursal/equipo?
- [ ] ¿Está documentado el caso de uso?

---

## 🔄 FLUJO DE VERIFICACIÓN

```
Solicitud llega → ¿Es SuperUser? 
                   ├─ SÍ → Permitir todo
                   └─ NO → Obtener empleado
                           ¿Rol en lista permitida?
                           ├─ SÍ → Filtrar datos según rol
                           └─ NO → 403 Forbidden
```
