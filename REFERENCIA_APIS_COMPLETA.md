# 🔌 REFERENCIA COMPLETA DE APIS REST

**PUNTOPYMES v2.0 - Endpoints y Especificaciones**

---

## 📍 BASE URL

```
Desarrollo:  http://127.0.0.1:8000/api/
Producción:  https://api.puntopymes.com/api/
```

## 🔐 AUTENTICACIÓN

### Login
```http
POST /api/login/
Content-Type: application/json

{
  "email": "admin@empresa.com",
  "password": "contraseña123"
}

Response (201):
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user_id": 1,
  "nombre": "Admin",
  "email": "admin@empresa.com",
  "rol": "ADMIN",
  "empresa_id": 1,
  "empresa_nombre": "Mi Empresa SAS"
}
```

### Headers Requeridos
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 👤 ENDPOINTS: EMPLEADOS

### Listar Empleados
```http
GET /api/empleados/?empresa=1&sucursal=2&rol=RRHH

Query Params (opcionales):
  - empresa (int): ID empresa
  - sucursal (int): ID sucursal
  - departamento (int): ID departamento
  - rol (string): ADMIN, RRHH, GERENTE, EMPLEADO
  - search (string): búsqueda por nombre/email
  - page (int): página (default: 1)
  - page_size (int): items por página (default: 20)

Response (200):
{
  "count": 125,
  "next": "http://api/empleados/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "nombres": "Juan",
      "apellidos": "Pérez",
      "email": "juan@empresa.com",
      "telefono": "+503 7123-4567",
      "documento": "12345678",
      "foto": "/media/empleados/juan_1.jpg",
      "empresa": 1,
      "empresa_nombre": "Mi Empresa",
      "sucursal": 2,
      "sucursal_nombre": "Sucursal Centro",
      "departamento": 5,
      "departamento_nombre": "Ventas",
      "puesto": 3,
      "puesto_nombre": "Vendedor",
      "rol": "EMPLEADO",
      "fecha_ingreso": "2023-01-15",
      "sueldo": "500.00",
      "es_mensualizado": true,
      "saldo_vacaciones": 12,
      "turno_asignado": 1,
      "turno_nombre": "Administrativo L-V",
      "estado": "ACTIVO"
    },
    ...
  ]
}
```

### Obtener Empleado
```http
GET /api/empleados/{id}/

Response (200):
{
  "id": 1,
  "nombres": "Juan",
  ... (mismos campos que arriba)
}
```

### Crear Empleado
```http
POST /api/empleados/
Content-Type: application/json

{
  "nombres": "Carlos",
  "apellidos": "López",
  "email": "carlos@empresa.com",
  "telefono": "+503 7987-6543",
  "direccion": "Calle Principal 123",
  "documento": "87654321",
  "empresa": 1,
  "sucursal": 2,
  "departamento": 5,
  "puesto": 3,
  "rol": "EMPLEADO",
  "fecha_ingreso": "2026-01-27",
  "sueldo": "550.00",
  "es_mensualizado": true,
  "saldo_vacaciones": 15,
  "turno_asignado": 1,
  "estado": "ACTIVO"
}

Response (201): Objeto empleado creado
```

### Actualizar Empleado
```http
PATCH /api/empleados/{id}/
Content-Type: application/json

{
  "sueldo": "600.00",
  "estado": "INACTIVO"
}

Response (200): Objeto actualizado
```

### Subir Foto de Perfil
```http
PATCH /api/empleados/{id}/
Content-Type: multipart/form-data

{
  "foto": <archivo>
}

Response (200): URL de la foto
```

### Eliminar Empleado
```http
DELETE /api/empleados/{id}/

Response (204): No Content
```

### Carga Masiva (Excel)
```http
POST /api/empleados/importar_excel/
Content-Type: multipart/form-data

{
  "archivo": <excel_file>
}

Response (200):
{
  "exitoso": 120,
  "errores": 5,
  "detalles": [
    {
      "fila": 45,
      "email": "juan@test.com",
      "error": "Email duplicado"
    },
    ...
  ]
}
```

---

## ⏱️ ENDPOINTS: ASISTENCIA

