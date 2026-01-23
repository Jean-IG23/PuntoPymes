# 📋 Correcciones Formulario Empleados

## ✅ Resumen de Cambios Realizados

Se han implementado validaciones y mejoras en el formulario de registro y edición de empleados.

---

## 1. **CAMPO DOCUMENTO - SOLO NÚMEROS ✅**

### Problema Original:
- El campo aceptaba cualquier carácter (letras, números, guiones)
- No era claro que debería ser solo números

### Solución Implementada:

#### TypeScript (`empleado-form.component.ts`):
```typescript
// Validador actualizado para soloNumeros
export function soloNumeros(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const regex = /^\d+$/; // Solo dígitos, sin puntos ni comas
    return regex.test(control.value) ? null : { soloNumeros: true };
  };
}
```

#### Método de filtrado en tiempo real:
```typescript
// Filtra caracteres no numéricos mientras el usuario escribe
onDocumentoInput(event: any) {
  const input = event.target;
  const value = input.value.replace(/[^0-9]/g, ''); // Remover todo lo que no sea número
  this.empleadoForm.patchValue({ documento: value }, { emitEvent: false });
  input.value = value;
}
```

#### HTML mejorado:
```html
<input type="text" 
       formControlName="documento" 
       placeholder="Ej. 1234567890" 
       inputmode="numeric"
       (input)="onDocumentoInput($event)">
```

**Resultado:**
- ✅ Solo acepta números
- ✅ Rechaza automáticamente otros caracteres mientras el usuario escribe
- ✅ Mínimo 5 dígitos requerido
- ✅ Mensaje claro: "Solo números (sin guiones ni espacios)"

---

## 2. **VALIDACIONES ADICIONALES EN CAMPOS PERSONALES ✅**

### Nombres y Apellidos:
- **Antes:** Solo se validaba que fuera requerido
- **Ahora:** 
  - Requerido
  - Mínimo 3 caracteres
  - Solo letras

```typescript
nombres: ['', [Validators.required, Validators.minLength(3), soloLetras()]],
apellidos: ['', [Validators.required, Validators.minLength(3), soloLetras()]],
```

### Documento (Cédula):
- Requerido
- Mínimo 5 dígitos
- Solo números

```typescript
documento: ['', [Validators.required, Validators.minLength(5), soloNumeros()]],
```

### Teléfono:
- Opcional (sin Validators.required)
- Si se proporciona, debe ser válido (números, guiones, espacios, paréntesis, +)

```typescript
telefono: ['', [telefonoValido()]],
```

---

## 3. **PROBLEMA DE DEPARTAMENTOS VACÍOS ✅ MEJORADO**

### Problema Original:
- Cuando una sucursal no tenía departamentos, el mensaje era poco visible
- El select se dehabilitaba pero no estaba claro por qué

### Solución Implementada:

#### HTML mejorado:
```html
<select formControlName="departamento"
        [class.bg-gray-100]="!empleadoForm.get('sucursal')?.value"
        [class.opacity-50]="!empleadoForm.get('sucursal')?.value"
        [attr.disabled]="!empleadoForm.get('sucursal')?.value ? '' : null">
  <option [ngValue]="null">-- Seleccione --</option>
  <option *ngFor="let d of departamentosFiltrados" [value]="d.id">{{ d.nombre }}</option>
</select>

<!-- Mensajes de estado mejorados -->
<p *ngIf="!empleadoForm.get('sucursal')?.value" class="text-xs text-orange-500 mt-1 flex items-center gap-1">
  <i class="bi bi-exclamation-triangle"></i> Seleccione primero una sucursal.
</p>

<p *ngIf="empleadoForm.get('sucursal')?.value && departamentosFiltrados.length === 0" class="text-xs text-red-500 mt-1 flex items-center gap-1">
  <i class="bi bi-exclamation-circle"></i> ❌ Esta sucursal no tiene departamentos registrados. Crea uno en Organización.
</p>
```

**Resultado:**
- ✅ Select visual y funcionalmente deshabilitado cuando no hay sucursal
- ✅ Mensaje claro si la sucursal tiene departamentos
- ✅ Mensaje rojo + ícono si no hay departamentos
- ✅ Instrucción de qué hacer (ir a Organización)

---

## 4. **VALIDACIONES DE SUELDO ✅ MEJORADO**

### Cambios:

#### TypeScript:
```typescript
sueldo: [460, [Validators.required, Validators.min(260)]],
```

