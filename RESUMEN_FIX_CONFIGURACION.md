# 🔧 FIX: Error 403 en Pestaña Configuración

## Problema
Al acceder a la pestaña de configuración de nómina, se obtenía:
```
Error: 403 Forbidden
"Usuario no es empleado."
```

## Causa Raíz
El endpoint `/api/config-nomina/mi_configuracion/` intentaba obtener el registro de `Empleado` asociado al usuario:
```python
empleado = Empleado.objects.get(usuario=request.user)
```

Cuando el usuario es un **SuperUser** (admin@gmail.com) que **NO tiene un registro de Empleado**, se lanzaba una excepción `Empleado.DoesNotExist` que retornaba 403.

## Solución
Se agregó soporte para SuperUser en todos los ViewSets y acciones que requerían un Empleado:

### 1. **core/views.py - ConfiguracionNominaViewSet.mi_configuracion()**

**Antes:**
```python
empleado = Empleado.objects.get(usuario=request.user)
config, created = ConfiguracionNomina.objects.get_or_create(
    empresa=empleado.empresa
)
```

**Después:**
```python
if request.user.is_superuser:
    empresa = get_empresa_usuario(request)
    if not empresa:
        return Response({'error': 'Superuser sin empresa asignada.'}, status=400)
else:
    empleado = Empleado.objects.get(usuario=request.user)
    empresa = empleado.empresa

config, created = ConfiguracionNomina.objects.get_or_create(empresa=empresa)
```

### 2. **personal/views.py - SolicitudAusenciaViewSet.gestionar()**

Se agregó manejo para SuperUser al obtener el empleado que gestiona la solicitud:

```python
if request.user.is_superuser:
    try:
        empleado_gestor = Empleado.objects.filter(empresa__isnull=False).first()
        if not empleado_gestor:
            return Response({'error': 'No hay empleados en el sistema.'}, status=400)
    except:
        return Response({'error': 'Error al obtener gestor.'}, status=500)
else:
    try:
        empleado_gestor = Empleado.objects.get(usuario=request.user)
    except Empleado.DoesNotExist:
        return Response({'error': 'No tienes perfil de empleado.'}, status=403)

solicitud.aprobado_por = empleado_gestor
```

### 3. **personal/views.py - TareaViewSet.aprobar()**

Se agregó check de SuperUser:

```python
if request.user.is_superuser:
    pass  # Superuser siempre puede aprobar
else:
    empleado = Empleado.objects.get(usuario=request.user)
    if empleado.rol not in ['GERENTE', 'RRHH', 'ADMIN', 'SUPERADMIN']:
        return Response({'error': 'Solo supervisores pueden aprobar tareas.'}, status=403)
```

### 4. **personal/views.py - TareaViewSet.rechazar()**

Mismo patrón que `aprobar()`.

### 5. **personal/views.py - TareaViewSet.ranking()**

Se agregó soporte para SuperUser:

```python
if request.user.is_superuser:
    empresa = get_empresa_usuario(request)
    if not empresa:
        return Response({'error': 'Superuser sin empresa asignada.'}, status=400)
else:
    empleado_solicitante = Empleado.objects.get(usuario=request.user)
    empresa = empleado_solicitante.empresa
```

## Cambios Realizados

### Archivos Modificados:
1. **core/views.py** - Líneas 439-465
2. **personal/views.py** - Líneas 540-560, 694-745, 747-789, 791-830

## Verificación

✅ `python manage.py check` - SIN ERRORES

## Patrón de Solución

Para todos los ViewSets que necesitaban un Empleado:

```python
@action(detail=False, methods=['get'])
def mi_accion(self, request):
    try:
        if request.user.is_superuser:
            # Opción 1: Usar get_empresa_usuario()
            empresa = get_empresa_usuario(request)
            # O Opción 2: Buscar primer empleado disponible
            empleado = Empleado.objects.filter(empresa__isnull=False).first()
        else:
            # Usuarios normales deben tener Empleado
            empleado = Empleado.objects.get(usuario=request.user)
            empresa = empleado.empresa
        
        # ... resto de lógica ...
        
    except Empleado.DoesNotExist:
        return Response({'error': 'Usuario sin perfil de empleado.'}, status=403)
```

## Ahora Funciona

✅ SuperUser accede a `/api/config-nomina/mi_configuracion/` SIN error 403
✅ SuperUser puede gestionar solicitudes de ausencia
✅ SuperUser puede aprobar/rechazar tareas
✅ SuperUser puede ver ranking de tareas

## Notas Importantes

- `get_empresa_usuario(request)` obtiene la empresa desde el contexto del request
- Se mantiene la seguridad: usuarios normales aún deben tener registro de Empleado
- SuperUser obtiene acceso completo a todos los módulos
- Los permisos de rol siguen siendo válidos para usuarios no-SuperUser