### Marcar Entrada/Salida
```http
POST /api/eventos-asistencia/
Content-Type: multipart/form-data

{
  "tipo": "ENTRADA",
  "latitud": "13.6929",
  "longitud": "-89.2182",
  "foto": <imagen>,
  "device_info": "Mozilla/5.0 (Android 12)"
}

Response (201):
{
  "id": 1,
  "empleado": 1,
  "tipo": "ENTRADA",
  "timestamp": "2026-01-27T08:15:00Z",
  "latitud": "13.6929",
  "longitud": "-89.2182",
  "foto": "/media/evidencia_asistencia/2026/01/entrada_001.jpg",
  "ip_address": "192.168.1.100",
  "device_info": "Mozilla/5.0 (Android 12)",
  "exitoso": true,
  "error_motivo": ""
}
```

### Listar Eventos
```http
GET /api/eventos-asistencia/?empleado=1&fecha_desde=2026-01-01&fecha_hasta=2026-01-31

Query Params:
  - empleado (int): ID empleado
  - fecha_desde (YYYY-MM-DD): inicio rango
  - fecha_hasta (YYYY-MM-DD): fin rango
  - tipo (string): ENTRADA, SALIDA
  - exitoso (boolean): true/false

Response (200): Lista de eventos
```

### Listar Jornadas Consolidadas
```http
GET /api/jornadas/?empleado=1&fecha_desde=2026-01-01&fecha_hasta=2026-01-31

Query Params:
  - empleado (int): ID empleado
  - sucursal (int): ID sucursal
  - estado (string): ABIERTA, CERRADA, AUSENTE, JUSTIFICADA, ERROR
  - fecha_desde, fecha_hasta: rango

Response (200):
{
  "count": 20,
  "results": [
    {
      "id": 1,
      "empleado": 1,
      "empleado_nombre": "Juan Pérez",
      "fecha": "2026-01-27",
      "entrada": "2026-01-27T08:00:00Z",
      "salida": "2026-01-27T17:00:00Z",
      "horas_trabajadas": "8.75",
      "horas_extras": "0.75",
      "minutos_atraso": 0,
      "es_atraso": false,
      "estado": "CERRADA",
      "es_manual": false,
      "observacion": "",
      "editado_por": null
    },
    ...
  ]
}
```

### Editar Jornada (Manual)
```http
PATCH /api/jornadas/{id}/
Content-Type: application/json

{
  "entrada": "2026-01-27T08:30:00Z",
  "salida": "2026-01-27T17:15:00Z",
  "observacion": "Permiso de 30 min para cita médica"
}

Response (200): Jornada actualizada
Note: Registra automáticamente editado_por=usuario_actual
```

---

## 📋 ENDPOINTS: TAREAS

### Crear Tarea
```http
POST /api/tareas/
Content-Type: application/json

{
  "titulo": "Actualizar reporte de ventas",
  "descripcion": "Consolidar datos de enero y enviar a gerencia",
  "asignado_a": 5,
  "fecha_limite": "2026-02-10T17:00:00Z",
  "prioridad": "ALTA",
  "empresa": 1,
  "puntos_valor": 5
}

Response (201): Tarea creada + notificación al empleado
```

### Listar Tareas
```http
GET /api/tareas/?estado=PENDIENTE&prioridad=ALTA&asignado_a=5

Query Params:
  - estado: PENDIENTE, EN_PROGRESO, EN_REVISION, COMPLETADA, RECHAZADA
  - prioridad: BAJA, MEDIA, ALTA, URGENTE
  - asignado_a (int): ID empleado
  - creado_por (int): ID usuario creador
  - empresa (int): ID empresa
  - date_desde, date_hasta: rango de creación

Response (200): Lista de tareas
```

### Actualizar Estado
```http
PATCH /api/tareas/{id}/
Content-Type: application/json

{
  "estado": "EN_REVISION"
}

Response (200): Tarea actualizada
```

### Rechazar Tarea
```http
PATCH /api/tareas/{id}/
Content-Type: application/json

{
  "estado": "RECHAZADA",
  "motivo_rechazo": "Los datos no están actualizados"
}

Response (200): Tarea rechazada + notificación
```

### Marcar Completada
```http
PATCH /api/tareas/{id}/
Content-Type: application/json

{
  "estado": "COMPLETADA",
  "completado_at": "2026-01-27T15:30:00Z"
}

Response (200): Tarea completada + suma de puntos
```

---

