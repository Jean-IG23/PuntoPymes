# 📋 MATRIZ DETALLADA DE PERMISOS POR ROL

**PUNTOPYMES v2.0 - Control de Acceso Basado en Roles (RBAC)**

---

## 🔐 JERARQUÍA DE ROLES

```
NIVEL 5: SUPERADMIN ▲ Acceso total técnico (SaaS Provider)
                    │
NIVEL 4: ADMIN      │ Acceso empresarial completo
                    │
NIVEL 3: RRHH       │ Gestión operativa
                    │
NIVEL 2: GERENTE    │ Supervisión local
                    │
NIVEL 1: EMPLEADO   ▼ Acceso limitado a datos propios
```

---

## 📊 MATRIZ COMPLETA DE PERMISOS

### 1. MÓDULO: GESTIÓN DE EMPLEADOS

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Ver todos** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: solo su sucursal |
| **Ver uno** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: solo él mismo |
| **Crear** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Editar datos básicos** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: solo datos propios |
| **Editar rol** | ✅ | ✅ | ❌ | ❌ | ❌ | SUPERADMIN/ADMIN solo |
| **Editar sueldo** | ✅ | ✅ | ❌ | ❌ | ❌ | ADMIN solo |
| **Asignar sucursal** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Asignar departamento** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Asignar turno** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Cambiar estado (ACTIVO/INACTIVO)** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Eliminar** | ✅ | ✅ | ❌ | ❌ | ❌ | ADMIN only |
| **Carga masiva (Excel)** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN solo |
| **Exportar lista** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Subir foto de perfil** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su foto |

#### Validaciones Aplicadas
- ✅ Empleado ACTIVO = verificar antes de permitir acciones
- ✅ GERENTE auto-reemplazo si se asigna otro a misma sucursal
- ✅ Departamento debe pertenecer a sucursal del empleado
- ✅ GERENTE obligatoriamente con sucursal

---

### 2. MÓDULO: CONTROL DE ASISTENCIA

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Marcar entrada** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: solo la suya |
| **Marcar salida** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: solo la suya |
| **Ver eventos todos** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: solo su sucursal |
| **Ver eventos propios** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno: sus eventos |
| **Ver jornadas consol.** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Editar jornada** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH/ADMIN con auditoría |
| **Crear evento manual** | ✅ | ✅ | ✅ | ❌ | ❌ | Para correcciones |
| **Cambiar estado jornada** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH solo (auditoría) |
| **Ver GPS/foto evidencia** | ✅ | ✅ | ✅ | ✅ | ❌ | Forense: no exponer |
| **Exportar reporte** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |

#### Validaciones Aplicadas
- ✅ GPS dentro de radio_metros de sucursal
- ✅ Foto obligatoria en marcaje
- ✅ No permitir: entrada sin salida anterior
- ✅ Marcajes fuera de GPS: permitir pero alertar
- ✅ Edición manual: requiere observación + auditoría

---

### 3. MÓDULO: GESTIÓN DE TAREAS

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Crear tarea** | ✅ | ✅ | ✅ | ✅* | ❌ | Gerente: solo empleados su sucursal |
| **Ver tareas empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | - |
| **Ver tareas sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: solo su sucursal |
| **Ver tareas asignadas** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: tareas suyas |
| **Actualizar estado** | ✅ | ✅ | ✅ | ✅* | ✅ | Empleado: solo cambiar a PROGRESO/COMPLETADA |
| **Cambiar asignado** | ✅ | ✅ | ✅ | ✅* | ❌ | Gerente: dentro su sucursal |
| **Cambiar fecha límite** | ✅ | ✅ | ✅ | ✅* | ❌ | Gerente: solo sus tareas |
| **Revisar/Aprobar** | ✅ | ✅ | ✅ | ✅* | ❌ | Gerente: solo sus tareas |
| **Rechazar tarea** | ✅ | ✅ | ✅ | ✅* | ❌ | Requiere motivo |
| **Ver comentarios** | ✅ | ✅ | ✅ | ✅* | ✅ | Participantes en tarea |
| **Eliminar tarea** | ✅ | ✅ | ✅ | ❌ | ❌ | Solo si estado=PENDIENTE |

