# 📊 DIAGRAMAS MERMAID ADICIONALES - PUNTOPYMES

## 1️⃣ Diagrama Entidad-Relación (ER) Detallado

```mermaid
erDiagram
    EMPRESA ||--o{ SUCURSAL : tiene
    EMPRESA ||--o{ AREA : define
    EMPRESA ||--o{ PUESTO : define
    EMPRESA ||--o{ TURNO : define
    EMPRESA ||--o{ EMPLEADO : contrata
    EMPRESA ||--o{ TIPO_AUSENCIA : define
    EMPRESA ||--o{ KPI : define
    EMPRESA ||--o{ DOCUMENTO_EMPLEADO : gestiona
    EMPRESA ||--o{ CONTRATO : registra
    EMPRESA ||--o{ EVENTO_ASISTENCIA : registra
    EMPRESA ||--o{ JORNADA : registra
    EMPRESA ||--o{ SOLICITUD_AUSENCIA : gestiona
    EMPRESA ||--o{ TAREA : asigna
    EMPRESA ||--o{ OBJETIVO : asigna
    EMPRESA ||--o{ EVALUACION_DESEMPENO : realiza
    EMPRESA ||--|| CONFIGURACION_NOMINA : tiene

    SUCURSAL ||--o{ DEPARTAMENTO : contiene
    SUCURSAL ||--o{ EMPLEADO : "ubica"
    SUCURSAL |o--|| EMPLEADO : responsable
    
    AREA ||--o{ DEPARTAMENTO : "clasifica"
    AREA ||--o{ PUESTO : "categoriza"
    
    DEPARTAMENTO ||--o{ EMPLEADO : "asigna"
    
    PUESTO ||--o{ EMPLEADO : "define_cargo"
    
    TURNO ||--o{ EMPLEADO : "asigna_a"
    
    USER ||--|| EMPLEADO : "autentica"
    
    EMPLEADO ||--o{ DOCUMENTO_EMPLEADO : "posee"
    EMPLEADO ||--o{ CONTRATO : "tiene"
    EMPLEADO ||--o{ EVENTO_ASISTENCIA : "marca"
    EMPLEADO ||--o{ JORNADA : "genera"
    EMPLEADO ||--o{ SOLICITUD_AUSENCIA : "solicita"
    EMPLEADO ||--o{ TAREA : "asignado_a"
    EMPLEADO ||--o{ OBJETIVO : "tiene"
    EMPLEADO ||--o{ EVALUACION_DESEMPENO : "evaluado"
    EMPLEADO |o--o{ SOLICITUD_AUSENCIA : "aprueba"
    EMPLEADO |o--o{ JORNADA : "edita"
    
    TIPO_AUSENCIA ||--o{ SOLICITUD_AUSENCIA : "clasifica"
    
    SOLICITUD_AUSENCIA ||--o{ JORNADA : "justifica"
    
    EVENTO_ASISTENCIA ||--o{ JORNADA : "consolida"
    
    TAREA ||--o{ EVALUACION_DESEMPENO : "afecta"
    
    KPI ||--o{ EVALUACION_DESEMPENO : "usado_en"
    KPI ||--o{ DETALLE_EVALUACION : "usado_en"
    
    OBJETIVO ||--o{ EVALUACION_DESEMPENO : "mide"
    
    EVALUACION_DESEMPENO ||--o{ DETALLE_EVALUACION : "contiene"
    
    USER ||--o{ TAREA : "crea"
    USER ||--o{ TAREA : "revisa"
    USER ||--o{ NOTIFICACION : "recibe"
```

---

## 2️⃣ Diagrama de Flujo de Datos

```mermaid
graph TD
    A[👤 Usuario Login] -->|Credenciales| B[🔐 Autenticación]
    B -->|Token JWT| C[📱 App Principal]
    
    C -->|GET/POST| D[🔌 API REST Django]
    
    D --> E[👥 Módulo Empleados]
    D --> F[⏱️ Módulo Asistencia]
    D --> G[📋 Módulo Tareas]
    D --> H[🗓️ Módulo Ausencias]
    D --> I[🎯 Módulo Objetivos/KPI]
    D --> J[💰 Módulo Nómina]
    D --> K[🏢 Módulo Estructura]
    
    E -->|Validar RBAC| L[🛡️ Permisos]
    F -->|Validar RBAC| L
    G -->|Validar RBAC| L
    H -->|Validar RBAC| L
    I -->|Validar RBAC| L
    J -->|Validar RBAC| L
    K -->|Validar RBAC| L
    
    L -->|Filtrar QuerySet| M[(🗄️ PostgreSQL)]
    
    E -->|Crud Empleado| M
    F -->|Eventos + Jornadas| M
    G -->|Crear/Actualizar| M
    H -->|Solicitudes| M
    I -->|Objetivos + Evaluaciones| M
    J -->|Cálculos + Nóminas| M
    K -->|Estructura Org| M
    
    M -->|Datos Filtrados| D
    D -->|JSON Response| C
    C -->|Render UI| N[🎨 Angular Frontend]
    
    F -->|GPS + Foto| O[📸 Almacenamiento<br/>Multimedia]
    E -->|Foto Perfil| O
    G -->|Evidencias| O
    K -->|Logo Empresa| O
```