## 🗓️ ENDPOINTS: AUSENCIAS

### Solicitar Ausencia
```http
POST /api/solicitudes-ausencia/
Content-Type: application/json

{
  "tipo_ausencia": 1,
  "fecha_inicio": "2026-02-10",
  "fecha_fin": "2026-02-12",
  "motivo": "Vacaciones programadas",
  "empresa": 1
}

Response (201):
{
  "id": 1,
  "empleado": 1,
  "tipo_ausencia": 1,
  "tipo_ausencia_nombre": "Vacaciones",
  "dias_solicitados": 3,
  "fecha_inicio": "2026-02-10",
  "fecha_fin": "2026-02-12",
  "motivo": "Vacaciones programadas",
  "estado": "PENDIENTE",
  "fecha_resolucion": null,
  "motivo_rechazo": "",
  "aprobado_por": null
}

Note: Crea automáticamente notificación a RRHH
```

### Listar Solicitudes
```http
GET /api/solicitudes-ausencia/?estado=PENDIENTE&empleado=5

Query Params:
  - estado: PENDIENTE, APROBADA, RECHAZADA
  - empleado (int): ID empleado
  - tipo_ausencia (int): ID tipo
  - fecha_desde, fecha_hasta: rango

Response (200): Lista de solicitudes
```

### Aprobar Ausencia
```http
PATCH /api/solicitudes-ausencia/{id}/
Content-Type: application/json

{
  "estado": "APROBADA",
  "fecha_resolucion": "2026-01-27"
}

Response (200):
- Solicitud actualizada
- Jornadas cambian a JUSTIFICADA
- Saldo de vacaciones decrementado (si aplica)
- Notificación al empleado
```

### Rechazar Ausencia
```http
PATCH /api/solicitudes-ausencia/{id}/
Content-Type: application/json

{
  "estado": "RECHAZADA",
  "motivo_rechazo": "Período no disponible",
  "fecha_resolucion": "2026-01-27"
}

Response (200): Solicitud rechazada + notificación
```

---

## 🎯 ENDPOINTS: OBJETIVOS Y KPI

### Crear KPI
```http
POST /api/kpi/
Content-Type: application/json

{
  "nombre": "Cumplimiento de ventas",
  "descripcion": "Venta mensual objetivo",
  "categoria": "DESEMPENO",
  "peso_porcentaje": 30,
  "meta_objetivo": "100.00",
  "empresa": 1
}

Response (201): KPI creado
```

### Crear Objetivo
```http
POST /api/objetivos/
Content-Type: application/json

{
  "titulo": "Aumentar ventas 20%",
  "descripcion": "En comparación al mes anterior",
  "empleado": 5,
  "meta_numerica": "10000.00",
  "fecha_limite": "2026-02-28",
  "prioridad": "ALTA",
  "empresa": 1
}

Response (201): Objetivo creado + notificación
```

### Actualizar Avance
```http
PATCH /api/objetivos/{id}/
Content-Type: application/json

{
  "avance_actual": "8500.00"
}

Response (200): Objetivo actualizado
```

### Crear Evaluación
```http
POST /api/evaluaciones-desempeno/
Content-Type: application/json

{
  "empleado": 5,
  "periodo": "Enero 2026",
  "observaciones": "Buen desempeño",
  "empresa": 1
}

Response (201): Evaluación creada (estado=BORRADOR)
```

### Agregar Detalle de Evaluación
```http
POST /api/detalles-evaluacion/
Content-Type: application/json

{
  "evaluacion": 1,
  "kpi": 3,
  "valor_obtenido": "95.00",
  "calificacion": "9.50",
  "comentario": "Excelente cumplimiento"
}

Response (201): Detalle agregado
```

### Finalizar Evaluación
```http
PATCH /api/evaluaciones-desempeno/{id}/
Content-Type: application/json

{
  "estado": "FINALIZADA",
  "puntaje_total": "9.20"
}

Response (200): Evaluación finalizada + notificación
```

---

## 💰 ENDPOINTS: NÓMINA

### Configurar Nómina
```http
PUT /api/configuracion-nomina/{id}/
Content-Type: application/json

{
  "moneda": "USD",
  "divisor_hora_mensual": 240,
  "factor_he_diurna": "1.50",
  "factor_he_nocturna": "2.00",
  "hora_inicio_nocturna": "19:00:00",
  "descontar_atrasos": true,
  "tolerancia_remunerada": true
}

Response (200): Configuración actualizada
```

