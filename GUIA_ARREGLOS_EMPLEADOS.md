# 🔧 Guía de Arreglos - Gestión de Empleados

## 📋 Resumen de Cambios Realizados

Se han implementado correcciones integrales en el módulo de gestión de empleados para asegurar que:

1. **Crear empleados** - Se guarden correctamente en la base de datos con todos los datos
2. **Editar empleados** - Se actualicen correctamente incluyendo foto si es necesario
3. **Eliminar empleados** - Se eliminen de la base de datos y se actualice la lista correctamente

---

## 🛠️ Cambios Implementados

### 1️⃣ **Backend - Serializer (`personal/serializers.py`)**

**Problema:** El serializer tenía campos `sucursal_id`, `departamento_id`, etc. en `write_only`, pero el frontend enviaba `sucursal`, `departamento`, etc.

**Solución:**
- Cambié los campos a aceptar tanto lectura como escritura
- Agregué métodos `get_*_detalle()` para retornar objetos anidados en la respuesta
- Los campos de relación ahora aceptan IDs directamente desde el formulario

```python
# ANTES (problemático)
sucursal_id = serializers.PrimaryKeyRelatedField(
    write_only=True  # ❌ Solo escritura
)

# AHORA (correcto)
sucursal = serializers.PrimaryKeyRelatedField(
    write_only=False  # ✅ Acepta IDs para escribir
)
```

### 2️⃣ **Frontend - Servicio API (`api.service.ts`)**

**Problema:** El servicio no diferenciaba entre JSON y FormData para establecer Content-Type.

**Solución:**
- Agregué método `getHeadersForRequest()` que detecta si es FormData
- Cuando se envía FormData, NO establece Content-Type (el navegador lo hace automáticamente)
- Actualicé `createEmpleado()` y `updateEmpleado()` para usar esta lógica

```typescript
// Nuevo método para detectar FormData
private getHeadersForRequest(data: any) {
  const token = localStorage.getItem('token');
  let headers: any = {};
  
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  
  // Si es FormData, NO establecer Content-Type
  if (!(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  return headers
}

// Uso en métodos
createEmpleado(data: any): Observable<any> {
  return this.http.post(`${this.baseUrl}/empleados/`, data, { 
    headers: this.getHeadersForRequest(data) 
  });
}
```

### 3️⃣ **Frontend - Componente Form (`empleado-form.component.ts`)**

**Problema:** El formulario no validaba correctamente FormData y tenía problemas al actualizar.

**Solución:**
- Mejoré el método `guardar()` para manejar FormData correctamente
- Solo envía foto si fue seleccionada (no envía null)
- Mejor manejo de errores con mensajes más específicos

```typescript
// ANTES (problemático)
if (this.selectedFoto) {
  const formData = new FormData();
  // Añadía todos los campos incluso nulos
}

// AHORA (correcto)
if (this.selectedFoto) {
  dataToSend = new FormData();
  
  // Solo añade valores no nulos
  Object.keys(formValues).forEach(key => {
    const value = formValues[key];
    if (value !== null && value !== undefined) {
      dataToSend.append(key, String(value));
    }
  });
  
  dataToSend.append('foto', this.selectedFoto);
}
```

### 4️⃣ **Frontend - Lista de Empleados (`empleado-list.component.ts`)**

**Problema:** La eliminación no refrescaba correctamente la lista.

**Solución:**
- Mejoré el manejo de errores en `eliminarEmpleado()`
- Agregué `detectChanges()` después de eliminar del array
- Mejor feedback visual al usuario

```typescript
eliminarEmpleado(emp: any) {
  // ... confirmación ...
  this.api.deleteEmpleado(emp.id).subscribe({
    next: () => {
      // ✅ Elimina del array local
      this.empleados = this.empleados.filter(e => e.id !== emp.id);
      // ✅ Re-aplica filtros
      this.filtrar();
      // ✅ Notifica a Angular
      this.cd.detectChanges();
    }
  });
}
```

---

## ✅ Guía de Pruebas

### Prueba 1: Crear un Nuevo Empleado

1. Ve a **Gestión → Empleados**
2. Haz clic en **"+ Nuevo Colaborador"**
3. Completa los campos:
   - **Nombres:** Juan Carlos
   - **Apellidos:** Pérez López
   - **Cédula:** 1234567890
   - **Email:** juan.perez@empresa.com
   - **Sucursal:** (selecciona una)
   - **Departamento:** (selecciona uno)
   - **Puesto:** (selecciona uno)
   - **Sueldo:** 500.00
4. Opcionalmente carga una foto
5. Haz clic en **"Contratar Empleado"**
6. ✅ Verifica que aparezca en la lista de empleados

### Prueba 2: Editar un Empleado

1. En la lista de empleados, haz clic en el botón **"✏️ Editar"** de un empleado
2. Modifica algún campo (ej: teléfono)
3. Opcionalmente cambia la foto
4. Haz clic en **"Guardar Cambios"**
5. ✅ Verifica que los cambios se vean en la lista

### Prueba 3: Eliminar un Empleado

1. En la lista de empleados, haz clic en **"🗑️ Eliminar"**
2. Confirma la acción en el modal
3. ✅ Verifica que:
   - El empleado desaparezca de la lista
   - El mensaje de confirmación se muestre
   - La lista se actualice sin errores

### Prueba 4: Verificar Base de Datos

Para confirmar que los cambios se guardan en la BD:

```bash
# Abre el shell de Django
python manage.py shell

# Verifica empleados
from personal.models import Empleado
Empleado.objects.all().values('id', 'nombres', 'documento', 'estado')

# Verifica que se eliminen correctamente
emp = Empleado.objects.get(id=123)
emp.delete()  # Debe eliminar sin errores
```

---

## 🔍 Verificación de Errores Comunes

### ❌ Problema: "El campo sucursal es requerido"
**Causa:** El campo se envía como null
**Solución:** El serializer ahora acepta `sucursal` como ID directamente

### ❌ Problema: Foto no se guarda
**Causa:** Content-Type estaba mal establecido
**Solución:** Ahora detecta FormData y no envía Content-Type duplicado

### ❌ Problema: Empleado aparece duplicado en lista después de editar
**Causa:** El componente no refrescaba correctamente
**Solución:** Agregué `cd.detectChanges()` después de cada operación

### ❌ Problema: "No se pudo eliminar el empleado"
**Causa:** Falta de manejo de errores
**Solución:** Ahora muestra el mensaje de error específico del servidor

---

## 🚀 Próximos Pasos (Opcional)

Si deseas mejorar aún más:

1. **Agregar validación de foto** - Validar tamaño y formato
2. **Agregar foto por defecto** - Si no carga foto, usar inicial del nombre
3. **Agregar búsqueda en tiempo real** - Sin recargar página
4. **Agregar paginación** - Para listas grandes de empleados
5. **Agregar exportación a Excel** - Con lista de empleados actual

---

## 📞 Soporte

Si encuentras problemas:

1. Abre la consola del navegador (F12)
2. Revisa los errores en la pestaña **Console**
3. Verifica el backend en Terminal: `python manage.py runserver`
4. Revisa los logs de Django para errores 500

---

**Última actualización:** Enero 23, 2026
**Estado:** ✅ Completado
