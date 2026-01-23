# 🔍 Debugging de Departamentos en Formulario de Empleados

## Cambios Realizados

### Backend (Django):
1. **Mejorado el Serializer de Departamento** (`core/serializers.py`)
   - Agregado `sucursal_id` como campo directo (read-only)
   - Mejora: Ahora es más fácil para el frontend obtener el ID de la sucursal

### Frontend (Angular):
1. **Mejorado el Filtrado de Departamentos** (`empleado-form.component.ts`)
   - Agregado soporte para 3 formatos de datos:
     - `sucursal_id` (nuevo, directo)
     - `sucursal.id` (anidado)
     - `sucursal` (ID directo)
   - Agregados logs detallados en la consola

2. **Mejorado el Cargado de Catálogos** (`empleado-form.component.ts`)
   - Agregado logs para ver la estructura de departamentos cargados
   - Agregado logs para ver la estructura de sucursales cargadas

3. **Mejorada la Visualización en HTML** (`empleado-form.component.html`)
   - Agregado contador visual: "X departamentos disponibles"

## Cómo Verificar que Funciona

### 1. Abre la Consola del Navegador (F12)
Haz clic en la pestaña "Console"

### 2. Carga el Formulario de Nuevo Empleado
- Ve a Empleados → Nuevo Empleado
- Deberías ver logs como:
```
Departamentos cargados: Array(n) [ ... ]
Sucursales cargadas: Array(n) [ ... ]
```

### 3. Selecciona una Sucursal
- Abre el dropdown de "Sucursal"
- Selecciona una sucursal
- En la consola deberías ver:
```
Sucursal no seleccionada, departamentos filtrados vacíos
Departamentos filtrados para sucursal 1:
  ✓ Departamento "Ventas" (ID 5) → Sucursal 1
  ✓ Departamento "Administración" (ID 6) → Sucursal 1
Array(2) [ {...}, {...} ]
```

### 4. Verifica el Dropdown de Departamento
- El dropdown debe llenarse con los departamentos de esa sucursal
- Si ves "2 departamentos disponibles" debajo, significa que funcionó

## Posibles Problemas y Soluciones

### ❌ "Esta sucursal no tiene departamentos registrados"
**Causas posibles:**
1. La sucursal no tiene departamentos creados en Organización
2. El filtro está buscando en el campo incorrecto

**Solución:**
- Revisa la consola: ¿Ves `Array(0)` en los logs?
- Verifica en Organización que la sucursal tenga departamentos asignados
- Busca en los logs qué valor tiene `sucursal_id` vs `sucursal.id`

### ⚠️ Si los logs no aparecen
- Verifica que hayas abierto la consola ANTES de cargar el formulario
- O recarga la página (F5) después de abrir la consola

### 🔧 Debugging Avanzado
Ejecuta esto en la consola:
```javascript
// Ver todos los departamentos cargados
console.log(document.querySelector('app-empleado-form').componentInstance.departamentos);

// Ver departamentos filtrados
console.log(document.querySelector('app-empleado-form').componentInstance.departamentosFiltrados);

// Ver sucursal seleccionada
console.log(document.querySelector('app-empleado-form').componentInstance.empleadoForm.get('sucursal').value);
```

## Estructura Esperada de Datos

**Departamento (desde el backend):**
```json
{
  "id": 5,
  "nombre": "Ventas",
  "sucursal": 1,              // ← ID directo (ForeignKey)
  "sucursal_id": 1,           // ← Campo nuevo (read-only)
  "area": 2,
  "nombre_area": "Comercial",
  "empresa": 1
}
```

Si ves diferente en los logs, es un problema de serialización del backend.

## Próximas Acciones
1. Revisa los logs de la consola
2. Reporta qué ves exactamente
3. Si no hay departamentos, verifica en Organización que estén creados
