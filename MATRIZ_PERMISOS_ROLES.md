# 📊 MATRIZ DE PERMISOS POR ROLES - JERARQUÍA DEL SISTEMA

## 🎯 Estructura Jerárquica de Roles

```
SUPERADMIN (Nivel 5)
    ├─ SaaS Owner (Acceso Total)
    └─ Gestión de Empresas/Clientes
        │
        ├── ADMIN (Nivel 4)
        │   ├─ Cliente/Dueño de Empresa
        │   └─ Configuración total de su empresa
        │       │
        │       ├── RRHH (Nivel 3)
        │       │   ├─ Recursos Humanos
        │       │   └─ Gestión operativa de personal
        │       │       │
        │       │       ├── GERENTE (Nivel 2)
        │       │       │   ├─ Gerente/Líder de Área
        │       │       │   └─ Supervisión de equipo
        │       │       │
        │       │       └── EMPLEADO (Nivel 1)
        │       │           ├─ Colaborador
        │       │           └─ Solo acceso a lo propio
```

---

## 📋 TABLA DE PERMISOS POR MÓDULO

### 1️⃣ MÓDULO: DASHBOARD

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| Ver dashboard general | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver KPIs (empleados, asistencia, etc) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Ver gráficos de productividad | ✅ | ✅ | ✅ | ✅ | ❌ |
| Ver dashboard personal | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver ranking de empleados | ✅ | ✅ | ✅ | ✅ | ❌ |

---

### 2️⃣ MÓDULO: PERSONAL (Empleados)

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Listar empleados** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Crear empleado** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver detalle empleado** | ✅ | ✅ | ✅ | ✅* | ✅** |
| **Editar empleado** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Eliminar empleado** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Ver contrato** | ✅ | ✅ | ✅ | ❌ | ✅** |
| **Crear contrato** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver documentos** | ✅ | ✅ | ✅ | ❌ | ✅** |
| **Cargar documentos** | ✅ | ✅ | ✅ | ❌ | ✅** |

*GERENTE: Solo de su área/sucursal  
**EMPLEADO: Solo los propios

---

### 3️⃣ MÓDULO: CONFIGURACIÓN

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Crear empresa** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editar empresa** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Crear sucursal** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar sucursal** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear departamento** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar departamento** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear puesto** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar puesto** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear turno** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar turno** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear área** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar área** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear tipo de ausencia** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver configuración nómina** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar configuración nómina** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 4️⃣ MÓDULO: ASISTENCIA

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Ver asistencia general** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Ver su propia asistencia** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Marcar entrada/salida** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver eventos asistencia** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Crear jornada manual** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver reporte asistencia** | ✅ | ✅ | ✅ | ✅* | ❌ |

*GERENTE: Solo de su área/sucursal

---

### 5️⃣ MÓDULO: TAREAS

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Crear tarea** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Listar tareas** | ✅ | ✅ | ✅ | ✅* | ✅** |
| **Ver tarea** | ✅ | ✅ | ✅ | ✅* | ✅** |
| **Editar tarea** | ✅ | ✅ | ✅ | ✅*** | ✅**** |
| **Aprobar tarea** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Rechazar tarea** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver ranking tareas** | ✅ | ✅ | ✅ | ✅ | ❌ |

*GERENTE: Tareas de su equipo  
**EMPLEADO: Solo sus propias tareas  
***GERENTE: Solo las que creó  
****EMPLEADO: Solo si está en progreso

---

### 6️⃣ MÓDULO: AUSENCIAS / VACACIONES

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Solicitar ausencia** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver solicitudes propias** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver solicitudes del equipo** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Ver todas las solicitudes** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Aprobar solicitud** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Rechazar solicitud** | ✅ | ✅ | ✅ | ✅* | ❌ |
| **Gestionar saldo vacaciones** | ✅ | ✅ | ✅ | ❌ | ❌ |

*GERENTE: De su equipo solamente

---

### 7️⃣ MÓDULO: OBJETIVOS / KPI

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Crear objetivo** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ver objetivos** | ✅ | ✅ | ✅ | ✅* | ✅** |
| **Editar objetivo** | ✅ | ✅ | ✅ | ✅*** | ✅**** |
| **Completar objetivo** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ver progreso objetivos** | ✅ | ✅ | ✅ | ✅ | ✅ |

*GERENTE: Del equipo  
**EMPLEADO: Solo los suyos  
***GERENTE: Los que creó  
****EMPLEADO: Los suyos

---

### 8️⃣ MÓDULO: NÓMINA / PAYROLL

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Ver configuración nómina** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Editar configuración nómina** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Generar nómina** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Ver nómina personal** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Exportar nóminas** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

### 9️⃣ MÓDULO: ADMINISTRACIÓN (SaaS)

| Acción | SUPERADMIN | ADMIN | RRHH | GERENTE | EMPLEADO |
|--------|:----------:|:-----:|:----:|:-------:|:--------:|
| **Crear empresa** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Editar empresa** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Desactivar empresa** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ver reportes SaaS** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Gestionar licencias** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🔐 RESUMEN DE PERMISOS POR ROL

### 🔴 SUPERADMIN (Nivel 5)
**Alcance:** Global - Todas las empresas  
**Acceso:** Total y sin restricciones  

```
✅ Acceso a toda la plataforma SaaS
✅ Crear/editar/eliminar empresas
✅ Gestionar licencias y facturación
✅ Acceso total a datos de cualquier empresa
✅ Ver reportes globales del sistema
✅ Todos los módulos y funciones
```