---

## 3️⃣ Diagrama de Aislamiento Multi-Tenant

```mermaid
graph LR
    CLIENT1["👨‍💼 Cliente 1<br/>Empresa A<br/>id=1"]
    CLIENT2["👨‍💼 Cliente 2<br/>Empresa B<br/>id=2"]
    CLIENT3["👨‍💼 Cliente 3<br/>Empresa C<br/>id=3"]
    
    API["🔌 API REST<br/>Django"]
    
    CLIENT1 -->|Token + empresa_id| API
    CLIENT2 -->|Token + empresa_id| API
    CLIENT3 -->|Token + empresa_id| API
    
    API -->|Validar empresa_id| RBAC["🛡️ RBAC<br/>Permisos"]
    
    RBAC -->|Filter QuerySet<br/>WHERE empresa_id=1| DB1["Empleados<br/>Sucursales<br/>Jornadas<br/>Tareas<br/>...<br/>de Empresa 1"]
    RBAC -->|Filter QuerySet<br/>WHERE empresa_id=2| DB2["Empleados<br/>Sucursales<br/>Jornadas<br/>Tareas<br/>...<br/>de Empresa 2"]
    RBAC -->|Filter QuerySet<br/>WHERE empresa_id=3| DB3["Empleados<br/>Sucursales<br/>Jornadas<br/>Tareas<br/>...<br/>de Empresa 3"]
    
    style DB1 fill:#e1f5e1
    style DB2 fill:#e1e5f5
    style DB3 fill:#f5e1e1
    
    DB1 -->|Datos aislados| CLIENT1
    DB2 -->|Datos aislados| CLIENT2
    DB3 -->|Datos aislados| CLIENT3
```

---

## 4️⃣ Diagrama de Estados - Solicitud de Ausencia

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    
    PENDIENTE -->|Empleado solicita| PENDIENTE: (esperar revisión)
    PENDIENTE -->|Editar| PENDIENTE: (si aún está pendiente)
    PENDIENTE -->|Cancelar| [*]: (si es empleado)
    
    PENDIENTE -->|RRHH aprueba| APROBADA: actualizar saldo
    APROBADA -->|Cambiar estado Jornada| APROBADA: a JUSTIFICADA
    APROBADA -->|Notificar empleado| [*]
    
    PENDIENTE -->|RRHH rechaza| RECHAZADA: con motivo
    RECHAZADA -->|Notificar empleado| [*]
    
    note right of PENDIENTE
        • Validar saldo (si VACACIONES)
        • Rango de fechas válido
        • No duplicar ausencias
    end note
    
    note right of APROBADA
        • Decrementar saldo_vacaciones
        • Cambiar jornadas a JUSTIFICADA
        • Registrar auditoría
    end note
```

---

## 5️⃣ Diagrama de Estados - Tarea

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE
    
    PENDIENTE -->|Empleado comienza| EN_PROGRESO: "click 'Comenzar'"
    EN_PROGRESO -->|Empleado finaliza| EN_REVISION: "click 'Completar'"
    
    EN_REVISION -->|Supervisor aprueba| COMPLETADA: sumar puntos
    COMPLETED --> [*]: notificar empleado
    
    EN_REVISION -->|Supervisor rechaza| RECHAZADA: con motivo
    RECHAZADA -->|Empleado reintenta| EN_PROGRESO: "click 'Reabrir'"
    
    PENDIENTE -->|Eliminar| [*]: si es creador + PENDIENTE
    
    note right of EN_REVISION
        • Esperar aprobación
        • Supervisor puede rechazar
        • Dar feedback
    end note
    
    note right of COMPLETADA
        • Empleado gana puntos_valor
        • Se suma a ranking
        • Aparece en evaluación
    end note
```

---

## 6️⃣ Diagrama de Estados - Jornada

