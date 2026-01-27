# 🎨 DIAGRAMAS MERMAID - ARQUITECTURA PUNTOPYMES

Todos los diagramas aquí son **copy-paste ready** para:
- ✅ GitHub/GitLab (renderizado automático)
- ✅ VS Code (con Markdown Preview Enhanced)
- ✅ Mermaid Live Editor (mermaid.live)
- ✅ Dokumentación técnica

---

## 1️⃣ ARQUITECTURA EN CAPAS (N-Tier)

```mermaid
graph TD
    subgraph "CAPA 1: PRESENTACIÓN"
        WEB["🌐 Angular SPA<br/>(Components + Services)"]
        MOBILE["📱 Mobile<br/>(WebView/Native)"]
    end

    subgraph "CAPA 2: API / DISTRIBUCIÓN"
        LB["⚖️ Load Balancer<br/>(Nginx)"]
        DRF["🔵 Django REST Framework<br/>(Serializers + Validation)"]
        AUTH["🔐 JWT Authentication<br/>(Token validation)"]
        PERM["✅ RBAC Permissions<br/>(5 roles)"]
    end

    subgraph "CAPA 3: LÓGICA DE NEGOCIO"
        VIEWS["📋 ViewSets<br/>(Empleado, Asistencia, Tarea)"]
        SERVICES["⚙️ Business Services<br/>(Cálculos, Validaciones)"]
        SIGNALS["📢 Django Signals<br/>(Observers, Events)"]
    end

    subgraph "CAPA 4: ACCESO A DATOS"
        ORM["🗂️ Django ORM<br/>(Models + Managers)"]
        CACHE["⚡ Redis Cache<br/>(Query cache, Sessions)"]
    end

    subgraph "CAPA 5: PERSISTENCIA"
        DB["💾 PostgreSQL<br/>(Master)"]
        REPLICA["📊 Read Replica<br/>(Analytics)"]
    end

    WEB --> LB
    MOBILE --> LB
    LB --> DRF
    DRF --> AUTH
    DRF --> PERM
    PERM --> VIEWS
    VIEWS --> SERVICES
    SERVICES --> SIGNALS
    SIGNALS --> ORM
    ORM --> CACHE
    CACHE --> DB
    DB -.Analytics.-> REPLICA

    classDef layer1 fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef layer2 fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef layer3 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef layer4 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef layer5 fill:#fce4ec,stroke:#c2185b,stroke-width:2px

    class WEB,MOBILE layer1
    class LB,DRF,AUTH,PERM layer2
    class VIEWS,SERVICES,SIGNALS layer3
    class ORM,CACHE layer4
    class DB,REPLICA layer5
```

---

## 2️⃣ FLUJO DE UNA SOLICITUD HTTP COMPLETA

```mermaid
sequenceDiagram
    participant Client as 🌐 Cliente<br/>(Angular)
    participant LB as ⚖️ Load<br/>Balancer
    participant DRF as 🔵 Django<br/>REST
    participant Auth as 🔐 JWT<br/>Auth
    participant Serializer as 📦 Serializer
    participant ViewSet as 📋 ViewSet
    participant Model as 🗂️ Model
    participant DB as 💾 PostgreSQL

    Client->>LB: POST /api/empleados/<br/>Authorization: Bearer TOKEN
    LB->>DRF: Forward request
    DRF->>Auth: Extract & verify JWT
    Auth-->>DRF: Token válido
    DRF->>DRF: Check permissions (RBAC)
    DRF->>Serializer: Deserialize JSON
    Serializer->>Serializer: Validate data
    Serializer-->>DRF: ✓ Valid
    DRF->>ViewSet: create(serializer)
    ViewSet->>ViewSet: perform_create()
    ViewSet->>Model: save()
    Model->>Model: clean() validators
    Model->>DB: INSERT
    DB-->>Model: Success (ID)
    Model-->>ViewSet: Instance
    ViewSet->>Serializer: Serialize response
    Serializer-->>DRF: JSON
    DRF-->>LB: HTTP 201 Created
    LB-->>Client: Response JSON

    Note over Client,DB: Tiempo total: ~50-100ms
```

---

## 3️⃣ ARQUITECTURA MULTI-TENANT (Data Isolation)