#### Validaciones Aplicadas
- ✅ Fecha límite no puede ser en el pasado
- ✅ Prioridad en lista: BAJA, MEDIA, ALTA, URGENTE
- ✅ Estados: PENDIENTE → EN_PROGRESO → EN_REVISION → COMPLETADA/RECHAZADA
- ✅ Rechazar requiere motivo
- ✅ Gamificación: suma puntos si COMPLETADA

---

### 4. MÓDULO: SOLICITUDES DE AUSENCIA

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Solicitar** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: solo propia |
| **Ver solicitudes empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | - |
| **Ver solicitudes sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Ver solicitud propia** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: solo suya |
| **Aprobar** | ✅ | ✅ | ✅ | ✅* | ❌ | RRHH/Gerente solo |
| **Rechazar** | ✅ | ✅ | ✅ | ✅* | ❌ | Requiere motivo |
| **Editar solicitud** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: si estado=PENDIENTE |
| **Cancelar solicitud** | ✅ | ✅ | ✅ | ❌ | ✅ | Si estado=PENDIENTE |
| **Ver saldo vacaciones** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su saldo |
| **Agregar días vacaciones** | ✅ | ✅ | ✅ | ❌ | ❌ | ADMIN: bono, compensación |
| **Exportar historial** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su historial |

#### Validaciones Aplicadas
- ✅ Saldo >= días_solicitados (para VACACIONES)
- ✅ Rango de fechas válido (inicio <= fin)
- ✅ No duplicar ausencias en mismo rango
- ✅ Cambio automático de jornadas a JUSTIFICADA
- ✅ Descuento de saldo si es VACACIONES

---

### 5. MÓDULO: OBJETIVOS Y KPI

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Crear KPI** | ✅ | ✅ | ✅ | ❌ | ❌ | Catálogo empresa |
| **Editar KPI** | ✅ | ✅ | ✅ | ❌ | ❌ | Solo creador o ADMIN |
| **Crear objetivo** | ✅ | ✅ | ✅ | ❌ | ❌ | Asignar a empleado |
| **Asignar objetivo** | ✅ | ✅ | ✅ | ❌ | ❌ | Crear + notificar |
| **Ver objetivos empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | - |
| **Ver objetivos sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Ver objetivos asignados** | ✅ | ✅ | ✅ | ✅ | ✅ | Empleado: sus objetivos |
| **Actualizar avance** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: sus objetivos |
| **Cambiar estado objetivo** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: marca completado |
| **Crear evaluación** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH mensual |
| **Ver evaluación** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: solo suya |
| **Finalizar evaluación** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH solo |
| **Ver ranking** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |

#### Validaciones Aplicadas
- ✅ Meta_objetivo > 0
- ✅ Avance_actual <= Meta_objetivo (validar)
- ✅ Puntaje_total = suma ponderada de KPIs
- ✅ Calificación en escala 0-10
- ✅ Fecha límite objetivo > hoy

---

### 6. MÓDULO: NÓMINA

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Configurar nómina** | ✅ | ✅ | ❌ | ❌ | ❌ | ADMIN: moneda, divisor, factores |
| **Ver nómina empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | Consolidado |
| **Ver nómina sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Ver recibo propio** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su recibo |
| **Procesar nómina** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH: generación |
| **Generar PDF recibo** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su recibo |
| **Exportar nómina Excel** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Editar jornada p/ nómina** | ✅ | ✅ | ✅ | ❌ | ❌ | Antes de cerrar período |
| **Cerrar período** | ✅ | ✅ | ✅ | ❌ | ❌ | Bloquea ediciones |
| **Reabrir período** | ✅ | ✅ | ❌ | ❌ | ❌ | Solo ADMIN |

#### Validaciones Aplicadas
- ✅ Todas las jornadas deben estar procesadas
- ✅ No permitir: nómina simultánea de varios meses
- ✅ Cálculo: SueldobBase + HE - Descuentos + Bonificaciones
- ✅ Descuentos por: atrasos, faltas, ausencias con afecta_sueldo=true
- ✅ Bonificaciones por tareas completadas

---

