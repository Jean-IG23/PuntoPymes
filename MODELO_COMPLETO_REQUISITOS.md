#  MODELO COMPLETO DE REQUISITOS DE SOFTWARE

---

##  TABLA DE CONTENIDOS GENERAL

1. [Introducción y Contexto](#1-introducción-y-contexto)
2. [Requisitos Funcionales](#2-requisitos-funcionales)
3. [Requisitos No Funcionales](#3-requisitos-no-funcionales)
4. [Restricciones y Limitaciones](#4-restricciones-y-limitaciones)
5. [Suposiciones y Dependencias](#5-suposiciones-y-dependencias)
6. [Criterios de Aceptación](#6-criterios-de-aceptación)
7. [Matriz de Trazabilidad](#7-matriz-de-trazabilidad)

---

## 1. INTRODUCCIÓN Y CONTEXTO

### 1.1 Propósito del Documento
Este documento define todos los requisitos del sistema **TalentTrack**, incluyendo funcionales, no funcionales, restricciones, suposiciones y dependencias.

---

## 2. REQUISITOS FUNCIONALES

### 2.1 Definición
Los requisitos funcionales **describen qué hace el sistema**, las funciones y características que debe proporcionar.

### 2.2 Formato Estándar
```
RF [MÓDULO].[GRUPO].[NÚMERO] - [Descripción Clara]

Descripción Detallada:
- Precondiciones: ¿Qué debe pasar antes?
- Acciones: ¿Qué hace el sistema?
- Resultado Esperado: ¿Cuál es el resultado?
- Roles Involucrados: ¿Quién ejecuta?
- Excepciones: ¿Qué pasa si falla?
```

### 2.3 Estructura por Módulos

#### MÓDULO 1: AUTENTICACIÓN Y AUTORIZACIÓN

**RF 1.1.1 - Login con Email y Contraseña**
- **Precondiciones**: Usuario existe en sistema
- **Acciones**: 
  1. Ingresa email y contraseña
  2. Sistema valida contra BD
  3. Genera token JWT
  4. Retorna token + datos de usuario
- **Resultado**: Token en localStorage, usuario autenticado
- **Excepciones**: Credenciales inválidas → Error 401
- **Roles**: Todos

**RF 1.1.2 - Validación de Token en Peticiones API**
- **Precondiciones**: Usuario tiene token válido
- **Acciones**: 
  1. Cliente envía "Authorization: Bearer {token}"
  2. Sistema valida firma del token
  3. Verifica expiración
- **Resultado**: Petición autorizada
- **Excepciones**: Token inválido/expirado → Error 401
- **Roles**: Todos

**RF 1.2.1 - Detección Automática de Rol**
- **Precondiciones**: Usuario logueado
- **Acciones**:
  1. Lee tabla Empleado asociada
  2. Obtiene campo `rol`
  3. Retorna al frontend
- **Resultado**: UI se adapta según rol
- **Roles**: Todos

**RF 1.3.1 - Cierre de Sesión**
- **Precondiciones**: Usuario logueado
- **Acciones**:
  1. Frontend elimina token de localStorage
  2. Opcionalmente: Backend agrega token a blacklist
  3. Redirige a /login
- **Resultado**: Sesión terminada
- **Roles**: Todos

**RF 1.4.1 - Recuperación de Contraseña**
- **Precondiciones**: Usuario existe
- **Acciones**:
  1. Ingresa contraseña antigua
  2. Ingresa contraseña actual
  3. Se verifica que la contraseña antigua sea la correcta
  4. Se procede hacer el cambio
- **Resultado**: Contraseña actualizada
- **Excepciones**: No se habilita el botón de cambio de contraseñas
- **Roles**: todos

#### MÓDULO 2: GESTIÓN DE EMPLEADOS

**RF 2.1.1 - Crear Empleado**
- **Precondiciones**: Usuario es ADMIN/RRHH
- **Campos**:
  - Nombre, Apellido (requeridos)
  - Email (único, formato válido)
  - Teléfono
  - Documento (cédula/DNI)
  - Dirección
  - Foto (JPG/PNG, max 5MB)
  - Empresa (requerido)
  - Sucursal (requerido)
  - Departamento
  - Puesto (requerido)
  - Turno
  - Rol (default EMPLEADO)
  - Fecha Ingreso
  - Salario Base (si ADMIN)
- **Validaciones**:
  - Email único en la empresa
  - Documento único global
  - Archivo imagen válido
- **Resultado**: Empleado creado, cuenta activada, envía email de bienvenida
- **Roles**: ADMIN, RRHH

**RF 2.1.2 - Listar Empleados con Filtros**
- **Precondiciones**: Usuario logueado
- **Acciones**:
  1. Obtiene lista según permisos 
  2. Aplica filtros: empresa, sucursal, departamento, rol, estado
  3. Paginación 
  4. Ordenamiento: nombre, fecha ingreso, etc.
- **Resultado**: Lista filtrada en 
- **Roles**: ADMIN, RRHH, GERENTE 

**RF 2.1.3 - Editar Empleado**
- **Precondiciones**: Usuario es ADMIN/RRHH O empleado editando sus datos
- **Campos Editables**:
  - Según rol: algunos campos solo ADMIN
  - Empleado: solo datos propios no sensibles
- **Validaciones**: 
  - Email único (excepto el suyo)
  - Documento único
- **Resultado**: Datos actualizados, log de auditoría
- **Roles**: ADMIN, RRHH, EMPLEADO (limitado)

**RF 2.1.4 - Eliminar Empleado (Soft Delete)**
- **Precondiciones**: Usuario es ADMIN
- **Acciones**:
  1. Marca `deleted_at` con fecha/hora actual
  2. Mantiene datos en BD
  3. Excluye de listas normales
- **Resultado**: Empleado inactivo, recuperable
- **Roles**: ADMIN

**RF 2.2.1 - Asignar Rol a Empleado**
- **Precondiciones**: Usuario es ADMIN
- **Roles disponibles**: ADMIN, RRHH, GERENTE, EMPLEADO
- **Validaciones**:
  - GERENTE: debe tener sucursal
  - Si se asigna GERENTE a sucursal con gerente: demover anterior
- **Resultado**: Rol actualizado, auditoría registrada
- **Roles**: ADMIN, SUPERADMIN

**RF 2.3.1 - Subir Foto de Perfil**
- **Precondiciones**: Usuario es el empleado O ADMIN/RRHH
- **Acciones**:
  1. Valida: JPG/PNG
  2. Genera nombre único
  3. Guarda en `/media/empleados/`
  4. Actualiza BD con ruta
- **Resultado**: Foto disponible en `/media/empleados/{uuid}.jpg`
- **Excepciones**: Archivo no válido
- **Roles**: ADMIN, RRHH, EMPLEADO

#### MÓDULO 3: GESTIÓN DE ASISTENCIA

**RF 3.1.1 - Registrar Entrada**
- **Precondiciones**: 
  - Empleado logueado
  - Ubicación GPS disponible
  - No hay entrada sin salida previa
- **Acciones**:
  1. Obtiene GPS actual
  2. Valida que está dentro de radio de sucursal (500m default)
  3. Crea registro AsistenciaIn
  4. Guarda: timestamp, lat/lon, IP
- **Resultado**: Entrada registrada, notificación enviada
- **Excepciones**: Fuera de rango → Advertencia pero registra
- **Roles**: EMPLEADO, GERENTE, RRHH, ADMIN

**RF 3.1.2 - Registrar Salida**
- **Precondiciones**:
  - Tiene entrada
- **Acciones**:
  1. Obtiene GPS actual
  2. Crea registro AsistenciaOut
  3. Calcula horas trabajadas
  4. Detecta ausencias/atrasos
- **Resultado**: Salida registrada, horas calculadas
- **Roles**: EMPLEADO, GERENTE, RRHH, ADMIN

**RF 3.2.1 - Ver Historial de Asistencia**
- **Precondiciones**: Usuario logueado
- **Filtros**:
  - Rango de fechas
  - Empleado (si ADMIN/RRHH/GERENTE)
  - Sucursal
- **Resultado**: Tabla con entradas/salidas, horas, atrasos
- **Roles**: ADMIN, RRHH, GERENTE (su sucursal), EMPLEADO (solo él)

**RF 3.3.1 - Reportes de Asistencia**
- **Formatos**: PDF, Excel, CSV
- **Información**:
  - Horas trabajadas diarias
  - Atrasos, salidas tempranas
  - Resumen mensual
  - Tendencias por empleado/departamento
- **Roles**: ADMIN, RRHH, GERENTE

#### MÓDULO 4: GESTIÓN DE TAREAS

**RF 4.1.1 - Crear Tarea**
- **Precondiciones**: Usuario es GERENTE/RRHH/ADMIN
- **Campos**:
  - Título (requerido)
  - Descripción
  - Asignado a (Empleado, requerido)
  - Prioridad (Baja, Media, Alta)
  - Fecha Vencimiento
  - Estado (Pendiente, En Progreso, Completada, Cancelada)
  - Archivo adjunto (opcional)
- **Validaciones**:
  - Empleado existe
  - Fecha vencimiento ≥ hoy
- **Resultado**: Tarea creada, notificación al empleado
- **Roles**: ADMIN, RRHH, GERENTE

**RF 4.1.2 - Asignar Tarea a Empleado**
- **Precondiciones**: Tarea existe, empleado existe
- **Acciones**:
  1. Valida permisos (gerente solo su sucursal)
  2. Asigna tarea
  3. Envía notificación email/en-app
- **Resultado**: Tarea visible en "Mi Bandeja" del empleado
- **Roles**: ADMIN, RRHH, GERENTE

**RF 4.2.1 - Actualizar Estado de Tarea**
- **Estados permitidos**:
  - Pendiente → En Progreso
  - En Progreso → Completada / Pendiente
  - Completada → Pendiente (si admin)
  - X → Cancelada (solo admin)
- **Precondiciones**:
  - Empleado actualiza propia tarea
  - O ADMIN/RRHH/GERENTE
- **Resultado**: Estado actualizado, auditoría
- **Roles**: ADMIN, RRHH, GERENTE, EMPLEADO (propia tarea)

**RF 4.3.1 - Reportes de Tareas**
- **Métricas**:
  - Tareas completadas vs vencidas
  - Productividad por empleado
  - Cargas de trabajo
  - Tiempos promedio
- **Roles**: ADMIN, RRHH, GERENTE

#### MÓDULO 5: GESTIÓN DE OBJETIVOS

**RF 5.1.1 - Crear Objetivo**
- **Precondiciones**: Usuario es ADMIN/RRHH
- **Campos**:
  - Título (requerido)
  - Descripción
  - Asignado a (Empleado o Departamento)
  - Meta (cantidad, % o descripción)
  - Fecha Inicio / Fin
  - Peso (% para cálculo de desempeño)
  - Métrica de éxito
- **Resultado**: Objetivo visible para empleado
- **Roles**: ADMIN, RRHH

**RF 5.2.1 - Seguimiento de Objetivo**
- **Acciones**:
  - Empleado carga progreso
  - RRHH/ADMIN revisa
  - Se calcula % completado
- **Resultado**: Progreso registrado
- **Roles**: ADMIN, RRHH, EMPLEADO

**RF 5.3.1 - Evaluación de Desempeño**
- **Precondiciones**: Período de objetivos terminado
- **Acciones**:
  1. Calcula cumplimiento por objetivo
  2. Genera score de desempeño (0-100)
  3. Permite retroalimentación
- **Resultado**: Evaluación registrada, score calculado
- **Roles**: ADMIN, RRHH

#### MÓDULO 6: GESTIÓN DE NÓMINA

**RF 6.1.1 - Crear Nómina Mensual**
- **Precondiciones**: Mes no tiene nómina, ADMIN/RRHH
- **Acciones**:
  1. Obtiene todos empleados activos
  2. Calcula:
     - Salario base
     - Horas extras
     - Deducciones (impuestos, seguro)
     - Bonificaciones
     - Ausencias descuentadas
  3. Genera documento
- **Resultado**: Nómina creada, detalle por empleado
- **Roles**: ADMIN, RRHH

**RF 6.2.1 - Calcular Horas Extras**
- **Precondiciones**: Mes con datos de asistencia
- **Cálculo**:
  - Horas: Total horas - (8 horas × días trabajados)
  - Si > 0: Horas extras
  - Tarifa: Según configuración (1.25x, 1.5x, etc.)
- **Resultado**: Monto calculado automáticamente
- **Roles**: Sistema (automático)

**RF 6.3.1 - Descargar Recibo de Nómina**
- **Precondiciones**: 
  - Nómina existe
  - Empleado es él O ADMIN
- **Formatos**: PDF, XML
- **Contenido**:
  - Período
  - Conceptos de pago
  - Deducciones
  - Neto
  - Firma digital
- **Resultado**: Archivo descargable
- **Roles**: ADMIN, RRHH, EMPLEADO

---

## 3. REQUISITOS NO FUNCIONALES

### 3.1 Rendimiento (Performance)

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Tiempo de Respuesta** | < 200ms en 95% de peticiones | UX acceptable |
| **Búsquedas** | < 500ms con 10,000 registros | Usabilidad |
| **Reportes** | Generación < 30s | No frustración |
| **Carga de Página** | < 3s inicio, < 1.5s navegación | Velocidad web |
| **Concurrencia** | 1000+ usuarios simultáneos | SaaS escalable |
| **Throughput API** | 500+ req/seg | Carga típica |

### 3.2 Disponibilidad y Confiabilidad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Uptime** | 99.5% mensual (SLA) | Producción crítica |
| **Backup** | Diario, retenido 90 días | Recuperación |
| **RTO** | < 1 hora | Tiempo recuperación |
| **RPO** | < 15 minutos | Pérdida datos máxima |
| **Disaster Recovery** | Plan documentado | Continuidad |

### 3.3 Seguridad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Autenticación** | JWT + 2FA opcional | Protección acceso |
| **Autorización** | RBAC + aislamiento multitenancy | Control granular |
| **Encriptación** | HTTPS/TLS 1.2+, datos sensibles encriptados | Tránsito + reposo |
| **Contraseñas** | Hash PBKDF2 + salt | Estándar OWASP |
| **CORS** | Configurado restrictivo | Protección XSS |
| **SQL Injection** | ORM Django, queries parametrizadas | Prevención |
| **Auditoría** | Log de cambios + quién + cuándo | Trazabilidad |
| **GDPR** | Derecho al olvido, exportación datos | Cumplimiento |

### 3.4 Escalabilidad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Base de Datos** | Sharding por empresa (opcional) | Miles de empresas |
| **API** | Stateless, loadbalancer compatible | Horizontal scaling |
| **Storage** | Cloud (S3 compatible) | Crecimiento ilimitado |
| **Caché** | Redis para sesiones/tokens | Rendimiento |

### 3.5 Usabilidad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Responsive** | Funcional en móvil/tablet/desktop | Múltiples dispositivos |
| **Accesibilidad** | WCAG 2.1 AA mínimo | Inclusión |
| **Idiomas** | Español, Inglés (i18n) | Mercados |
| **Documentación** | User Guide + Video tutorials | Adopción |
| **Onboarding** | Wizard para nuevas empresas | Facilidad uso |

### 3.6 Mantenibilidad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Código** | Clean Code, DRY, SOLID | Largo plazo |
| **Testing** | 80%+ cobertura, CI/CD | Calidad |
| **Documentación** | API docs (Swagger/OpenAPI) | Mantenimiento |
| **Versionamiento** | Semantic versioning | Control cambios |
| **Logs** | Estructurados, archivados | Debugging |

### 3.7 Compatibilidad

| Aspecto | Requisito | Justificación |
|---------|-----------|---------------|
| **Navegadores** | Chrome, Firefox, Safari, Edge últimas 2 versiones | Cobertura |
| **OS Mobile** | iOS 12+, Android 6+ | Mercado |
| **Servidores** | Linux (Ubuntu 20.04+) | Estándar |
| **Python** | 3.9+ | Moderno |
| **Django** | 4.2 LTS | Estable |

---

## 4. RESTRICCIONES Y LIMITACIONES

### 4.1 Restricciones Técnicas

| Restricción | Detalles |
|-------------|----------|
| **Framework** | Django 4.2+ (no cambiar) |
| **Base de Datos** | PostgreSQL 12+ |
| **Frontend** | React 18+ |
| **Autenticación** | Obligatoria JWT |
| **Multitenancy** | Obligatoria por empresa |
| **Almacenamiento Archivos** | Solo en servidor/cloud (no en BD) |

### 4.2 Restricciones de Negocio

| Restricción | Detalles |
|-------------|----------|
| **Eliminación Datos** | Solo soft delete (GDPR) |
| **Cambio Rol** | GERENTE automatiza democión anterior |
| **Salarios** | Solo ADMIN puede ver todos |
| **Nómina** | No editable si ya aprobada |
| **Multi-Empresa** | Un usuario = una empresa |

### 4.3 Limitaciones Conocidas

| Limitación | Impacto | Mitigación |
|-----------|--------|-----------|
| Reportes muy grandes | Timeout | Filtros, paginación |
| GPS impreciso indoor | Asistencia manual | Opción manual + registro |
| Integraciones limitadas | Datos manuales | API public próxima versión |
| Sincronización offline | Dependencia online | PWA planeada v3 |

---

## 5. SUPOSICIONES Y DEPENDENCIAS

### 5.1 Suposiciones

| Suposición | Validez | Riesgo |
|-----------|---------|--------|
| Usuarios tienen email válido | Alta | Bajo: validación en registro |
| GPS funciona en móvil | Media | Medio: fallback manual |
| Internet disponible siempre | Media | Medio: próxima versión offline |
| Huso horario por sucursal | Alta | Bajo: configurable |
| Calendario laboral estándar | Alta | Medio: configurable |
| Empleados colaborativos | Media | Medio: auditoría |

### 5.2 Dependencias Externas

| Dependencia | Tipo | Criticidad | Plan B |
|-------------|------|-----------|--------|
| Google Maps API | Externo | Alta | Fallback manual |
| Servicio Email (SendGrid) | Externo | Alta | Fallback SMTP |
| PostgreSQL | Infraestructura | Crítica | Backup automático |
| AWS S3 | Storage | Alta | Storage local |
| DNS | Infraestructura | Crítica | Redundancia |

### 5.3 Dependencias Internas

| Dependencia | Módulo | Criticidad |
|-------------|--------|-----------|
| Módulo Auth | Todos | Crítica |
| Módulo Empleados | Asistencia, Tareas, Nómina | Crítica |
| Módulo Asistencia | Nómina, Reportes | Alta |
| Módulo Empresa | Todos | Crítica |

---

## 6. CRITERIOS DE ACEPTACIÓN

### 6.1 Criterios Generales

```
Aceptación General:
✓ Código sin errores de compilación/sintaxis
✓ Todas las pruebas unitarias pasan (80%+ cobertura)
✓ Todas las pruebas de integración pasan
✓ Sin warnings críticos en linter
✓ Documentación completa y actualizada
✓ Aprobación de Stakeholder/Product Owner
✓ Cumple SLAs de rendimiento
✓ Auditoría de seguridad pasada
```

### 6.2 Criterios por Tipo de Requisito

#### Requisitos Funcionales
- Feature está completamente implementada
- Casos de uso principales funcionan
- Validaciones correctas
- Manejo de errores apropiado
- Mensajes de usuario claros

#### Requisitos No Funcionales
- Métrica medida y dentro de límite
- Herramientas de monitoreo activas
- Plan de mejora si aplica

#### Restricciones
- Código respeta límites técnicos
- Documentación refleja restricciones
- No hay workarounds sin aprobación

---