```mermaid
graph TB
    subgraph "APLICACIÓN COMPARTIDA"
        APP["🔵 Django REST Framework<br/>(Una instancia)"]
    end

    subgraph "BASE DE DATOS ÚNICA"
        DB["💾 PostgreSQL<br/>(Una database)"]
    end

    subgraph "EMPRESA A"
        USER_A["👤 User A<br/>(empresa_id=1)"]
        DATA_A["📊 Datos A<br/>(empresa_id=1)"]
    end

    subgraph "EMPRESA B"
        USER_B["👤 User B<br/>(empresa_id=2)"]
        DATA_B["📊 Datos B<br/>(empresa_id=2)"]
    end

    subgraph "EMPRESA C"
        USER_C["👤 User C<br/>(empresa_id=3)"]
        DATA_C["📊 Datos C<br/>(empresa_id=3)"]
    end

    USER_A -->|request.user.empresa_id=1| APP
    USER_B -->|request.user.empresa_id=2| APP
    USER_C -->|request.user.empresa_id=3| APP

    APP -->|QuerySet.filter(empresa_id=1)| DATA_A
    APP -->|QuerySet.filter(empresa_id=2)| DATA_B
    APP -->|QuerySet.filter(empresa_id=3)| DATA_C

    DATA_A --> DB
    DATA_B --> DB
    DATA_C --> DB

    classDef enterprise fill:#e3f2fd,stroke:#1976d2
    classDef app fill:#fff3e0,stroke:#f57c00
    classDef data fill:#e8f5e9,stroke:#388e3c

    class USER_A,USER_B,USER_C,DATA_A,DATA_B,DATA_C enterprise
    class APP app
    class DB data

    Note over USER_A,DATA_C: Garantía: User A NUNCA ve datos de User B o C
```

---

## 4️⃣ FLUJO DE AUTENTICACIÓN Y AUTORIZACIÓN

```mermaid
graph LR
    Client["🌐 Cliente"]
    
    subgraph "1️⃣ AUTENTICACIÓN"
        Login["POST /api/login/"]
        Verify["Verify username<br/>& password"]
        Token["Generate JWT<br/>Token"]
    end

    subgraph "2️⃣ AUTORIZACIÓN"
        Request["Request + Token<br/>en header"]
        ValidateToken["Validate JWT<br/>signature"]
        LoadUser["Load User<br/>from payload"]
        CheckRole["Check Role<br/>(RBAC)"]
        CheckPerm["Check Permission<br/>for action"]
    end

    subgraph "3️⃣ DATA ISOLATION"
        FilterQS["Filter QuerySet<br/>by empresa_id"]
        Execute["Execute query<br/>safely"]
    end

    Client -->|username/pass| Login
    Login --> Verify
    Verify -->|✓ Correct| Token
    Token -->|JWT token| Client

    Client -->|API request + Token| Request
    Request --> ValidateToken
    ValidateToken -->|✓ Valid| LoadUser
    LoadUser --> CheckRole
    CheckRole -->|✓ Role OK| CheckPerm
    CheckPerm -->|✓ Permission OK| FilterQS
    FilterQS --> Execute
    Execute -->|✓ Success| Client

    style Login fill:#fff3e0
    style ValidateToken fill:#fff3e0
    style CheckRole fill:#f3e5f5
    style CheckPerm fill:#f3e5f5
    style FilterQS fill:#e8f5e9
```

---

## 5️⃣ MÁQUINA DE ESTADOS - SOLICITUD AUSENCIA

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE

    PENDIENTE -->|Empleado crea<br/>solicitud| PENDIENTE

    PENDIENTE -->|GERENTE/RRHH<br/>aprueba| APROBADA

    PENDIENTE -->|GERENTE/RRHH<br/>rechaza| RECHAZADA

    APROBADA -->|Se registra<br/>en nómina| JUSTIFICADA

    APROBADA -->|Se cancela| CANCELADA

    RECHAZADA --> [*]

    JUSTIFICADA --> [*]

    CANCELADA --> [*]

    note right of PENDIENTE
        Esperando revisión
        del supervisor
    end note

    note right of APROBADA
        Aprobada pero
        aún no en nómina
    end note

    note right of JUSTIFICADA
        Registrada en nómina
        Estado final
    end note