---

### 🟠 ADMIN (Nivel 4)
**Alcance:** Una empresa específica  
**Acceso:** Configuración y gestión total de su empresa  

```
✅ Dashboard y KPIs
✅ Gestionar personal (CRUD)
✅ Crear sucursales y departamentos
✅ Crear tipos de ausencia
✅ Ver asistencia general
✅ Crear/aprobar tareas
✅ Aprobar/rechazar ausencias
✅ Configurar nómina
✅ Acceso a reportes de su empresa
❌ No puede crear empresas
❌ No puede gestionar SaaS
```

---

### 🟡 RRHH (Nivel 3)
**Alcance:** Su empresa  
**Acceso:** Gestión operativa de personal  

```
✅ Gestionar empleados (CRUD)
✅ Crear tipos de ausencia
✅ Ver configuración de nómina
✅ Ver asistencia general
✅ Crear y aprobar tareas
✅ Aprobar/rechazar ausencias
✅ Crear objetivos
✅ Crear turnos y departamentos
❌ No puede editar empresa
❌ No puede gestionar licencias
❌ No puede ver datos SaaS
```

---

### 🟢 GERENTE (Nivel 2)
**Alcance:** Su área/sucursal y equipo asignado  
**Acceso:** Supervisión de equipo  

```
✅ Ver empleados de su área
✅ Crear tareas para su equipo
✅ Aprobar/rechazar tareas
✅ Ver asistencia de su equipo
✅ Aprobar/rechazar ausencias del equipo
✅ Ver objetivos del equipo
✅ Crear y completar objetivos
✅ Ver gráficos de productividad
❌ No puede crear empleados
❌ No puede editar configuración
❌ No puede crear ausencias de otros
❌ No puede ver nómina
```

---

### 🔵 EMPLEADO (Nivel 1)
**Alcance:** Solo datos propios  
**Acceso:** Mínimo, solo colaboración  

```
✅ Ver su propia información
✅ Marcar entrada/salida
✅ Ver su asistencia
✅ Solicitar ausencias
✅ Ver sus tareas
✅ Completar tareas asignadas
✅ Ver sus objetivos
✅ Completar objetivos personales
✅ Ver su nómina
❌ No puede ver datos de otros
❌ No puede crear empleados
❌ No puede aprobar nada
❌ No puede editar configuración
```

---

## 🎯 CASOS DE USO POR ROL

### SUPERADMIN: Configuración SaaS
- [ ] Crear nueva empresa cliente
- [ ] Asignar licencias
- [ ] Ver Dashboard global (multi-empresa)
- [ ] Monitorear salud de todas las instancias
- [ ] Exportar reportes consolidados

### ADMIN: Dueño/Gerente General
- [ ] Contratar empleados
- [ ] Crear sucursales
- [ ] Configurar nómina
- [ ] Ver asistencia de todos
- [ ] Aprobar todas las ausencias/tareas

### RRHH: Recursos Humanos
- [ ] Importar empleados en lotes
- [ ] Gestionar tipos de ausencia
- [ ] Procesar ausencias/vacaciones
- [ ] Crear y asignar tareas
- [ ] Ver datos operativos

### GERENTE: Líder de Equipo
- [ ] Crear tareas para su equipo
- [ ] Aprobar tareas de su equipo
- [ ] Monitorear asistencia del equipo
- [ ] Aprobar ausencias del equipo
- [ ] Ver productividad de su área

### EMPLEADO: Colaborador
- [ ] Marcar asistencia
- [ ] Ver tareas asignadas
- [ ] Completar tareas
- [ ] Solicitar ausencias
- [ ] Ver su desempeño

---

## 🔒 PRINCIPIOS DE SEGURIDAD

1. **Principio de Menor Privilegio**
   - Cada rol tiene SOLO los permisos necesarios
   - Por defecto se niega, no se permite

2. **Separación de Datos**
   - EMPLEADO: Solo datos propios
   - GERENTE: Solo datos de su equipo
   - RRHH/ADMIN: Datos de su empresa
   - SUPERADMIN: Datos globales

3. **Escalada de Privilegios**
   - ADMIN > RRHH > GERENTE > EMPLEADO
   - Los niveles superiores pueden hacer todo de los inferiores

4. **Auditoría**
   - RRHH y ADMIN hacen cambios importantes
   - Se registra quién y cuándo en críticas

---

## 📝 IMPLEMENTACIÓN TÉCNICA

### Backend (Django):
```python
# En each ViewSet se valida:
if request.user.is_superuser:
    # Acceso total
    pass
else:
    empleado = Empleado.objects.get(usuario=request.user)
    if empleado.rol not in ['ADMIN', 'RRHH', 'GERENTE']:  # Según acción
        return Response({'error': 'No tienes permisos'}, status=403)
```

### Frontend (Angular):
```typescript
// En each component/guard:
canAccessFeature(): boolean {
  if (this.auth.isSuperAdmin()) return true;
  if (this.auth.isAdmin()) return true;
  if (this.auth.isRRHH()) return true;
  return false;
}

// Con guardias de ruta:
canActivate(): boolean {
  return this.auth.isManagement(); // ADMIN, RRHH, GERENTE, SUPERADMIN
}
```

---

## ✅ PRÓXIMOS PASOS

- [ ] Implementar guards para cada módulo
- [ ] Validar permisos en todos los endpoints
- [ ] Crear componentes con visibilidad condicional
- [ ] Agregar auditoría de acciones críticas
- [ ] Documentar excepciones por rol