#### HTML:
```html
<label class="block text-sm font-medium text-gray-700 mb-1">
  Sueldo Base <span class="text-red-500">*</span>
</label>
<input type="number" 
       formControlName="sueldo" 
       placeholder="460.00" 
       min="260">

<!-- Mensajes de error -->
<p *ngIf="empleadoForm.get('sueldo')?.invalid && empleadoForm.get('sueldo')?.touched" 
   class="text-xs text-red-500 mt-1 flex items-center gap-1">
  <i class="bi bi-exclamation-circle"></i> {{ getErrorMessage('Sueldo', 'sueldo') }}
</p>

<!-- Mensaje informativo -->
<p *ngIf="!empleadoForm.get('sueldo')?.invalid && empleadoForm.get('sueldo')?.touched" 
   class="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
  <i class="bi bi-info-circle"></i> Mínimo permitido: $260
</p>
```

**Resultado:**
- ✅ Mínimo $260 (sueldo mínimo)
- ✅ Campo requerido
- ✅ Mensajes claros de error
- ✅ Ayuda visual del mínimo permitido

---

## 5. **MENSAJES DE ERROR MEJORADOS ✅**

Se actualizó la función `getErrorMessage` para mostrar mensajes más específicos:

```typescript
if (errors['minlength']) return `${controlName} debe tener mínimo ${errors['minlength'].requiredLength} caracteres`;
if (errors['soloNumeros']) return `${controlName} solo puede contener números`;
if (errors['soloLetras']) return `${controlName} solo puede contener letras`;
if (errors['telefonoValido']) return `${controlName} solo puede contener números, guiones, espacios y paréntesis`;
```

**Ejemplos de mensajes mostrados al usuario:**
- "Nombres debe tener mínimo 3 caracteres"
- "Cédula/DNI solo puede contener números"
- "Teléfono solo puede contener números, guiones, espacios y paréntesis"

---

## 6. **MEJORAS DE UX ✅**

### Placeholders descriptivos:
- Documento: "Ej. 1234567890"
- Sueldo: "460.00"
- Teléfono: "Ej. +1 (555) 123-4567 o 123-456-7890"

### Input modes:
- Documento: `inputmode="numeric"` (teclado numérico en móviles)
- Teléfono: `inputmode="tel"` (teclado telefónico en móviles)

### Iconos y colores:
- Errores: Rojo + ícono de exclamación
- Advertencias: Naranja + ícono de aviso
- Información: Gris + ícono de información
- Éxito: Verde + ícono de check (cuando es válido)

---

## 📋 Validación Checklist

Verifica que el formulario de empleados funciona correctamente:

- [ ] **Nombres**: Requiere 3+ letras, rechaza números
- [ ] **Apellidos**: Requiere 3+ letras, rechaza números
- [ ] **Cédula/DNI**: Requiere 5+ números, rechaza automáticamente letras/guiones
- [ ] **Email**: Requiere formato email válido
- [ ] **Teléfono**: Opcional, pero si se llena valida el formato
- [ ] **Sucursal**: Requiere seleccionar una
- [ ] **Departamento**: Se deshabilita hasta seleccionar sucursal, muestra error si no hay
- [ ] **Puesto**: Requiere seleccionar uno
- [ ] **Sueldo**: Requiere valor >= $260
- [ ] **Error del departamento**: Muestra mensaje rojo con instrucción
- [ ] **Todos los errores**: Muestran mensajes específicos, no genéricos

---

## 🔧 Archivos Modificados

1. **empleado-form.component.ts**
   - Validadores mejorados en initForm()
   - Método onDocumentoInput() para filtrar números
   - Importación de soloNumeros en lugar de documentoValido

2. **empleado-form.component.html**
   - Campo documento con (input) event
   - Mejoras visuales en select de departamento
   - Mensajes de error más claros
   - Placeholders descriptivos
   - Input modes para mejor UX móvil

3. **custom-validators.ts**
   - Actualización de soloNumeros() para solo dígitos
   - Mensajes de error mejorados en getErrorMessage()

---

## 🚀 Próximos Pasos (Opcionales)

1. **Longitud máxima de cédula**: Si conoces el formato exacto de tu país, puedes agregar `maxLength`
   ```typescript
   documento: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20), soloNumeros()]],
   ```

2. **Validación de cédula por país**: Podrías agregar un validador que verifique el dígito verificador
   
3. **Prevenir duplicados de cédula**: Agregar un validador asincrónico que consulte el backend

4. **Sueldo máximo**: Si hay límite máximo, agregar `Validators.max()`

---

**Estado:** ✅ COMPLETADO - Listo para testing