### 7. MÓDULO: ESTRUCTURA ORGANIZACIONAL

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Crear empresa** | ✅ | ❌ | ❌ | ❌ | ❌ | SUPERADMIN solo |
| **Editar empresa** | ✅ | ✅ | ❌ | ❌ | ❌ | ADMIN: su empresa |
| **Ver empresa** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno su empresa |
| **Crear sucursal** | ✅ | ✅ | ❌ | ❌ | ❌ | ADMIN: nueva sucursal |
| **Editar sucursal** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH: configuración |
| **Ver sucursales** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno ve su empresa |
| **Crear área** | ✅ | ✅ | ✅ | ❌ | ❌ | Categorización global |
| **Crear departamento** | ✅ | ✅ | ✅ | ❌ | ❌ | Por sucursal |
| **Crear puesto** | ✅ | ✅ | ✅ | ❌ | ❌ | Definición de cargos |
| **Crear turno** | ✅ | ✅ | ✅ | ❌ | ❌ | Reglas de asistencia |
| **Editar turno** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH: horarios |
| **Ver estructura** | ✅ | ✅ | ✅ | ✅ | ✅ | Diagrama org. |

#### Validaciones Aplicadas
- ✅ RUC único en plataforma
- ✅ Un solo is_matriz=true por empresa
- ✅ Nombre área único por empresa
- ✅ Nombre departamento único por sucursal
- ✅ Nombre puesto único por empresa
- ✅ Radio_metros > 0 en sucursal

---

### 8. MÓDULO: DOCUMENTOS Y CONTRATOS

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Subir documento** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: solo suyos |
| **Ver documentos empleado** | ✅ | ✅ | ✅ | ✅ | ✅ | Gerente: su sucursal; Empleado: suyos |
| **Ver documentos empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | Consolidado |
| **Descargar documento** | ✅ | ✅ | ✅ | ✅ | ✅ | Acceso a archivos |
| **Eliminar documento** | ✅ | ✅ | ✅ | ❌ | ✅ | Empleado: solo suyos |
| **Crear contrato** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH: vinculación |
| **Ver contratos** | ✅ | ✅ | ✅ | ✅ | ✅ | Gerente: su sucursal; Empleado: suyo |
| **Editar contrato** | ✅ | ✅ | ✅ | ❌ | ❌ | RRHH: cambios |
| **Activar contrato** | ✅ | ✅ | ✅ | ❌ | ❌ | Uno activo por empleado |

#### Validaciones Aplicadas
- ✅ Archivo PDF/JPG permitidos
- ✅ Tamaño máximo: 10MB
- ✅ Solo un contrato activo por empleado
- ✅ Auto-actualizar sueldo al activar contrato
- ✅ Histórico de contratos

---

### 9. MÓDULO: NOTIFICACIONES

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Crear notif manual** | ✅ | ✅ | ✅ | ✅ | ❌ | Mensaje del sistema |
| **Ver notificaciones** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno: sus notifs |
| **Marcar como leída** | ✅ | ✅ | ✅ | ✅ | ✅ | Propia notificación |
| **Eliminar notificación** | ✅ | ✅ | ✅ | ✅ | ✅ | Propia notificación |
| **Configurar alertas** | ✅ | ✅ | ✅ | ✅ | ✅ | Preferencias personales |
| **Recibir notif vacación** | Sí | Sí | Sí | Sí | Sí | Auto al solicitar |
| **Recibir notif objetivo** | Sí | Sí | Sí | Sí | Sí | Auto al asignar |
| **Recibir notif crítica** | Sí | Sí | Sí | Sí | Sí | GPS fuera rango, etc |

#### Validaciones Aplicadas
- ✅ Usuario_destino válido
- ✅ Tipos: VACACION, OBJETIVO, SISTEMA
- ✅ Ordenar por fecha (más recientes primero)
- ✅ Marcar leída automáticamente al abrir

---

### 10. MÓDULO: REPORTES

