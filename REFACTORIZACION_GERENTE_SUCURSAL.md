# 🎯 REFACTORIZACIÓN: UN GERENTE = RESPONSABLE ÚNICO DE SUCURSAL

## Cambios Implementados

### 1. ✅ Modelo `Empleado` (personal/models.py)

**Cambio:**
```python
# ❌ ANTES
rol = CharField(choices=ROLES)
lider_area = ForeignKey(Area)  # Confuso: Qué es un líder de área?

# ✅ DESPUÉS
rol = CharField(choices=ROLES)
sucursal_a_cargo = ForeignKey(Sucursal, related_name='gerentes_a_cargo')  # Claro
```

**Ventajas:**
- Un Gerente es responsable de UNA sucursal
- No hay ambigüedad sobre responsabilidades
- Fácil de entender en UI/UX

### 2. ✅ Validaciones en Modelo (personal/models.py)

**Cambio:**
```python
# Ahora validamos dos cosas:

# 1. Un GERENTE DEBE tener sucursal_a_cargo asignada
if self.rol == 'GERENTE' and not self.sucursal_a_cargo:
    raise ValidationError('Un Gerente debe estar a cargo de una sucursal.')

# 2. Una SUCURSAL solo puede tener UN gerente
other_gerentes = Empleado.objects.filter(
    rol='GERENTE',
    sucursal_a_cargo=self.sucursal_a_cargo,
    empresa=self.empresa
).exclude(pk=self.pk)

if other_gerentes.exists():
    raise ValidationError('La sucursal ya tiene un gerente asignado.')
```

### 3. ✅ Permisos y Filtrado (core/permissions.py)

**Cambio 1: `can_access_sucursal_data()`**
```python
# GERENTE: solo su sucursal_a_cargo (no su sucursal de trabajo)
if empleado.rol == 'GERENTE':
    return empleado.sucursal_a_cargo_id == sucursal_id
```

**Cambio 2: `get_queryset_filtrado()`**
```python
# GERENTE: solo empleados de su sucursal_a_cargo
if empleado.rol == 'GERENTE':
    if empleado.sucursal_a_cargo:
        return queryset.filter(sucursal=empleado.sucursal_a_cargo)
    return queryset.none()
```

### 4. ✅ Migración (personal/migrations/0004_...)

**Qué hace:**
1. Agrega nuevo campo `sucursal_a_cargo` a Empleado
2. Migra datos: Si empleado es GERENTE → `sucursal_a_cargo = sucursal actual`
3. Elimina el antiguo campo `lider_area`

**Ejecutar migración:**
```bash
python manage.py migrate
```

---

## 📊 MATRIZ DE CAMBIO

| Concepto | Antes | Después |
|----------|-------|---------|
| **Campo** | `Empleado.lider_area` (Area) | `Empleado.sucursal_a_cargo` (Sucursal) |
| **Significado** | Líder de qué área | Responsable de qué sucursal |
| **Restricción** | Ninguna | 1 GERENTE = 1 SUCURSAL |
| **Acceso Datos** | Ambiguo | Claro: Solo su sucursal |
| **Migración** | - | `sucursal_a_cargo = sucursal` para GERENTEs |

---

## 🔄 CASOS DE USO

### Caso 1: Crear un GERENTE (Correctamente)

```
POST /api/empleados/

{
  "nombres": "Mateo",
  "rol": "GERENTE",
  "sucursal": 5,  # Dónde trabaja
  "sucursal_a_cargo": 5,  # Qué sucursal supervisa
  "departamento": 12,
  ...
}

✅ VÁLIDO: El gerente supervisa la misma sucursal donde trabaja
```

### Caso 2: Transferir GERENTE a nueva sucursal

```
PATCH /api/empleados/42/

{
  "rol": "GERENTE",
  "sucursal": 6,  # Cambiar dónde trabaja
  "sucursal_a_cargo": 6,  # Cambiar qué supervisa
}

✅ Automáticamente tiene acceso a datos de sucursal 6
```

### Caso 3: Degradar GERENTE a EMPLEADO

```
PATCH /api/empleados/42/

{
  "rol": "EMPLEADO",
  "sucursal_a_cargo": null,  # Límpialo automáticamente
}

✅ El sistema lo quita de la responsabilidad
```

---

## 🚀 IMPACTO EN OTRAS ÁREAS

### Frontend (Angular)
**Cambio en empleado-form.component.ts:**
```html
<!-- ANTES -->
<select name="lider_area" *ngIf="rol === 'GERENTE'">
  <option *ngFor="let area of areas">{{ area.nombre }}</option>
</select>

<!-- DESPUÉS -->
<select name="sucursal_a_cargo" *ngIf="rol === 'GERENTE'">
  <option *ngFor="let sucursal of sucursales">{{ sucursal.nombre }}</option>
</select>
```

### Vistas (ViewSets)
**Automático:** El filtrado funciona sin cambios en lógica porque usamos `get_queryset_filtrado()`

### Serializers
**Cambio necesario:** Actualizar `EmpleadoSerializer`
```python
# Agregar campo sucursal_a_cargo
class EmpleadoSerializer(serializers.ModelSerializer):
    sucursal_a_cargo = SucursalSerializer(read_only=True)
    
    class Meta:
        fields = [..., 'sucursal_a_cargo']
```

---

## ⚠️ PASOS A EJECUTAR

### Paso 1: Aplicar migración
```bash
python manage.py migrate personal
```

### Paso 2: Verificar datos
```bash
python manage.py shell
>>> from personal.models import Empleado
>>> Empleado.objects.filter(rol='GERENTE').values('nombres', 'sucursal_a_cargo')
```

### Paso 3: Actualizar Frontend (más adelante)
- Cambiar selectores de `lider_area` → `sucursal_a_cargo`
- Actualizar serializers
- Actualizar formularios

### Paso 4: Verificar Permisos
```bash
python manage.py check
# Output: System check identified no issues (0 silenced).
```

---

## 📈 BENEFICIOS FINALES

| Beneficio | Detalles |
|-----------|----------|
| **Claridad** | ✅ Un GERENTE = Responsable de 1 sucursal (sin ambigüedad) |
| **Seguridad** | ✅ Filtrado automático por sucursal en TODAS las vistas |
| **Mantenibilidad** | ✅ Menos código, menos confusión, menos bugs |
| **Escalabilidad** | ✅ Fácil agregar nuevas sucursales con sus gerentes |
| **Realidad Empresarial** | ✅ Refleja estructura típica de empresas multi-sede |

---

## 📋 CHECKLIST

- [x] Cambiar modelo Empleado (lider_area → sucursal_a_cargo)
- [x] Actualizar validaciones en `clean()`
- [x] Actualizar permisos en `core/permissions.py`
- [x] Crear migración
- [x] Validar con `python manage.py check`
- [ ] Actualizar serializers
- [ ] Actualizar formularios frontend
- [ ] Actualizar vistas si es necesario
- [ ] Testear flujo completo

