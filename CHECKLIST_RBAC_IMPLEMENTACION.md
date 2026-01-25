# ✅ CHECKLIST DE IMPLEMENTACIÓN - RBAC AVANZADO

**Proyecto**: TalentTrack RBAC 2.0  
**Fecha Inicio**: Enero 23, 2026  
**Estado**: 🔄 EN PROGRESO

---

## 📌 FASES DE IMPLEMENTACIÓN

### FASE 1: PREPARACIÓN Y ANÁLISIS ✅

- [x] Definir nuevos roles jerárquicos (ADMIN_GLOBAL, GERENTE_SUCURSAL, EMPLEADO_SUPERVISOR, EMPLEADO)
- [x] Crear matriz de permisos completa
- [x] Diseñar flujos de workflow
- [x] Documentar restricciones de UI
- [x] Crear archivos: `rbac_avanzado.py` y `workflows.py`
- [x] Documentar en `ARQUITECTURA_RBAC_AVANZADA.md`

**Tiempo Estimado**: 2 horas ✅ COMPLETADO

---

### FASE 2: ACTUALIZACIÓN DE MODELOS 🔄

#### 2.1 Actualizar Roles en Empleado

- [ ] Migración Django para cambiar opciones de ROL
  ```python
  ROLES = [
      ('ADMIN_GLOBAL', 'Administrador Global (RRHH)'),
      ('GERENTE_SUCURSAL', 'Gerente de Sucursal'),
      ('EMPLEADO_SUPERVISOR', 'Empleado Supervisor'),
      ('EMPLEADO', 'Empleado'),
  ]
  ```

- [ ] `python manage.py makemigrations`
- [ ] `python manage.py migrate`

#### 2.2 Actualizar Campo en SolicitudAusencia

- [ ] Agregar campo `aprobador_asignado` (FK a Empleado)
  ```python
  aprobador_asignado = models.ForeignKey(
      'personal.Empleado',
      on_delete=models.SET_NULL,
      null=True,
      blank=True,
      related_name='solicitudes_a_aprobar'
  )
  ```

- [ ] Agregar campos de auditoría:
  ```python
  aprobado_por_gerente = models.ForeignKey(...)
  aprobado_por_rrhh = models.ForeignKey(...)
  rechazado_por_gerente = models.ForeignKey(...)
  rechazado_por_rrhh = models.ForeignKey(...)
  fecha_asignacion = models.DateTimeField(null=True)
  fecha_aprobacion_gerente = models.DateTimeField(null=True)
  fecha_aprobacion_rrhh = models.DateTimeField(null=True)
  fecha_rechazo = models.DateTimeField(null=True)
  motivo_rechazo = models.TextField(blank=True)
  ```

- [ ] Migración: `python manage.py makemigrations`
- [ ] `python manage.py migrate`

**Tiempo Estimado**: 1 hora

---

### FASE 3: IMPLEMENTACIÓN DE RBAC 🔄

#### 3.1 Instalar y Configurar rbac_avanzado.py

- [ ] Copiar `rbac_avanzado.py` a `core/rbac_avanzado.py`
- [ ] En `core/__init__.py`, importar:
  ```python
  from .rbac_avanzado import (
      filter_queryset_por_rol,
      tiene_permiso,
      require_permission,
      RLSQuerySetMixin,
  )
  ```

#### 3.2 Implementar RLS en ViewSets

- [ ] Actualizar `EmpleadoViewSet`:
  ```python
  from core.rbac_avanzado import RLSQuerySetMixin
  
  class EmpleadoViewSet(RLSQuerySetMixin, viewsets.ModelViewSet):
      queryset = Empleado.objects.all()
      # get_queryset() hereda de RLSQuerySetMixin
  ```

- [ ] Actualizar `AsistenciaViewSet` (mismo patrón)
- [ ] Actualizar `TareaViewSet` (mismo patrón)
- [ ] Actualizar `SolicitudAusenciaViewSet` (mismo patrón)
- [ ] Actualizar `ObjetivoViewSet` (mismo patrón)
- [ ] Actualizar `NominaViewSet` (mismo patrón)

#### 3.3 Agregar Decoradores de Permisos

- [ ] En `SolicitudAusenciaViewSet.approve()`:
  ```python
  @require_permission('ausencias', 'aprobar')
  def approve(self, request, pk):
      # ...
  ```