### Procesar Nómina
```http
POST /api/nomina/procesar/
Content-Type: application/json

{
  "empresa": 1,
  "periodo": "2026-01",
  "fecha_cierre": "2026-01-31"
}

Response (201):
{
  "id": 1,
  "empresa": 1,
  "periodo": "2026-01",
  "fecha_cierre": "2026-01-31",
  "total_empleados": 50,
  "total_pagado": "25000.50",
  "estado": "PROCESADA",
  "detalles": [
    {
      "empleado": 1,
      "empleado_nombre": "Juan Pérez",
      "sueldo_base": "500.00",
      "horas_extras": "37.50",
      "descuentos": "15.00",
      "bonificaciones": "0.00",
      "sueldo_neto": "522.50"
    },
    ...
  ]
}

Note: Bloquea período (no editable)
```

### Obtener Recibo
```http
GET /api/nomina/{id}/recibo/

Response (200):
{
  "empleado": "Juan Pérez",
  "periodo": "Enero 2026",
  "sueldo_base": "500.00",
  "horas_extras": "37.50",
  "atrasos": "0.00",
  "faltas": "0.00",
  "descuentos": "15.00",
  "bonificaciones": "0.00",
  "sueldo_neto": "522.50",
  "fecha_pago": "2026-02-01",
  "pdf_url": "/media/recibos/juan_2026_01.pdf"
}
```

### Descargar PDF
```http
GET /api/nomina/{id}/recibo-pdf/

Response (200): PDF binario
Content-Type: application/pdf
```

---

## 🏢 ENDPOINTS: ESTRUCTURA ORGANIZACIONAL

### Empresas
```http
GET    /api/empresas/                    # Listar
POST   /api/empresas/                    # Crear
GET    /api/empresas/{id}/               # Obtener
PATCH  /api/empresas/{id}/               # Actualizar
DELETE /api/empresas/{id}/               # Eliminar

POST   /api/empresas/{id}/logo/          # Subir logo (multipart/form-data)
```

### Sucursales
```http
GET    /api/sucursales/?empresa=1        # Listar
POST   /api/sucursales/                  # Crear
GET    /api/sucursales/{id}/             # Obtener
PATCH  /api/sucursales/{id}/             # Actualizar
```

### Departamentos
```http
GET    /api/departamentos/?sucursal=2    # Listar
POST   /api/departamentos/               # Crear
PATCH  /api/departamentos/{id}/          # Actualizar
```

### Áreas
```http
GET    /api/areas/?empresa=1             # Listar
POST   /api/areas/                       # Crear
PATCH  /api/areas/{id}/                  # Actualizar
```

### Puestos
```http
GET    /api/puestos/?empresa=1           # Listar
POST   /api/puestos/                     # Crear
PATCH  /api/puestos/{id}/                # Actualizar
```

### Turnos
```http
GET    /api/turnos/?empresa=1            # Listar
POST   /api/turnos/                      # Crear

Example POST:
{
  "nombre": "Administrativo L-V",
  "tipo_jornada": "RIGIDO",
  "hora_entrada": "08:00:00",
  "hora_salida": "17:00:00",
  "min_tolerancia": 10,
  "dias_laborables": [0,1,2,3,4],
  "empresa": 1
}
```

---

## 📄 ENDPOINTS: DOCUMENTOS

### Listar Documentos
```http
GET /api/documentos-empleado/?empleado=5

Response (200): Lista de documentos
```

### Subir Documento
```http
POST /api/documentos-empleado/
Content-Type: multipart/form-data

{
  "empleado": 5,
  "tipo": "CEDULA",
  "archivo": <archivo>,
  "observacion": "Cédula de identidad actualizada"
}

Response (201): Documento creado
```

### Gestionar Contratos
```http
POST /api/contratos/
Content-Type: multipart/form-data

{
  "empleado": 5,
  "tipo": "INDEFINIDO",
  "fecha_inicio": "2026-01-01",
  "fecha_fin": null,
  "salario_mensual": "600.00",
  "archivo_adjunto": <pdf>
}

Response (201): Contrato creado + actualiza sueldo empleado
```

---

## 🔔 ENDPOINTS: NOTIFICACIONES