```

---

## 6️⃣ MÁQUINA DE ESTADOS - TAREA

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE

    PENDIENTE -->|Empleado inicia| EN_PROGRESO

    EN_PROGRESO -->|Marca como<br/>completada| REVISION

    REVISION -->|Reviewer<br/>aprueba| COMPLETADA

    REVISION -->|Reviewer<br/>rechaza| EN_PROGRESO

    COMPLETADA -->|Suma puntos| [*]

    note right of PENDIENTE
        Asignada pero no<br/>iniciada
    end note

    note right of EN_PROGRESO
        Siendo ejecutada
        por empleado
    end note

    note right of REVISION
        Esperando revisión
        del supervisor
    end note

    note right of COMPLETADA
        ✓ Aprobada<br/>+puntos_valor
    end note
```

---

## 7️⃣ MÁQUINA DE ESTADOS - JORNADA

```mermaid
stateDiagram-v2
    [*] --> ABIERTA

    ABIERTA -->|Entrada + Salida| CERRADA

    CERRADA -->|Si tiene error<br/>en GPS| ERROR

    CERRADA -->|Si empleado<br/>faltó| AUSENTE

    CERRADA -->|Si tiene<br/>justificante| JUSTIFICADA

    ERROR -->|Empleado carga<br/>justificante| JUSTIFICADA

    AUSENTE -->|Empleado carga<br/>justificante| JUSTIFICADA

    JUSTIFICADA --> [*]

    note right of ABIERTA
        Esperando
        marcaje de salida
    end note

    note right of CERRADA
        Entrada y salida
        registradas
    end note

    note right of ERROR
        Falló validación GPS
        Fuera de geofence
    end note
```

---

## 8️⃣ COMPONENTES DEL SISTEMA

```mermaid
graph TB
    subgraph "🔵 BACKEND (Django)"
        AUTH_MODULE["🔐 Autenticación<br/>(JWT, Login)"]
        EMP_MODULE["👥 Empleados<br/>(CRUD, Roles)"]
        AST_MODULE["⏱️ Asistencia<br/>(GPS, Jornadas)"]
        TASK_MODULE["✓ Tareas<br/>(Gamificación)"]
        ABS_MODULE["📋 Ausencias<br/>(Workflow)"]
        KPI_MODULE["📊 KPI/Objetivos<br/>(Evaluación)"]
        PAYROLL_MODULE["💰 Nómina<br/>(Cálculos)"]
        REPORT_MODULE["📈 Reportes<br/>(Analytics)"]
    end

    subgraph "🌐 FRONTEND (Angular)"
        DASHBOARD["📊 Dashboard"]
        EMP_FORM["👥 Formularios<br/>Empleados"]
        AST_MAP["🗺️ Mapa GPS"]
        TASK_UI["✓ Interfaz<br/>Tareas"]
        EVAL_UI["📊 Evaluaciones"]
    end

    subgraph "💾 DATOS"
        CACHE["⚡ Redis<br/>(Cache)"]
        DB["💾 PostgreSQL<br/>(BD Principal)"]
        REPLICA["📊 Replica<br/>(Read Only)"]
    end

    subgraph "📦 EXTERNOS"
        MAPS["🗺️ Google Maps<br/>(Geolocation)"]
        EMAIL["📧 Email<br/>(Notificaciones)"]
        STORAGE["📁 S3<br/>(Documentos)"]
    end

    DASHBOARD -.calls.-> AUTH_MODULE
    DASHBOARD -.calls.-> EMP_MODULE
    DASHBOARD -.calls.-> AST_MODULE
    
    EMP_FORM -.calls.-> EMP_MODULE
    AST_MAP -.calls.-> AST_MODULE
    AST_MAP -.calls.-> MAPS
    
    AUTH_MODULE --> CACHE
    EMP_MODULE --> CACHE
    AST_MODULE --> CACHE
    TASK_MODULE --> CACHE
    
    CACHE --> DB
    PAYROLL_MODULE --> DB
    REPORT_MODULE --> REPLICA
    
    AUTH_MODULE -.notify.-> EMAIL
    ABS_MODULE -.notify.-> EMAIL
    EMP_MODULE -.store.-> STORAGE

    classDef backend fill:#fff3e0,stroke:#f57c00
    classDef frontend fill:#e3f2fd,stroke:#1976d2
    classDef data fill:#e8f5e9,stroke:#388e3c
    classDef external fill:#fce4ec,stroke:#c2185b

    class AUTH_MODULE,EMP_MODULE,AST_MODULE,TASK_MODULE,ABS_MODULE,KPI_MODULE,PAYROLL_MODULE,REPORT_MODULE backend
    class DASHBOARD,EMP_FORM,AST_MAP,TASK_UI,EVAL_UI frontend
    class CACHE,DB,REPLICA data
    class MAPS,EMAIL,STORAGE external
```

