# 🧪 GUÍA DE TESTING - Arquitectura de Rutas Implementada

**Fecha:** 21 de Enero de 2026  
**Status Compilación:** ✅ SUCCESS - Sin errores  
**Build Output:** 895.56 kB (main) + 73.44 kB (styles)

---

## 📋 Pre-requisitos para Testing

1. ✅ Tener la aplicación compilada: `ng build`
2. ✅ Tener un usuario de cada rol:
   - Empleado (sin permisos de manager ni admin)
   - Manager/Jefe (con `isManagement() = true`)
   - Admin de Empresa (con `canConfigCompany() = true`)
   - SuperAdmin (ambos true)
3. ✅ Backend corriendo y accesible
4. ✅ Token JWT válido después del login

---

## 🧑 TEST CASE 1: Empleado (Usuario Regular)

**Rol:** Empleado sin permisos de manager ni admin  
**Guards que pasaría:** `authGuard` (logueado)  
**Guards que NO pasaría:** `adminGuard`, `configGuard`

### Acciones a Testing:

| Acción | URL | Esperado | Status |
|--------|-----|----------|--------|
| Ver sidebar | - | Solo sección PRINCIPAL (8 items) visible | [ ] |
| NO ver GESTIÓN | - | Sección GESTIÓN no visible en sidebar | [ ] |
| NO ver ADMIN | - | Sección ADMINISTRACIÓN no visible en sidebar | [ ] |
| Acceder a /reloj | http://localhost:4200/reloj | ✅ Carga RelojComponent | [ ] |
| Acceder a /mi-perfil | http://localhost:4200/mi-perfil | ✅ Carga PerfilComponent | [ ] |
| Acceder a /solicitudes | http://localhost:4200/solicitudes | ✅ Carga SolicitudesComponent | [ ] |
| Acceder a /nomina | http://localhost:4200/nomina | ✅ Carga NominaComponent | [ ] |
| Acceder a /objetivos | http://localhost:4200/objetivos | ✅ Carga ObjetivosListComponent | [ ] |
| Acceder a /reportes | http://localhost:4200/reportes | ✅ Carga ReportesComponent | [ ] |
| Acceder a /tareas | http://localhost:4200/tareas | ✅ Carga TareasComponent | [ ] |
| Acceder a /ranking | http://localhost:4200/ranking | ✅ Carga RankingComponent | [ ] |
| Intentar /gestion/dashboard | http://localhost:4200/gestion/dashboard | ❌ Redirige (no tiene adminGuard) | [ ] |
| Intentar /admin/kpi | http://localhost:4200/admin/kpi | ❌ Redirige (no tiene configGuard) | [ ] |
| Usar redirección /dashboard | http://localhost:4200/dashboard | → /gestion/dashboard → ❌ Redirige | [ ] |
| Usar redirección /portal | http://localhost:4200/portal | → /reloj → ✅ Carga Reloj | [ ] |
| Usar redirección /kpi/manager | http://localhost:4200/kpi/manager | → /admin/kpi → ❌ Redirige | [ ] |

---

## 👨‍💼 TEST CASE 2: Manager/Jefe

**Rol:** Manager con `isManagement() = true`  
**Guards que pasaría:** `authGuard`, `adminGuard`  
**Guards que NO pasaría:** `configGuard`

### Acciones a Testing:

| Acción | URL | Esperado | Status |
|--------|-----|----------|--------|
| Ver sidebar | - | Secciones PRINCIPAL + GESTIÓN visibles | [ ] |
| NO ver ADMIN | - | Sección ADMINISTRACIÓN no visible | [ ] |
| Acceder a PRINCIPAL (reloj) | /reloj | ✅ Carga | [ ] |
| Acceder GESTIÓN/dashboard | /gestion/dashboard | ✅ Carga DashboardComponent | [ ] |
| Acceder GESTIÓN/empleados | /gestion/empleados | ✅ Carga EmpleadoListComponent | [ ] |
| Acceder GESTIÓN/empleados/nuevo | /gestion/empleados/nuevo | ✅ Carga EmpleadoFormComponent | [ ] |
| Acceder GESTIÓN/empleados/editar/1 | /gestion/empleados/editar/1 | ✅ Carga formulario edición | [ ] |
| Acceder GESTIÓN/carga-masiva | /gestion/carga-masiva | ✅ Carga CargaMasivaComponent | [ ] |
| Acceder GESTIÓN/asistencia | /gestion/asistencia | ✅ Carga AsistenciaAdminComponent | [ ] |
| Acceder GESTIÓN/evaluaciones | /gestion/evaluaciones | ✅ Carga KpiScoreComponent | [ ] |
| Acceder GESTIÓN/organizacion | /gestion/organizacion | ✅ Carga OrganizacionComponent | [ ] |
| Acceder GESTIÓN/departamentos/1/empleados | /gestion/departamentos/1/empleados | ✅ Carga empleados del depto | [ ] |
| Acceder GESTIÓN/objetivos/nuevo | /gestion/objetivos/nuevo | ✅ Carga ObjetivoFormComponent | [ ] |
| Acceder GESTIÓN/objetivos/editar/1 | /gestion/objetivos/editar/1 | ✅ Carga formulario edición | [ ] |
| Intentar /admin/kpi | /admin/kpi | ❌ Redirige (no tiene configGuard) | [ ] |
| Intentar /admin/ausencias | /admin/ausencias | ❌ Redirige (no tiene configGuard) | [ ] |
| Intentar /admin/configuracion | /admin/configuracion | ❌ Redirige (no tiene configGuard) | [ ] |
| Redirección /kpi/manager | /kpi/manager | → /admin/kpi → ❌ Redirige | [ ] |