- [ ] En `EmpleadoViewSet.create()`:
  ```python
  @require_permission('empleados', 'crear')
  def create(self, request):
      # ...
  ```

- [ ] En todos los métodos críticos

**Tiempo Estimado**: 2-3 horas

---

### FASE 4: IMPLEMENTACIÓN DE WORKFLOWS 🔄

#### 4.1 Instalar workflows.py

- [ ] Copiar `workflows.py` a `core/workflows.py`
- [ ] En `core/__init__.py`:
  ```python
  from .workflows import (
      enrutar_solicitud_ausencia,
      aprobar_solicitud_ausencia,
      rechazar_solicitud_ausencia,
      obtener_gerente_responsable,
  )
  ```

#### 4.2 Implementar Signals

- [ ] En `personal/signals.py` o `core/signals.py`:
  ```python
  from django.db.models.signals import post_save
  from core.workflows import enrutar_solicitud_ausencia
  
  @receiver(post_save, sender=SolicitudAusencia)
  def solicitud_creada(sender, instance, created, **kwargs):
      if created and instance.estado == 'PENDIENTE_GERENTE':
          enrutar_solicitud_ausencia(instance)
  ```

- [ ] Registrar signals en `apps.py`:
  ```python
  def ready(self):
      import core.signals
  ```

#### 4.3 Crear Endpoints de Aprobación

- [ ] `SolicitudAusenciaViewSet` método `approve_solicitud()`:
  ```python
  @action(detail=True, methods=['post'])
  def approve_solicitud(self, request, pk=None):
      from core.workflows import aprobar_solicitud_ausencia
      solicitud = self.get_object()
      exito, msg = aprobar_solicitud_ausencia(
          solicitud, 
          request.user.empleado,
          request.data.get('comentarios', '')
      )
      return Response({'exito': exito, 'mensaje': msg})
  ```

- [ ] `SolicitudAusenciaViewSet` método `reject_solicitud()`:
  ```python
  @action(detail=True, methods=['post'])
  def reject_solicitud(self, request, pk=None):
      from core.workflows import rechazar_solicitud_ausencia
      solicitud = self.get_object()
      exito, msg = rechazar_solicitud_ausencia(
          solicitud,
          request.user.empleado,
          request.data['motivo']
      )
      return Response({'exito': exito, 'mensaje': msg})
  ```

**Tiempo Estimado**: 2 horas

---

### FASE 5: VALIDACIONES EN VISTAS 🔄

#### 5.1 Actualizar SolicitudAusenciaViewSet

- [ ] En `create()`:
  ```python
  def create(self, request):
      serializer = self.get_serializer(data=request.data)
      serializer.is_valid(raise_exception=True)
      
      # Validar: ¿Puede crear solicitud?
      if not tiene_permiso(request.user, 'ausencias', 'crear'):
          return Response({'error': 'No tienes permiso'}, status=403)
      
      self.perform_create(serializer)
      return Response(serializer.data, status=201)
  ```

#### 5.2 Actualizar TareaViewSet

- [ ] En `create()`:
  ```python
  def create(self, request):
      # Validar permisos
      if not tiene_permiso(request.user, 'tareas', 'crear'):
          return Response({'error': 'No tienes permiso'}, status=403)
      
      # Validar RLS: ¿El asignado es de su ámbito?
      empleado_user = request.user.empleado
      asignado_a_id = request.data.get('asignado_a')
      
      # ... validar con validar_puede_crear_tarea
      
      return super().create(request)
  ```

**Tiempo Estimado**: 1.5 horas

---

### FASE 6: RESTRICCIONES DE UI (FRONTEND) 🔄

#### 6.1 Actualizar AuthService

- [ ] En `auth.service.ts`:
  ```typescript
  isAdminGlobal(): boolean {
    return this.getRole() === 'ADMIN_GLOBAL';
  }
  
  isGerenteSucursal(): boolean {
    return this.getRole() === 'GERENTE_SUCURSAL';
  }
  
  isSupervisor(): boolean {
    return this.getRole() === 'EMPLEADO_SUPERVISOR';
  }
  
  isEmpleado(): boolean {
    return this.getRole() === 'EMPLEADO';
  }
  ```

#### 6.2 Actualizar Menú Principal

