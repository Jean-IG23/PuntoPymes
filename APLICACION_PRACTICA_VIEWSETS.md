# 🔧 APLICACIÓN PRÁCTICA - CÓMO ACTUALIZAR CADA VIEWSET

## 📝 Introducción

Este documento te muestra **exactamente dónde y cómo** aplicar los decoradores de permisos en cada ViewSet existente.

---

## 🔄 PASO 0: Importar en la parte superior

En cada archivo `views.py` que vayas a modificar, agregar:

```python
from core.permissions import (
    require_roles,
    require_permission,
    get_queryset_filtrado,
    get_empleado_o_none,
)
```

---

## 📍 VIEWSETS A ACTUALIZAR

### 1. EmpleadoViewSet (personal/views.py)

**Ubicación aproximada:** Línea 35-160

```python
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated]

    # CAMBIO 1: Filtrar queryset
    def get_queryset(self):
        """Retorna empleados según el rol del usuario"""
        queryset = super().get_queryset()
        return get_queryset_filtrado(
            self.request.user,
            queryset,
            campo_empresa='empresa',
            campo_sucursal='sucursal'
        )
    
    # CAMBIO 2: Proteger create
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def create(self, request, *args, **kwargs):
        """Solo ADMIN y RRHH pueden crear empleados"""
        return super().create(request, *args, **kwargs)
    
    # CAMBIO 3: Proteger update
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def update(self, request, *args, **kwargs):
        """Solo ADMIN y RRHH pueden editar empleados"""
        return super().update(request, *args, **kwargs)
    
    # CAMBIO 4: Proteger destroy
    @require_roles('ADMIN', 'SUPERADMIN')
    def destroy(self, request, *args, **kwargs):
        """Solo ADMIN puede eliminar empleados"""
        return super().destroy(request, *args, **kwargs)
```

**Resumen de cambios:**
- ✅ `create()` → @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
- ✅ `update()` → @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
- ✅ `destroy()` → @require_roles('ADMIN', 'SUPERADMIN')
- ✅ `get_queryset()` → usar get_queryset_filtrado()

---

### 2. TareaViewSet (personal/views.py)

**Ubicación aproximada:** Línea 700-900

```python
class TareaViewSet(viewsets.ModelViewSet):
    queryset = Tarea.objects.all()
    
    # CAMBIO 1: Filtrar queryset
    def get_queryset(self):
        """Retorna tareas según el rol del usuario"""
        queryset = super().get_queryset()
        return get_queryset_filtrado(
            self.request.user,
            queryset,
            campo_empresa='empresa',
            campo_sucursal='sucursal'  # Ajustar si es diferente
        )
    
    # CAMBIO 2: Proteger create
    @require_permission('tareas', 'crear')
    def create(self, request, *args, **kwargs):
        """Crear tarea - ADMIN, RRHH, GERENTE pueden"""
        return super().create(request, *args, **kwargs)
    
    # CAMBIO 3: Proteger aprobar
    @require_permission('tareas', 'aprobar')
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar tarea - ADMIN, RRHH, GERENTE pueden"""
        tarea = self.get_object()
        tarea.estado = 'COMPLETADA'  # o lo que uses
        tarea.save()
        return Response({'status': 'aprobada'})
    
    # CAMBIO 4: Proteger rechazar
    @require_permission('tareas', 'rechazar')
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar tarea - ADMIN, RRHH, GERENTE pueden"""
        tarea = self.get_object()
        # Lógica de rechazo...
        return Response({'status': 'rechazada'})
```

**Resumen de cambios:**
- ✅ `create()` → @require_permission('tareas', 'crear')
- ✅ `aprobar()` → @require_permission('tareas', 'aprobar')
- ✅ `rechazar()` → @require_permission('tareas', 'rechazar')
- ✅ `get_queryset()` → usar get_queryset_filtrado()

---

### 3. SolicitudAusenciaViewSet (personal/views.py)

**Ubicación aproximada:** Línea 500-650