```mermaid
stateDiagram-v2
    [*] --> ABIERTA
    
    ABIERTA -->|Evento ENTRADA| ABIERTA: esperando SALIDA
    ABIERTA -->|Evento SALIDA| CERRADA: calcular horas
    
    ABIERTA -->|Fin de día sin SALIDA| ERROR: "Sin evento de salida"
    
    CERRADA -->|Validar geolocalización| CERRADA: dentro de radio
    CERRADA -->|Fuera de rango| CERRADA: alertar pero registrar
    
    CERRADA -->|Solicitud ausencia aprobada| JUSTIFICADA: actualizar
    CERRADA -->|Falta injustificada| AUSENTE: sin justificación
    
    CERRADA -->|Editar jornada| CERRADA: (auditoría manual)
    
    JUSTIFICADA -->|Impactar en nómina| JUSTIFICADA: si afecta_sueldo
    AUSENTE -->|Descontar sueldo| AUSENTE: cálculo automático
    
    ERROR -->|Corrección manual| CERRADA: (RRHH edita)
    
    note right of CERRADA
        • Calcular horas_trabajadas
        • Calcular horas_extras
        • Detectar atrasos
        • Registrar editado_por si manual
    end note
```

---

## 7️⃣ Diagrama de Permisos RBAC

```mermaid
graph TD
    SUPERADMIN["⭐ SUPERADMIN<br/>Nivel 5"]
    ADMIN["🔒 ADMIN<br/>Nivel 4<br/>(Cliente/Dueño)"]
    RRHH["👔 RRHH<br/>Nivel 3<br/>(Gestión Operativa)"]
    GERENTE["👨‍💼 GERENTE<br/>Nivel 2<br/>(Sucursal)"]
    EMPLEADO["👤 EMPLEADO<br/>Nivel 1<br/>(Colaborador)"]
    
    SUPERADMIN -->|todos los permisos| ADMIN
    ADMIN -->|empresa completa| RRHH
    RRHH -->|sin crear empresa| GERENTE
    GERENTE -->|solo sucursal| EMPLEADO
    
    SUPERADMIN -.->|Crear empresa| EMPRESA["Empresas"]
    ADMIN -.->|Crear sucursal| SUCURSAL["Sucursales"]
    RRHH -.->|Crear empleado| EMPLEADOS["Empleados"]
    RRHH -.->|Gestionar tareas| TAREAS["Tareas"]
    GERENTE -.->|Ver sucursal| ASISTENCIA["Asistencia"]
    EMPLEADO -.->|Ver propios datos| PERFIL["Mi Perfil"]
    
    EMPLEADO -.->|Marcar entrada| GPS["GPS + Foto"]
    EMPLEADO -.->|Solicitar ausencia| VACACIONES["Solicitudes"]
    EMPLEADO -.->|Actualizar avance| OBJETIVOS["Mis Objetivos"]
```

---

## 8️⃣ Diagrama de Cálculo de Nómina

```mermaid
graph LR
    EMC["📋 Empleado"] -->|Buscar jornadas| JOR["Jornadas<br/>del mes"]
    
    JOR -->|Sumar| HT["Horas<br/>Trabajadas"]
    JOR -->|Calcular| HE["Horas<br/>Extras"]
    JOR -->|Sumar| ATR["Atrasos<br/>minutos"]
    JOR -->|Contar| FAL["Faltas<br/>completas"]
    
    HT -->|÷ divisor| VH["Valor<br/>Hora"]
    
    HE -->|diurna × 1.5<br/>nocturna × 2.0| HEV["Valor<br/>HE"]
    
    ATR -->|minutos × vh| ATRD["Descto<br/>Atrasos"]
    FAL -->|días × (sb/30)| FALD["Descto<br/>Faltas"]
    
    EMC -->|Sueldo base| SB["Sueldo<br/>Base"]
    
    SB -->|aplica| NETO1["Sueldo Base"]
    HEV -->|aplica| NETO2["+ Horas Extras"]
    ATRD -->|aplica| NETO3["- Atrasos"]
    FALD -->|aplica| NETO4["- Faltas"]
    
    AUS["Ausencias<br/>afecta_sueldo"] -->|restar| NETO5["- Ausencias"]
    BON["Tareas<br/>completadas"] -->|sumar| NETO6["+ Bonificaciones"]
    
    NETO1 --> FINAL["💰 SUELDO NETO"]
    NETO2 --> FINAL
    NETO3 --> FINAL
    NETO4 --> FINAL
    NETO5 --> FINAL
    NETO6 --> FINAL
    
    FINAL -->|Generar| PDF["📄 Recibo PDF"]
```