- [ ] En `main-layout.component.html`:
  ```html
  <!-- Módulo Org Chart - SOLO ADMIN_GLOBAL -->
  <a *ngIf="auth.isAdminGlobal()" routerLink="/org-chart">
    Estructura Organizacional
  </a>
  
  <!-- Módulo Reportes - ADMIN + GERENTE + SUPERVISOR -->
  <a *ngIf="auth.isAdminGlobal() || auth.isGerenteSucursal() || auth.isSupervisor()"
     routerLink="/reportes">
    Reportes
  </a>
  
  <!-- Módulo Solicitudes - ADMIN + GERENTE (aprueban) + EMPLEADO (crea) -->
  <a routerLink="/solicitudes">
    Solicitudes de Ausencia
  </a>
  ```

#### 6.3 Actualizar Rutas Protegidas

- [ ] En `app.routes.ts`:
  ```typescript
  {
    path: 'org-chart',
    component: OrgChartComponent,
    canActivate: [roleBasedGuard],
    data: { roles: ['ADMIN_GLOBAL'] }  // SOLO ADMIN_GLOBAL
  },
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [roleBasedGuard],
    data: { roles: ['ADMIN_GLOBAL'] }  // SOLO ADMIN_GLOBAL
  },
  {
    path: 'nomina',
    component: NominaComponent,
    canActivate: [roleBasedGuard],
    data: { roles: ['ADMIN_GLOBAL', 'EMPLEADO'] }  // ADMIN ve todas, EMPLEADO ve su propia
  }
  ```

#### 6.4 Actualizar Componentes de Solicitudes

- [ ] `solicitudes.component.html`:
  ```html
  <!-- Si GERENTE_SUCURSAL, mostrar lista de solicitudes para aprobar -->
  <div *ngIf="auth.isGerenteSucursal()">
    <h2>Solicitudes de tu Equipo (Por Aprobar)</h2>
    <table>
      <tr *ngFor="let sol of solicitudesPendientes">
        <td>{{ sol.empleado.nombres }}</td>
        <td>{{ sol.tipo }}</td>
        <td>
          <button (click)="aprobar(sol)">Aprobar</button>
          <button (click)="rechazar(sol)">Rechazar</button>
        </td>
      </tr>
    </table>
  </div>
  
  <!-- Si EMPLEADO, mostrar sus solicitudes -->
  <div *ngIf="auth.isEmpleado()">
    <h2>Mis Solicitudes</h2>
    <button (click)="crearNuevaSolicitud()">Nueva Solicitud</button>
    <table>
      <tr *ngFor="let sol of misSolicitudes">
        <td>{{ sol.tipo }}</td>
        <td>{{ sol.estado }}</td>
      </tr>
    </table>
  </div>
  ```

**Tiempo Estimado**: 2.5 horas

---

### FASE 7: TESTING Y VALIDACIÓN 🔄

#### 7.1 Tests Unitarios - Backend

- [ ] Test: `puede_ver_empleado()` funciona correctamente
  ```python
  def test_gerente_no_puede_ver_otra_sucursal(self):
      gerente_quito = Empleado.objects.create(
          rol='GERENTE_SUCURSAL',
          sucursal=quito
      )
      empleado_guayaquil = Empleado.objects.create(
          sucursal=guayaquil
      )
      
      assert not puede_ver_empleado(gerente_quito.usuario, empleado_guayaquil)
  ```

- [ ] Test: RLS filtra correctamente
- [ ] Test: Permisos se validan en decoradores
- [ ] Test: Workflows enrutan a gerente correcto

#### 7.2 Tests Unitarios - Frontend

- [ ] Test: `isAdminGlobal()` retorna true solo para ADMIN_GLOBAL
- [ ] Test: Módulo Org Chart no aparece para no-admin
- [ ] Test: Botones de aprobación solo aparecen para GERENTE

#### 7.3 Tests de Integración

- [ ] Crear solicitud de ausencia → Valida enrutamiento automático
- [ ] Gerente aprueba → Valida notificación y cambio de estado
- [ ] Intento de acceso no autorizado → Valida RLS y respuesta 403

#### 7.4 Tests Manuales de Seguridad

- [ ] [ ] Gerente intenta ver Org Chart → Bloqueado ✅
- [ ] [ ] Gerente intenta ver empleados de otra sucursal → RLS filtra ✅
- [ ] [ ] Empleado intenta crear tarea para otro → Bloqueado ✅
- [ ] [ ] Empleado ve su nómina → Permitido ✅
- [ ] [ ] Empleado intenta ver nómina de otro → Bloqueado ✅