### Listar Notificaciones
```http
GET /api/notificaciones/?leida=false

Query Params:
  - leida (boolean): true/false
  - tipo (string): VACACION, OBJETIVO, SISTEMA
  - page (int): paginación

Response (200): Lista de notificaciones del usuario actual
```

### Marcar como Leída
```http
PATCH /api/notificaciones/{id}/
Content-Type: application/json

{
  "leida": true
}

Response (200): Notificación actualizada
```

### Eliminar Notificación
```http
DELETE /api/notificaciones/{id}/

Response (204): No Content
```

---

## 📊 ENDPOINTS: REPORTES

### Reporte de Asistencia
```http
GET /api/reportes/asistencia/?fecha_desde=2026-01-01&fecha_hasta=2026-01-31&sucursal=2

Query Params:
  - fecha_desde, fecha_hasta (YYYY-MM-DD): rango
  - empresa, sucursal, departamento: filtros
  - exportar (string): pdf, excel

Response (200): Datos del reporte o descarga
```

### Reporte de Nómina
```http
GET /api/reportes/nomina/?periodo=2026-01

Query Params:
  - periodo (YYYY-MM): período
  - empresa, sucursal: filtros
  - exportar: pdf, excel

Response (200): Consolidado de nómina
```

### Dashboard
```http
GET /api/dashboard/

Response (200):
{
  "empleados_totales": 50,
  "empleados_activos": 48,
  "horas_promedio_dia": 8.5,
  "asistencia_promedio": "94.5%",
  "tareas_pendientes": 12,
  "ausencias_pendientes": 3,
  "objetivos_completados": 25,
  "objetivos_pendientes": 30
}
```

---

## ⚠️ CÓDIGOS DE RESPUESTA HTTP

| Código | Significado | Ejemplo |
|--------|------------|---------|
| **200** | OK - Éxito en GET/PATCH/PUT | Obtener recurso |
| **201** | Created - Éxito en POST | Crear empleado |
| **204** | No Content - Éxito en DELETE | Eliminar tarea |
| **400** | Bad Request - Datos inválidos | Email duplicado |
| **401** | Unauthorized - Token inválido | Token expirado |
| **403** | Forbidden - Permiso denegado | No es ADMIN |
| **404** | Not Found - Recurso no existe | ID empleado inválido |
| **409** | Conflict - Violación de constraint | RUC duplicado |
| **500** | Server Error - Error interno | Bug en backend |

---

## 🧪 EJEMPLOS DE CURL

### Login
```bash
curl -X POST http://127.0.0.1:8000/api/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@empresa.com","password":"contraseña123"}'
```

### Obtener Empleados
```bash
curl -X GET http://127.0.0.1:8000/api/empleados/ \
  -H "Authorization: Bearer {token}"
```

### Marcar Entrada
```bash
curl -X POST http://127.0.0.1:8000/api/eventos-asistencia/ \
  -H "Authorization: Bearer {token}" \
  -F "tipo=ENTRADA" \
  -F "latitud=13.6929" \
  -F "longitud=-89.2182" \
  -F "foto=@foto.jpg"
```

### Crear Tarea
```bash
curl -X POST http://127.0.0.1:8000/api/tareas/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo":"Nueva tarea",
    "descripcion":"Descripción aquí",
    "asignado_a":5,
    "fecha_limite":"2026-02-10T17:00:00Z",
    "prioridad":"ALTA",
    "empresa":1,
    "puntos_valor":5
  }'
```

---

## 📋 RATE LIMITING

```
Límite:      100 requests / 60 segundos
Por IP:      Automático en producción
Headers:     X-RateLimit-Limit: 100
             X-RateLimit-Remaining: 95
             X-RateLimit-Reset: 1234567890
```

---

## 🔐 SEGURIDAD EN APIs

- ✅ Validación de token en cada request
- ✅ CORS configurado (localhost:4200 en dev)
- ✅ Serializers validan datos de entrada
- ✅ Modelos validan reglas de negocio
- ✅ QuerySets filtran por empresa/rol
- ✅ Auditoría de cambios registrados
- ✅ Error handling sin exponer datos sensibles

---

*Referencia API: PUNTOPYMES v2.0*  
*Generado: 27 de Enero, 2026*  
*Versión: Production-Ready*