#### Tabla de Permisos
| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO | Restricción |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|-------------|
| **Reporte asistencia empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | Consolidado |
| **Reporte asistencia sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Reporte asistencia personal** | ✅ | ✅ | ✅ | ✅ | ✅ | Cada uno: su asistencia |
| **Reporte nómina empresa** | ✅ | ✅ | ✅ | ❌ | ❌ | Consolidado |
| **Reporte nómina sucursal** | ✅ | ✅ | ✅ | ✅ | ❌ | Gerente: su sucursal |
| **Reporte tareas** | ✅ | ✅ | ✅ | ✅ | ❌ | Por período |
| **Reporte productividad** | ✅ | ✅ | ✅ | ✅ | ❌ | Ranking, KPIs |
| **Dashboard general** | ✅ | ✅ | ✅ | ✅ | ✅ | Según nivel acceso |
| **Exportar a Excel** | ✅ | ✅ | ✅ | ✅ | ✅ | Acceso según datos |
| **Exportar a PDF** | ✅ | ✅ | ✅ | ✅ | ✅ | Acceso según datos |
| **Programar reporte** | ✅ | ✅ | ✅ | ❌ | ❌ | Email automático |

#### Validaciones Aplicadas
- ✅ Rango de fechas válido
- ✅ Filtros aplicables según rol
- ✅ Paginación en reportes grandes
- ✅ Cache de reportes frecuentes

---

## 🔒 REGLAS DE AISLAMIENTO MULTI-TENANT

### Filtrado Automático en Queryset

```python
# Empleados: Filtrar por empresa
def get_queryset(self):
    if user.empleado.rol == 'SUPERADMIN':
        return Empleado.objects.all()
    elif user.empleado.rol == 'ADMIN':
        return Empleado.objects.filter(empresa=user.empleado.empresa)
    elif user.empleado.rol == 'RRHH':
        return Empleado.objects.filter(empresa=user.empleado.empresa)
    elif user.empleado.rol == 'GERENTE':
        return Empleado.objects.filter(sucursal=user.empleado.sucursal)
    else:  # EMPLEADO
        return Empleado.objects.filter(pk=user.empleado.pk)
```

### Protecciones Implementadas
- ✅ Cada rol solo ve datos de su alcance
- ✅ Validación en nivel QuerySet (SQL injection proof)
- ✅ Validación en nivel serializer (seguridad adicional)
- ✅ Validación en nivel view (lógica de negocio)
- ✅ Auditoría de intentos de acceso denegado

---

## 📋 CHECKLIST DE CUMPLIMIENTO DE PERMISOS

### Backend Validations ✅
- [x] Decorator `@require_roles` implementado
- [x] Helper `get_queryset_filtrado()` implementado
- [x] Validaciones en `perform_create()` (crear)
- [x] Validaciones en `perform_update()` (editar)
- [x] Validaciones en `destroy()` (eliminar)
- [x] Auditoría de cambios implementada
- [x] Token JWT validado en cada petición

### Frontend Guards ✅
- [x] Route guard: `RoleBasedGuard`
- [x] Directiva: `*ngIf` para mostrar/ocultar
- [x] Botones deshabilitados según rol
- [x] Formularios deshabilitados según rol
- [x] Campos read-only según rol
- [x] Mensajes de "No tiene permiso"

### Testing ✅
- [x] Test: SUPERADMIN acceso total
- [x] Test: ADMIN empresa
- [x] Test: RRHH gestión
- [x] Test: GERENTE sucursal
- [x] Test: EMPLEADO limitado
- [x] Test: Cross-tenant isolation
- [x] Test: SQL injection proof

---

## 🎯 RESUMEN DE PERMISOS

| Rol | Acceso | Alcance | Restricciones |
|-----|--------|---------|----------------|
| **SUPERADMIN** | Total | Plataforma | Ninguna (proveedora) |
| **ADMIN** | Pleno | Su empresa | No crear empresa, no cambiar rol |
| **RRHH** | Operacional | Su empresa | No config empresa, no crear empresas |
| **GERENTE** | Local | Su sucursal | Solo datos de su sucursal |
| **EMPLEADO** | Limitado | Datos propios | Solo vé/edita lo suyo |

---

*Documento: Matriz Detallada de Permisos PUNTOPYMES*  
*Generado: 27 de Enero, 2026*  
*Versión: v2.0 Production-Ready*