---

## 9️⃣ FLUJO DE ASISTENCIA COMPLETO

```mermaid
graph TD
    A["👤 Empleado llega<br/>a sucursal"]
    B["📱 Abre app<br/>y marca entrada"]
    C["🗺️ App obtiene GPS<br/>(latitud, longitud)"]
    D["📸 Toma foto<br/>(selfie)"]
    E["🔐 Valida GPS<br/>(Haversine)"]
    
    E -->|❌ Fuera de<br/>geofence| F["❌ RECHAZA<br/>evento"]
    E -->|✅ Dentro de<br/>geofence| G["✅ ACEPTA<br/>evento"]
    
    F --> H["📊 EventoAsistencia<br/>(exitoso=false,<br/>error_motivo=...)"]
    G --> I["📊 EventoAsistencia<br/>(exitoso=true)"]
    
    H --> J["👤 Empleado<br/>sale de sucursal"]
    I --> J
    
    J --> K["📱 Marca SALIDA"]
    K --> L["🗺️ Valida GPS<br/>nuevamente"]
    
    L -->|❌ Error| M["❌ ERROR<br/>en salida"]
    L -->|✅ OK| N["✅ Salida<br/>registrada"]
    
    M --> O["🗂️ Dos eventos<br/>registrados<br/>(entrada, salida)"]
    N --> O
    
    O --> P["⚙️ Sistema<br/>consolida<br/>eventos"]
    P --> Q["📊 JORNADA<br/>(horas, atrasos,<br/>horas_extras)"]
    Q --> R["💰 Se usa en<br/>cálculo de<br/>nómina"]

    classDef client fill:#e3f2fd,stroke:#1976d2
    classDef validation fill:#fff3e0,stroke:#f57c00
    classDef success fill:#e8f5e9,stroke:#388e3c
    classDef error fill:#ffebee,stroke:#c62828
    classDef result fill:#f3e5f5,stroke:#7b1fa2

    class A,B,J,K client
    class C,D,E,L validation
    class G,I,N success
    class F,H,M error
    class O,P,Q,R result
```

---

## 🔟 CICLO DE NÓMINA

```mermaid
graph LR
    A["📅 Mes actual<br/>(Ej: Enero)"]
    B["⏱️ Recolectar<br/>jornadas"]
    C["📊 Calcular<br/>horas_trabajadas"]
    D["➕ Calcular<br/>horas_extras"]
    E["❌ Calcular<br/>atrasos"]
    F["💰 Aplicar<br/>sueldo base"]
    G["➕ Sumar<br/>HE diurna (1.5x)"]
    H["➕ Sumar<br/>HE nocturna (2.0x)"]
    I["➖ Restar<br/>descuentos"]
    J["📋 Generar<br/>nómina"]
    K["✅ Aprobar<br/>RRHH"]
    L["📊 Registrar<br/>en BD"]
    M["📧 Enviar<br/>empleados"]
    N["💳 Pagar<br/>salarios"]

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N

    classDef input fill:#e3f2fd,stroke:#1976d2
    classDef calc fill:#fff3e0,stroke:#f57c00
    classDef result fill:#e8f5e9,stroke:#388e3c
    classDef final fill:#f3e5f5,stroke:#7b1fa2

    class A input
    class B,C,D,E,F,G,H,I calc
    class J result
    class K,L,M,N final
```

---

## 1️⃣1️⃣ ESCALABILIDAD HORIZONTAL

