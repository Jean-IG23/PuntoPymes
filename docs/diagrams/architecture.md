# Diagrama de Arquitectura - PUNTOPYMES

```mermaid
%% Arquitectura general - N-Tier + SaaS Multi-Tenant
flowchart LR
  subgraph CLIENTES [Frontend - Presentación]
    A[Angular SPA
    - Components
    - Routes
    - Services]
  end

  subgraph API [API / Gateway]
    B[REST API (Django DRF)
    - Auth (JWT)
    - Serializers
    - ViewSets]
  end

  subgraph LOGICA [Lógica de Negocio]
    C[Services / Use Cases
    - Reglas de negocio
    - RBAC
    - Multitenancy filters]
  end

  subgraph DATAACCESS [Acceso a Datos]
    D[Django ORM
    - Managers
    - QuerySets
    - Transacciones]
  end

  subgraph DB [Persistencia]
    E[(PostgreSQL)]
  end

  subgraph INFRA [Infraestructura]
    LB[Load Balancer]
    REDIS[Redis - Cache / Sessions]
    S3[S3-compatible Storage]
    EMAIL[SMTP / SendGrid]
    MON[Monitoring & Logs]
  end

  subgraph SAAS [Multi-Tenant]
    TENANT[Datos aislados por empresa_id]
  end

  A --> |HTTP/HTTPS| LB
  LB --> B
  B --> C
  C --> D
  D --> E

  B --> REDIS
  B --> S3
  B --> EMAIL
  B --> MON

  E --- TENANT
  D --- TENANT
  C --- TENANT

  style CLIENTES fill:#f3f9ff,stroke:#0366d6
  style API fill:#f0fff4,stroke:#12a44b
  style LOGICA fill:#fff7e6,stroke:#d97706
  style DATAACCESS fill:#fff0f6,stroke:#be185d
  style DB fill:#f7f7f7,stroke:#111827
  style INFRA fill:#f8fafc,stroke:#64748b
  style SAAS fill:#fef3c7,stroke:#b45309

  classDef component fill:#ffffff,stroke:#999,stroke-width:1px;
```

## Notas (texto simple)
- Frontend: `Angular` (componentes standalone), consume la API vía JWT.
- API: `Django + DRF` expone endpoints REST, aplica autenticación y permisos.
- Lógica: Servicios que implementan reglas (ej. cálculo de nómina, horas extras).
- Acceso a datos: Django ORM con managers y filtros multitenancy (por `empresa_id`).
- Persistencia: `PostgreSQL` con backups y migraciones.
- Infra: Load balancer, Redis para cache/sesiones, S3 para archivos, servicio de email y monitoreo.
- Multi-Tenant: Datos separados lógicamente por `empresa_id` (mismo esquema/DB).

Si quieres, genero también un diagrama de despliegue (containers, pods, regiones) o un diagrama de secuencia para el flujo "Registrar asistencia".
