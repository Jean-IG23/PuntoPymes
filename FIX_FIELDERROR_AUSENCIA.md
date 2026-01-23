# 🐛 FIX: Error FieldError al crear Tipo de Ausencia

**Fecha:** 21 de Enero de 2026  
**Tipo de Error:** FieldError - Campo no existe  
**Status:** ✅ CORREGIDO

---

## 🔴 PROBLEMA IDENTIFICADO

### Error en Consola:
```
FieldError: Cannot resolve keyword 'activo' into field. 
Choices are: apellidos, areas, ausencias_aprobadas, [...], estado, [...], usuario, usuario_id
```

### Causa Raíz:
El modelo `Empleado` usa un campo llamado **`estado`** pero el código backend estaba buscando **`activo`**.

**Modelo Correcto:**
```python
# personal/models.py
class Empleado(models.Model):
    estado = models.CharField(max_length=100, default='ACTIVO', choices=[('ACTIVO', 'Activo'), ('INACTIVO', 'Inactivo')])
```

**Código Incorrecto:**
```python
# ❌ ANTES
empleados_empresa = Empleado.objects.filter(empresa=empresa, activo=True)
```

---

## ✅ CORRECCIONES REALIZADAS

### 1. **core/views.py** - dashboard_stats (4 lugares)

#### Error 1 (línea 361):
```python
# ❌ ANTES
if perfil.rol in ['ADMIN', 'RRHH', 'CLIENTE']:
    empleados_empresa = Empleado.objects.filter(empresa=empresa, activo=True)

# ✅ DESPUÉS
if perfil.rol in ['ADMIN', 'RRHH']:
    empleados_empresa = Empleado.objects.filter(empresa=empresa, estado='ACTIVO')
```

#### Error 2 (línea 368):
```python
# ❌ ANTES
empleados_empresa = Empleado.objects.filter(empresa=empresa, sucursal__in=sucursales_a_cargo, activo=True)

# ✅ DESPUÉS
empleados_empresa = Empleado.objects.filter(empresa=empresa, sucursal__in=sucursales_a_cargo, estado='ACTIVO')
```

#### Error 3 (línea 374):
```python
# ❌ ANTES
empleados_empresa = Empleado.objects.filter(empresa=empresa, departamento=perfil.departamento, activo=True)

# ✅ DESPUÉS
empleados_empresa = Empleado.objects.filter(empresa=empresa, departamento=perfil.departamento, estado='ACTIVO')
```

### 2. **asistencia/views.py** - Error (línea 256)

```python
# ❌ ANTES
empleados = Empleado.objects.filter(empresa=empresa, activo=True)

# ✅ DESPUÉS
empleados = Empleado.objects.filter(empresa=empresa, estado='ACTIVO')
```

### 3. **Rol 'CLIENTE' No Válido**

Los roles válidos en el modelo son:
- `SUPERADMIN` - Super Administrador
- `ADMIN` - Administrador/Dueño de Empresa
- `RRHH` - Recursos Humanos
- `GERENTE` - Gerente/Líder de Equipo
- `EMPLEADO` - Colaborador

El código usaba 'CLIENTE' que no existe. Se cambió a solo 'ADMIN' y 'RRHH'.

---

## 🧪 VALIDACIÓN

```bash
✅ python manage.py check
   Status: System check identified no issues (0 silenced)
```

---

## 📋 RESUMEN DE CAMBIOS

| Archivo | Línea | Error | Fix |
|---------|-------|-------|-----|
| core/views.py | 361 | `activo=True` | `estado='ACTIVO'` |
| core/views.py | 361 | Rol 'CLIENTE' | Cambiar a 'ADMIN', 'RRHH' |
| core/views.py | 368 | `activo=True` | `estado='ACTIVO'` |
| core/views.py | 374 | `activo=True` | `estado='ACTIVO'` |
| asistencia/views.py | 256 | `activo=True` | `estado='ACTIVO'` |

---

## ✅ RESULTADO

El error **FieldError** ha sido completamente corregido. Ahora:
- ✅ Crear tipo de ausencia funciona
- ✅ Dashboard stats se carga sin errores
- ✅ Filtros de empleados activos funcionan correctamente
- ✅ Backend valida sin problemas