---

## ⚙️ TEST CASE 3: Admin de Empresa

**Rol:** Admin con `canConfigCompany() = true`  
**Guards que pasaría:** `authGuard`, `configGuard`  
**Nota:** Si también `isManagement() = true`, puede ver GESTIÓN también

### Acciones a Testing:

| Acción | URL | Esperado | Status |
|--------|-----|----------|--------|
| Ver sidebar | - | Secciones PRINCIPAL + ADMIN visibles | [ ] |
| Ver GESTIÓN | - | Si `isManagement()=true`, también visible | [ ] |
| Acceder ADMIN/kpi | /admin/kpi | ✅ Carga KpiManagerComponent | [ ] |
| Acceder ADMIN/ausencias | /admin/ausencias | ✅ Carga ConfigAusenciasComponent | [ ] |
| Acceder ADMIN/configuracion | /admin/configuracion | ✅ Carga ConfiguracionComponent | [ ] |
| Redirección /kpi/manager | /kpi/manager | → /admin/kpi → ✅ Carga KPI Manager | [ ] |
| Redirección /configuracion | /configuracion | → /admin/configuracion → ✅ Carga | [ ] |

---

## 🏢 TEST CASE 4: SuperAdmin

**Rol:** SuperAdmin con `isManagement() = true` Y `canConfigCompany() = true`  
**Guards que pasaría:** Todos (`authGuard`, `adminGuard`, `configGuard`)

### Acciones a Testing:

| Acción | URL | Esperado | Status |
|--------|-----|----------|--------|
| Ver sidebar | - | Todas las secciones visibles (PRINCIPAL, GESTIÓN, ADMIN, SaaS) | [ ] |
| Acceder SAAS/dashboard | /saas/dashboard | ✅ Carga SaasDashboardComponent | [ ] |
| Acceder todo PRINCIPAL | - | ✅ Todo accesible | [ ] |
| Acceder todo GESTIÓN | - | ✅ Todo accesible | [ ] |
| Acceder todo ADMIN | - | ✅ Todo accesible | [ ] |

---

## 🔄 TEST CASE 5: Redirecciones por Compatibilidad

**Propósito:** Asegurar que bookmarks antiguos aún funcionen

| URL Antigua | Redirige a | Rol | Esperado | Status |
|-------------|-----------|-----|----------|--------|
| /dashboard | /gestion/dashboard | Employee | ❌ No acceso (guard) | [ ] |
| /dashboard | /gestion/dashboard | Manager | ✅ Carga DashboardComponent | [ ] |
| /portal | /reloj | Todos | ✅ Carga RelojComponent | [ ] |
| /kpi/manager | /admin/kpi | Employee | ❌ No acceso (guard) | [ ] |
| /kpi/manager | /admin/kpi | Admin | ✅ Carga KpiManagerComponent | [ ] |
| /configuracion | /admin/configuracion | Employee | ❌ No acceso (guard) | [ ] |
| /configuracion | /admin/configuracion | Admin | ✅ Carga ConfiguracionComponent | [ ] |

---

## 🧭 TEST CASE 6: Navegación desde Sidebar

**Propósito:** Verificar que los links del sidebar funcionan

### Para cada rol, hacer click en cada link:

```
SECCIÓN PRINCIPAL:
[ ] Reloj de Asistencia → /reloj
[ ] Mi Perfil → /mi-perfil
[ ] Solicitudes → /solicitudes
[ ] Nómina → /nomina
[ ] Mis Objetivos → /objetivos
[ ] Reportes → /reportes
[ ] Mis Tareas → /tareas
[ ] Ranking → /ranking

SECCIÓN GESTIÓN (Solo para Managers):
[ ] Dashboard → /gestion/dashboard
[ ] Mi Equipo → /gestion/empleados
[ ] Organización → /gestion/organizacion
[ ] Asistencia → /gestion/asistencia
[ ] Evaluaciones → /gestion/evaluaciones

SECCIÓN ADMINISTRACIÓN (Solo para Admins):
[ ] Definir KPIs → /admin/kpi
[ ] Tipos de Ausencias → /admin/ausencias
[ ] Configuración General → /admin/configuracion
```

---

## 🚨 TEST CASE 7: Error Handling

| Acción | Esperado | Status |
|--------|----------|--------|
| Ir a ruta inexistente (ej: /asd123) | Redirige a /home | [ ] |
| Logout desde cualquier página privada | Redirige a /login | [ ] |
| Login exitoso | Redirige a /home | [ ] |
| Token expirado en ruta privada | Redirige a /login | [ ] |
| Intentar acceder a ruta sin permiso | Redirige a /home o muestra error | [ ] |

---

## 💾 TEST CASE 8: State Persistence

| Acción | Esperado | Status |
|--------|----------|--------|
| Cargar aplicación en /reloj | ✅ Carga directamente en /reloj | [ ] |
| Cargar aplicación en /gestion/dashboard | ✅ Si manager, carga dashboard | [ ] |
| Reload de página en /admin/kpi | ✅ Si admin, se mantiene en admin/kpi | [ ] |
| Navegar entre rutas rápido | ✅ Sin fallos de loading | [ ] |

---

## 📊 TEST CASE 9: UI/UX

| Elemento | Esperado | Status |
|----------|----------|--------|
| Iconos Remixicon visibles | ✅ Todos los iconos cargados | [ ] |
| Hover effects en sidebar | ✅ Cambio de color a rojo | [ ] |
| Active link highlight | ✅ Borde rojo + fondo rojo-50 | [ ] |
| Responsive en móvil | ✅ Sidebar colapsable | [ ] |
| Responsive en tablet | ✅ Sidebar visible, responsive | [ ] |
| Responsive en desktop | ✅ Layout completo | [ ] |

---

## 📈 Resultados Esperados

**✅ PASS:** Si todos los casos pasan  
**⚠️ WARNING:** Si hay redirecciones inesperadas pero funcionales  
**❌ FAIL:** Si alguna ruta no carga o los guards no funcionan

---

## 📝 Plantilla de Reporte

```
TEST REPORT - Arquitectura de Rutas
===================================
Fecha: ___________________
Tester: __________________
Navegador: ________________

RESUMEN:
[ ] PASS - Todos los tests exitosos
[ ] WARNING - Algunos warning pero funcional
[ ] FAIL - Errores críticos encontrados

PROBLEMAS ENCONTRADOS:
1. _________________________________
2. _________________________________
3. _________________________________

OBSERVACIONES:
- Velocidad de navegación: [ ] Rápido [ ] Normal [ ] Lento
- UX/UI: [ ] Excelente [ ] Buena [ ] Mejorable
- Funcionalidad: [ ] Perfecta [ ] Buena [ ] Parcial

SIGN OFF:
_________________  _________________
Tester             Fecha
```

---

## 🎯 Criterios de Aceptación

✅ **MUST HAVE:**
- [ ] 0 errores de compilación
- [ ] Guards funcionan correctamente
- [ ] Todas las rutas cargadas
- [ ] Sidebar muestra opciones según rol
- [ ] Redirecciones por compatibilidad funcionan

⚠️ **NICE TO HAVE:**
- [ ] Performance óptimo (< 1s por navegación)
- [ ] Transiciones suaves entre rutas
- [ ] Breadcrumbs en header
- [ ] Historial de navegación

❌ **MUST NOT:**
- [ ] Broken links
- [ ] Guards bloqueando rutas que deberían permitir
- [ ] Usuarios viendo opciones que no pueden acceder

---

## 📞 Contacto

Si encuentras problemas durante el testing:
1. Documenta el rol del usuario
2. Describe la acción exacta
3. Señala el URL intentado
4. Incluye screenshot si es posible
5. Copia el error de la consola del navegador

---

**Documento de Testing - Validación Arquitectura de Rutas**  
**Implementado: 21 de Enero de 2026**