```mermaid
graph TB
    subgraph "CLIENTES"
        C1["👤 Empresa 1"]
        C2["👤 Empresa 2"]
        C3["👤 Empresa 3"]
        CN["👤 Empresa N"]
    end

    subgraph "CAPA DE DISTRIBUCIÓN"
        LB["⚖️ Load Balancer<br/>(Nginx)<br/>Round-robin"]
    end

    subgraph "APLICACIONES (Stateless)"
        APP1["🔵 Django 1<br/>:8000"]
        APP2["🔵 Django 2<br/>:8001"]
        APP3["🔵 Django 3<br/>:8002"]
        APPN["🔵 Django N<br/>:800N"]
    end

    subgraph "CACHE"
        REDIS["⚡ Redis Cluster<br/>(Session Store,<br/>Query Cache)"]
    end

    subgraph "BASE DE DATOS"
        MASTER["💾 PostgreSQL Master<br/>(Write)"]
        READ1["📊 Read Replica 1"]
        READ2["📊 Read Replica 2"]
    end

    C1 --> LB
    C2 --> LB
    C3 --> LB
    CN --> LB

    LB --> APP1
    LB --> APP2
    LB --> APP3
    LB --> APPN

    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS
    APPN --> REDIS

    REDIS --> MASTER
    MASTER --> READ1
    MASTER --> READ2

    classDef client fill:#e3f2fd,stroke:#1976d2
    classDef lb fill:#fff3e0,stroke:#f57c00
    classDef app fill:#f3e5f5,stroke:#7b1fa2
    classDef cache fill:#fce4ec,stroke:#c2185b
    classDef db fill:#e8f5e9,stroke:#388e3c

    class C1,C2,C3,CN client
    class LB lb
    class APP1,APP2,APP3,APPN app
    class REDIS cache
    class MASTER,READ1,READ2 db

    Note over LB,APPN: Scale horizontalmente<br/>añadiendo más instancias
```

---

## 1️⃣2️⃣ SEGURIDAD EN CAPAS

```mermaid
graph TB
    Client["🌐 Cliente"]

    L1["🔒 CAPA 1: TRANSPORTE<br/>HTTPS/TLS 1.3<br/>Encriptación en tránsito"]
    L2["🔐 CAPA 2: AUTENTICACIÓN<br/>JWT Token<br/>Signature verification"]
    L3["✅ CAPA 3: AUTORIZACIÓN<br/>RBAC<br/>5 roles + permisos"]
    L4["✔️ CAPA 4: VALIDACIÓN<br/>Input validation<br/>Type checking"]
    L5["🛡️ CAPA 5: LÓGICA<br/>Business rules<br/>Custom validators"]
    L6["🔗 CAPA 6: INTEGRIDAD BD<br/>UNIQUE constraints<br/>FK relationships"]
    L7["🏢 CAPA 7: MULTI-TENANT<br/>QuerySet filtering<br/>empresa_id isolation"]
    L8["📝 CAPA 8: AUDITORÍA<br/>Event logging<br/>Forense audit trail"]

    DB[("💾 Base de Datos")]

    Client --> L1
    L1 --> L2
    L2 --> L3
    L3 --> L4
    L4 --> L5
    L5 --> L6
    L6 --> L7
    L7 --> L8
    L8 --> DB

    classDef secure fill:#e8f5e9,stroke:#388e3c,stroke-width:2px

    class L1,L2,L3,L4,L5,L6,L7,L8 secure
```

---

## 1️⃣3️⃣ ROLES Y PERMISOS (RBAC)