**Tiempo Estimado**: 3-4 horas

---

### FASE 8: AUDITORÍA Y LOGGING 🔄

- [ ] Crear modelo `AuditoriaAcceso`:
  ```python
  class AuditoriaAcceso(models.Model):
      usuario = models.ForeignKey(User, on_delete=models.CASCADE)
      accion = models.CharField(max_length=100)
      resultado = models.CharField(max_length=10)  # 'EXITO' / 'BLOQUEADO'
      ip_address = models.GenericIPAddressField()
      timestamp = models.DateTimeField(auto_now_add=True)
  ```

- [ ] Registrar en auditoría:
  - Intentos de acceso no autorizado
  - Aprobaciones/rechazos de solicitudes
  - Cambios de rol

- [ ] En decoradores:
  ```python
  def require_permission(modulo, accion):
      def decorator(view_func):
          @wraps(view_func)
          def wrapper(self, request, *args, **kwargs):
              tiene_perm = tiene_permiso(request.user, modulo, accion)
              
              # Registrar en auditoría
              AuditoriaAcceso.objects.create(
                  usuario=request.user,
                  accion=f'{modulo}:{accion}',
                  resultado='EXITO' if tiene_perm else 'BLOQUEADO',
                  ip_address=get_client_ip(request)
              )
              
              if not tiene_perm:
                  return Response({'error': 'Acceso denegado'}, status=403)
              
              return view_func(self, request, *args, **kwargs)
          return wrapper
      return decorator
  ```

**Tiempo Estimado**: 1.5 horas

---

### FASE 9: DESPLIEGUE Y VALIDACIÓN FINAL 🔄

- [ ] Crear backup de BD en producción
- [ ] Ejecutar migraciones en staging
- [ ] Tests en staging:
  - [ ] Login con diferentes roles
  - [ ] Validar RLS en cada módulo
  - [ ] Validar restricciones UI
  - [ ] Validar workflows
- [ ] Deploy a producción
- [ ] Monitoreo post-deploy (24 horas)
- [ ] Documentar cambios para usuarios

**Tiempo Estimado**: 2-3 horas

---

## 📊 TIEMPO TOTAL ESTIMADO

| Fase | Descripción | Horas |
|------|-------------|-------|
| 1 | Preparación y Análisis | 2 ✅ |
| 2 | Actualización de Modelos | 1 |
| 3 | Implementación de RBAC | 2-3 |
| 4 | Implementación de Workflows | 2 |
| 5 | Validaciones en Vistas | 1.5 |
| 6 | Restricciones de UI | 2.5 |
| 7 | Testing y Validación | 3-4 |
| 8 | Auditoría y Logging | 1.5 |
| 9 | Despliegue y Validación Final | 2-3 |
| **TOTAL** | | **18-22 horas** |

---

## 🎯 CRITERIOS DE ACEPTACIÓN

Antes de marcar como COMPLETADO, validar:

### Seguridad
- [ ] No hay data leakage entre empresas/sucursales
- [ ] Cada rol solo ve datos permitidos
- [ ] Permisos se validan en backend (no solo frontend)
- [ ] Intentos no autorizados se registran

### Funcionalidad
- [ ] Solicitudes se enrutan automáticamente
- [ ] Workflows funcionan correctamente
- [ ] Notificaciones se envían en tiempo real
- [ ] Aprobaciones/rechazos cambian estados correctamente

### User Experience
- [ ] Menús se muestran/ocultan según rol
- [ ] Botones deshabilitados si no hay permiso
- [ ] Mensajes de error claros
- [ ] Navegación intuitiva

### Performance
- [ ] RLS no causa queries lentas
- [ ] Paginación funciona con RLS
- [ ] Sin N+1 queries

---

## 📝 NOTAS IMPORTANTES

1. **Backup**: Hacer backup completo antes de fase 2
2. **Testing**: Cada fase debe pasar tests antes de continuar
3. **Documentación**: Actualizar README después de cada fase
4. **Comunicación**: Informar a usuarios de cambios de UI
5. **Rollback**: Tener plan de rollback disponible

---

**Versión**: 2.0  
**Estado**: 🔄 EN PROGRESO  
**Última Actualización**: Enero 23, 2026