---

## 9️⃣ Diagrama de Jerarquía Organizacional

```mermaid
graph TD
    EMPRESA["🏢 EMPRESA<br/>(Raíz)"]
    
    EMPRESA --> MATRIZ["🏪 Sucursal Matriz<br/>(es_matriz=true)"]
    EMPRESA --> SUCURSAL2["🏪 Sucursal Centro"]
    EMPRESA --> SUCURSAL3["🏪 Sucursal Sur"]
    
    MATRIZ --> DPTO1["Departamento<br/>Administración"]
    MATRIZ --> DPTO2["Departamento<br/>Comercial"]
    
    SUCURSAL2 --> DPTO3["Departamento<br/>Logística"]
    
    DPTO1 --> AREA1["Área: Finanzas"]
    DPTO2 --> AREA2["Área: Ventas"]
    
    DPTO1 --> PUESTO1["Puesto:<br/>Contador"]
    DPTO1 --> PUESTO2["Puesto:<br/>Analista"]
    DPTO2 --> PUESTO3["Puesto:<br/>Vendedor"]
    
    DPTO1 --> TURNO1["Turno:<br/>Admin L-V<br/>08:00-17:00"]
    DPTO2 --> TURNO2["Turno:<br/>Comercial L-S<br/>flexible"]
    
    TURNO1 --> EMP1["👤 Juan (Contador)<br/>RRHH"]
    TURNO1 --> EMP2["👤 María (Analista)<br/>EMPLEADO"]
    TURNO2 --> EMP3["👤 Carlos (Vendedor)<br/>EMPLEADO"]
    
    MATRIZ --> GERENTE1["👨‍💼 Gerente Matriz<br/>(GERENTE)"]
    SUCURSAL2 --> GERENTE2["👨‍💼 Gerente Centro<br/>(GERENTE)"]
    
    style EMPRESA fill:#fff4e6
    style GERENTE1 fill:#e8f5e9
    style GERENTE2 fill:#e8f5e9
    style EMP1 fill:#e3f2fd
    style EMP2 fill:#f3e5f5
    style EMP3 fill:#fce4ec
```

---

## 🔟 Diagrama de Geolocalización (Asistencia)

```mermaid
graph LR
    EMPLEADO["👤 Empleado<br/>en App"]
    GPS["📍 GPS Device<br/>lat: 13.6929<br/>lng: -89.2182"]
    
    EMPLEADO -->|Solicita GPS| GPS
    GPS -->|Coordenadas| EVENTO["EventoAsistencia<br/>latitud: 13.6929<br/>longitud: -89.2182"]
    
    EVENTO -->|Calcular distancia| HAVERSINE["📐 Haversine Formula<br/>d = √Δlat² + Δlng²cos(lat)²"]
    
    SUCURSAL["🏪 Sucursal<br/>latitud: 13.6920<br/>longitud: -89.2175<br/>radio_metros: 50"]
    
    HAVERSINE -->|Comparar| VALIDAR{Distancia<br/>≤ radio?}
    
    VALIDAR -->|SÍ| EXITOSO["✅ EXITOSO<br/>Marcar entrada"]
    VALIDAR -->|NO| FALLO["⚠️ ALERTA<br/>Fuera de rango"]
    
    EXITOSO -->|Crear EventoAsistencia| BD1["Base de Datos<br/>exitoso=true"]
    FALLO -->|Crear EventoAsistencia| BD2["Base de Datos<br/>exitoso=false<br/>error_motivo"]
    
    style EXITOSO fill:#c8e6c9
    style FALLO fill:#ffcdd2
```

---

## 1️⃣1️⃣ Timeline de Procesos Paralelos

```mermaid
timeline
    title Procesos Simultáneos en Marcaje de Asistencia
    
    section Marcaje
        08:00 : Empleado llega
        08:01 : App solicita GPS
        08:02 : App toma foto
        08:03 : Envía POST /api/eventos-asistencia/
        
    section Backend
        08:03 : Recibe request
        08:04 : Validar token JWT
        08:05 : Validar geolocalización (Haversine)
        08:06 : Crear EventoAsistencia
        08:07 : Si hay entrada+salida anterior: crear Jornada
        08:08 : Calcular horas, atrasos, extras
        08:09 : Guardar en BD
        
    section Respuesta
        08:10 : Frontend recibe response
        08:10 : Mostrar confirmación: "Entrada registrada"
        08:11 : Mostrar hora exacta
```

---

*Diagramas Mermaid - PuntoPymes v2.0*  
*27 de Enero, 2026*