```python
class SolicitudAusenciaViewSet(viewsets.ModelViewSet):
    
    # CAMBIO 1: Filtrar queryset
    def get_queryset(self):
        """Retorna ausencias según el rol del usuario"""
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        
        try:
            empleado = Empleado.objects.get(usuario=self.request.user)
            
            # ADMIN y RRHH: ven todas de su empresa
            if empleado.rol in ['ADMIN', 'RRHH']:
                return queryset.filter(empresa=empleado.empresa)
            
            # GERENTE: solo de su sucursal
            if empleado.rol == 'GERENTE':
                return queryset.filter(sucursal=empleado.sucursal)
            
            # EMPLEADO: solo las propias
            return queryset.filter(empleado=empleado)
        except:
            return queryset.none()
    
    # CAMBIO 2: Proteger aprobar
    @require_permission('ausencias', 'aprobar')
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        """Aprobar ausencia - ADMIN, RRHH, GERENTE pueden"""
        solicitud = self.get_object()
        
        # Validación adicional: GERENTE solo su equipo
        if not request.user.is_superuser:
            empleado = Empleado.objects.get(usuario=request.user)
            if empleado.rol == 'GERENTE':
                if solicitud.empleado.sucursal != empleado.sucursal:
                    return Response(
                        {'error': 'Solo puedes aprobar ausencias de tu equipo'}, 
                        status=403
                    )
        
        solicitud.estado = 'APROBADA'
        solicitud.save()
        return Response({'status': 'aprobada'})
    
    # CAMBIO 3: Proteger rechazar
    @require_permission('ausencias', 'rechazar')
    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        """Rechazar ausencia - ADMIN, RRHH, GERENTE pueden"""
        solicitud = self.get_object()
        
        # Validación adicional: GERENTE solo su equipo
        if not request.user.is_superuser:
            empleado = Empleado.objects.get(usuario=request.user)
            if empleado.rol == 'GERENTE':
                if solicitud.empleado.sucursal != empleado.sucursal:
                    return Response(
                        {'error': 'Solo puedes rechazar ausencias de tu equipo'}, 
                        status=403
                    )
        
        solicitud.estado = 'RECHAZADA'
        solicitud.save()
        return Response({'status': 'rechazada'})
```

**Resumen de cambios:**
- ✅ `get_queryset()` → Filtrado por rol
- ✅ `aprobar()` → @require_permission('ausencias', 'aprobar')
- ✅ `rechazar()` → @require_permission('ausencias', 'rechazar')

---

### 4. ConfiguracionNominaViewSet (core/views.py)

**Ubicación aproximada:** Línea 460-530

**YA TIENE VALIDACIONES** pero puede mejorar:

```python
class ConfiguracionNominaViewSet(viewsets.GenericViewSet):
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def mi_configuracion(self, request):
        """Ver/editar configuración de nómina"""
        try:
            if request.user.is_superuser:
                empresa = get_empresa_usuario(request.user)
                config = ConfiguracionNomina.objects.get(empresa=empresa)
            else:
                empleado = Empleado.objects.get(usuario=request.user)
                
                # Solo ADMIN, RRHH pueden ver/editar
                if empleado.rol not in ['ADMIN', 'RRHH']:
                    return Response(
                        {'error': 'Solo ADMIN y RRHH pueden acceder'},
                        status=403
                    )
                
                config = ConfiguracionNomina.objects.get(empresa=empleado.empresa)
            
            if request.method == 'GET':
                serializer = self.get_serializer(config)
                return Response(serializer.data)
            
            elif request.method in ['PUT', 'PATCH']:
                serializer = self.get_serializer(config, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=400)
        
        except Exception as e:
            return Response({'error': str(e)}, status=400)
```

**Resumen de cambios:**
- ✅ Ya está bastante bien, solo mejorar mensajes de error

---

### 5. DocumentoViewSet (personal/views.py)

**Ubicación aproximada:** Línea 580-620

```python
class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoEmpleado.objects.all()
    
    def get_queryset(self):
        """Documentos visibles según rol"""
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        
        try:
            empleado = Empleado.objects.get(usuario=self.request.user)
            
            # ADMIN y RRHH: ven todos de su empresa
            if empleado.rol in ['ADMIN', 'RRHH']:
                return queryset.filter(empresa=empleado.empresa)
            
            # EMPLEADO: solo sus documentos
            return queryset.filter(empleado=empleado)
        except:
            return queryset.none()
    
    # CAMBIO: Proteger create
    @require_roles('ADMIN', 'RRHH')
    def create(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden cargar documentos"""
        return super().create(request, *args, **kwargs)
```

**Resumen de cambios:**
- ✅ `create()` → @require_roles('ADMIN', 'RRHH')
- ✅ `get_queryset()` → Mantener filtrado por rol

---

### 6. ContratoViewSet (personal/views.py)

**Ubicación aproximada:** Línea 380-420

```python
class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    
    def get_queryset(self):
        """Contratos visibles según rol"""
        queryset = super().get_queryset()
        return get_queryset_filtrado(
            self.request.user,
            queryset,
            campo_empresa='empresa',
            campo_sucursal='sucursal'  # Si aplica
        )
    
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def create(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden crear contratos"""
        return super().create(request, *args, **kwargs)
    
    @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
    def update(self, request, *args, **kwargs):
        """Solo ADMIN, RRHH pueden editar contratos"""
        return super().update(request, *args, **kwargs)
```

**Resumen de cambios:**
- ✅ `create()` → @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
- ✅ `update()` → @require_roles('ADMIN', 'RRHH', 'SUPERADMIN')

---

### 7. OtrosViewSets (core/views.py)

Para los siguientes, aplicar el patrón similar:

#### PuestoViewSet
```python
@require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
def create(self, request, *args, **kwargs):
    return super().create(request, *args, **kwargs)

@require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
def update(self, request, *args, **kwargs):
    return super().update(request, *args, **kwargs)
```

#### DepartamentoViewSet
```python
@require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
def create(self, request, *args, **kwargs):
    return super().create(request, *args, **kwargs)
```

#### TurnoViewSet
```python
@require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
def create(self, request, *args, **kwargs):
    return super().create(request, *args, **kwargs)
```

#### TipoAusenciaViewSet
```python
# Ya tiene validaciones, pero mejorar:
@require_roles('ADMIN', 'RRHH', 'SUPERADMIN')
def create(self, request, *args, **kwargs):
    return super().create(request, *args, **kwargs)
```

---

## 🎨 PATRÓN GENERAL

Para CADA ViewSet, agregar:

```python
# 1. Importar arriba
from core.permissions import require_roles, get_queryset_filtrado

# 2. En la clase
class MiViewSet(viewsets.ModelViewSet):
    
    # 3. Filtrar queryset
    def get_queryset(self):
        return get_queryset_filtrado(
            self.request.user,
            super().get_queryset()
        )
    
    # 4. Proteger operaciones sensibles
    @require_roles('ADMIN', 'RRHH')
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

---

## ✅ CHECKLIST DE CAMBIOS

### Archivo: personal/views.py
- [ ] Agregar imports de permissions.py
- [ ] EmpleadoViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger create()
  - [ ] Proteger update()
  - [ ] Proteger destroy()
- [ ] TareaViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger create()
  - [ ] Proteger aprobar()
  - [ ] Proteger rechazar()
- [ ] SolicitudAusenciaViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger aprobar()
  - [ ] Proteger rechazar()
- [ ] DocumentoViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger create()
- [ ] ContratoViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger create()
  - [ ] Proteger update()

### Archivo: core/views.py
- [ ] Agregar imports de permissions.py
- [ ] ConfiguracionNominaViewSet: Revisar (casi listo)
- [ ] PuestoViewSet:
  - [ ] Proteger create()
  - [ ] Proteger update()
- [ ] DepartamentoViewSet:
  - [ ] Proteger create()
- [ ] TurnoViewSet:
  - [ ] Proteger create()
- [ ] OtroViewSet (según existan):
  - [ ] Proteger operations sensibles

### Archivo: asistencia/views.py
- [ ] Agregar imports
- [ ] JornadaViewSet:
  - [ ] Actualizar get_queryset() (ya tiene lógica)
  - [ ] Proteger create()
- [ ] EventoAsistenciaViewSet:
  - [ ] Actualizar get_queryset() (ya tiene)

### Archivo: kpi/views.py
- [ ] Agregar imports
- [ ] ObjetivoViewSet:
  - [ ] Actualizar get_queryset()
  - [ ] Proteger create()
  - [ ] Proteger update()

---

## 🧪 Testing Después de Cambios

Después de cada cambio, ejecutar:

```bash
# Validar sintaxis
python manage.py check

# Si la sintaxis está bien (System check identified no issues)
# Ejecutar un test rápido con cada rol:

# Como SUPERADMIN
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_SUPER" \
  -d '{...}'
# Esperado: 201 Created ✅

# Como GERENTE
curl -X POST http://localhost:8000/api/empleados/ \
  -H "Authorization: Token TOKEN_GERENTE" \
  -d '{...}'
# Esperado: 403 Forbidden ✅
```

---

## 📝 NOTAS IMPORTANTES

1. **SuperUser siempre pasa**: No importa qué, si `is_superuser=True`, siempre puede
2. **Excepciones por rol**: Algunos permisos pueden tener validaciones adicionales
3. **GERENTE solo su equipo**: Aunque pueda crear tareas, solo de empleados de su sucursal
4. **Mantener documentación**: Documentar excepciones y casos especiales
5. **Testing exhaustivo**: Probar con cada rol después de implementar

---

## 🚀 Orden Recomendado de Implementación

**Día 1:**
- [ ] core/permissions.py ✅ (ya creado)
- [ ] EmpleadoViewSet
- [ ] Testing EmpleadoViewSet

**Día 2:**
- [ ] TareaViewSet
- [ ] SolicitudAusenciaViewSet
- [ ] Testing

**Día 3:**
- [ ] OtrosViewSets
- [ ] Testing completo

**Día 4:**
- [ ] Frontend guards
- [ ] Testing de navegación

**Día 5:**
- [ ] Testing final
- [ ] Deploy

---

## 💡 Próxima Lectura

Después de implementar esto, leer:
→ [CHECKLIST_IMPLEMENTACION_ROLES.md](CHECKLIST_IMPLEMENTACION_ROLES.md) para testing completo