```mermaid
graph TD
    A["👤 Usuario"]
    
    A -->|Autenticarse| B["🔐 JWT Token"]
    B -->|Verificar| C{"¿Cuál es<br/>su ROL?"}
    
    C -->|SUPERADMIN| D["⭐ SUPERADMIN<br/>━━━━━━━<br/>✓ Todo acceso<br/>✓ Gestión global"]
    C -->|ADMIN| E["🏢 ADMIN<br/>━━━━━━━<br/>✓ Gestión empresa<br/>✓ Usuarios"]
    C -->|RRHH| F["👥 RRHH<br/>━━━━━━━<br/>✓ Empleados<br/>✓ Ausencias<br/>✓ Nómina"]
    C -->|GERENTE| G["📋 GERENTE<br/>━━━━━━━<br/>✓ Equipo asignado<br/>✓ Tareas<br/>✓ Reportes"]
    C -->|EMPLEADO| H["👤 EMPLEADO<br/>━━━━━━━<br/>✓ Datos propios<br/>✓ Asistencia<br/>✓ Tareas"]
    
    D --> I["CHECK: ¿Permiso<br/>para esta acción?"]
    E --> I
    F --> I
    G --> I
    H --> I
    
    I -->|✓ Sí| J["🟢 PERMITE<br/>acceso"]
    I -->|❌ No| K["🔴 DENIEGA<br/>acceso"]
    
    J --> L["Filter QuerySet<br/>by empresa_id"]
    L --> M["🗂️ Retorna datos<br/>seguros"]

    classDef super fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    classDef admin fill:#fce4ec,stroke:#c2185b,stroke-width:2px
    classDef middle fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef user fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    classDef success fill:#c8e6c9,stroke:#2e7d32
    classDef error fill:#ffcdd2,stroke:#c62828

    class D super
    class E admin
    class F,G middle
    class H user
    class J success
    class K error
```

---

## 1️⃣4️⃣ FLUJO DE DATOS COMPLETO

```mermaid
graph LR
    U["👤 Usuario"]
    APP["🌐 APP"]
    API["🔵 API REST"]
    PERM["✅ Permisos"]
    SER["📦 Serializer"]
    VIEW["📋 ViewSet"]
    SVC["⚙️ Service"]
    MODEL["🗂️ Model"]
    MGR["📊 Manager"]
    CACHE["⚡ Cache"]
    DB["💾 Database"]
    
    U -->|Input| APP
    APP -->|HTTP Request| API
    API -->|Verify Token| PERM
    PERM -->|Check Role| VIEW
    VIEW -->|Deserialize| SER
    SER -->|Validate| VIEW
    VIEW -->|Business Logic| SVC
    SVC -->|Query| MODEL
    MODEL -->|Custom Query| MGR
    MGR -->|Check Cache| CACHE
    CACHE -->|Miss| DB
    CACHE -->|Hit| MGR
    DB -->|Result| MGR
    MGR -->|Instances| MODEL
    MODEL -->|Data| SVC
    SVC -->|Result| VIEW
    VIEW -->|Serialize| SER
    SER -->|JSON| API
    API -->|HTTP Response| APP
    APP -->|Display| U

    classDef client fill:#e3f2fd
    classDef api fill:#fff3e0
    classDef logic fill:#f3e5f5
    classDef data fill:#e8f5e9
    classDef storage fill:#fce4ec

    class U,APP client
    class API,PERM api
    class SER,VIEW,SVC,MODEL,MGR logic
    class CACHE storage
    class DB storage
```

---

## 1️⃣5️⃣ MONITOREO Y LOGS

```mermaid
graph TB
    APP["🔵 Django<br/>Application"]
    
    subgraph "📝 LOGGING"
        LOG_AUTH["🔐 Auth Logs"]
        LOG_DB["💾 DB Queries"]
        LOG_ERROR["❌ Error Logs"]
        LOG_AUDIT["📋 Audit Trail"]
    end
    
    subgraph "📊 MONITOREO"
        METRICS["📈 Métricas<br/>(Prometheus)"]
        TRACES["🔍 Traces<br/>(Jaeger)"]
    end
    
    subgraph "🚨 ALERTAS"
        ALERTS["⚠️ Alert Manager"]
        EMAIL["📧 Notifications"]
    end
    
    APP --> LOG_AUTH
    APP --> LOG_DB
    APP --> LOG_ERROR
    APP --> LOG_AUDIT
    
    LOG_AUTH --> METRICS
    LOG_DB --> METRICS
    LOG_ERROR --> METRICS
    LOG_AUDIT --> METRICS
    
    METRICS --> TRACES
    TRACES --> ALERTS
    ALERTS --> EMAIL

    classDef logging fill:#fff3e0,stroke:#f57c00
    classDef monitoring fill:#e3f2fd,stroke:#1976d2
    classDef alerting fill:#ffebee,stroke:#c62828

    class LOG_AUTH,LOG_DB,LOG_ERROR,LOG_AUDIT logging
    class METRICS,TRACES monitoring
    class ALERTS,EMAIL alerting
```

---

## 📦 CÓMO USAR ESTOS DIAGRAMAS

### Opción 1: GitHub / GitLab
```
Copia el código mermaid
Pega en un archivo .md
Commit y push
GitHub/GitLab renderiza automáticamente ✅
```

### Opción 2: VS Code
```
Instala: "Markdown Preview Enhanced"
Ctrl+Shift+V para ver preview
Los diagramas se renderizan en tiempo real ✅
```

### Opción 3: Mermaid Live Editor
```
Ve a: mermaid.live
Pega el código
Edita y exporta como SVG/PNG ✅
```

### Opción 4: Documentación
```
Copia el código en archivo .md
Usa en Sphinx, Confluence, Notion, etc ✅
```

---

## 🎨 DIAGRAMA COMPLETO DEL SISTEMA

```mermaid
graph TB
    subgraph "USUARIOS"
        CEO["👔 CEO"]
        RRHH_USER["👥 RRHH"]
        GER["📋 Gerente"]
        EMP["👤 Empleados"]
    end

    subgraph "INTERFACE"
        WEB["🌐 Web App<br/>(Angular)"]
        MOBILE["📱 Mobile"]
    end

    subgraph "API GATEWAY"
        LB["⚖️ Load Balancer"]
        AUTH["🔐 JWT Auth"]
        RATE["🚦 Rate Limit"]
    end

    subgraph "BACKEND (Django)"
        EMP_API["👥 Empleados API"]
        AST_API["⏱️ Asistencia API"]
        TASK_API["✓ Tareas API"]
        PAYROLL_API["💰 Nómina API"]
        KPI_API["📊 KPI API"]
        REPORT_API["📈 Reportes API"]
    end

    subgraph "SERVICIOS"
        GPS["🗺️ GPS Service<br/>(Validación)"]
        EMAIL["📧 Email<br/>(Notificaciones)"]
        STORAGE["📁 File Storage<br/>(S3)"]
        TASK_QUEUE["⏰ Celery<br/>(Async Tasks)"]
    end

    subgraph "DATOS"
        CACHE["⚡ Redis"]
        DB["💾 PostgreSQL<br/>(Master)"]
        REPLICA["📊 Replica<br/>(Read)"]
    end

    subgraph "EXTERNOS"
        MAPS["🗺️ Google Maps"]
        MAIL_PROVIDER["📧 SendGrid/SMTP"]
    end

    CEO --> WEB
    RRHH_USER --> WEB
    GER --> WEB
    EMP --> MOBILE

    WEB --> LB
    MOBILE --> LB

    LB --> AUTH
    AUTH --> RATE

    RATE --> EMP_API
    RATE --> AST_API
    RATE --> TASK_API
    RATE --> PAYROLL_API
    RATE --> KPI_API
    RATE --> REPORT_API

    EMP_API --> STORAGE
    AST_API --> GPS
    PAYROLL_API --> TASK_QUEUE
    EMP_API --> EMAIL
    TASK_QUEUE --> EMAIL

    EMP_API --> CACHE
    AST_API --> CACHE
    TASK_API --> CACHE
    PAYROLL_API --> CACHE
    KPI_API --> CACHE

    CACHE --> DB
    PAYROLL_API --> DB
    REPORT_API --> REPLICA

    GPS --> MAPS
    EMAIL --> MAIL_PROVIDER

    classDef user fill:#e3f2fd
    classDef interface fill:#fff3e0
    classDef api fill:#f3e5f5
    classDef service fill:#fce4ec
    classDef data fill:#e8f5e9
    classDef external fill:#c8e6c9

    class CEO,RRHH_USER,GER,EMP user
    class WEB,MOBILE interface
    class LB,AUTH,RATE,EMP_API,AST_API,TASK_API,PAYROLL_API,KPI_API,REPORT_API api
    class GPS,EMAIL,STORAGE,TASK_QUEUE service
    class CACHE,DB,REPLICA data
    class MAPS,MAIL_PROVIDER external
```

---

**Todos los diagramas están listos para copiar y usar. Elige el que necesites y adaptalo a tu documentación.** 🎨✨
