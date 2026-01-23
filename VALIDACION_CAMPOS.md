# 🔒 Validación de Campos por Tipo de Dato

## Resumen
Se han implementado validadores personalizados en los formularios principales para garantizar que solo se acepte el tipo de dato correcto en cada campo. Los usuarios recibirán mensajes de error claros e indicativos.

---

## 📋 Validadores Implementados

### 1. **Solo Números** (`soloNumeros`)
- **Acepta**: Números enteros y decimales (Ej: 460, 1000.50)
- **Rechaza**: Letras, caracteres especiales
- **Mensaje de error**: "Campo solo puede contener números"

### 2. **Solo Letras** (`soloLetras`)
- **Acepta**: Letras (a-z, A-Z), espacios, caracteres acentuados (á, é, í, ó, ú, ñ)
- **Rechaza**: Números, caracteres especiales
- **Mensaje de error**: "Campo solo puede contener letras"

### 3. **Documento** (`documentoValido`)
- **Acepta**: Letras, números, guiones (Ej: ABC-123456, 12345678)
- **Rechaza**: Caracteres especiales (excepto guión)
- **Mensaje de error**: "Documento solo puede contener letras, números y guiones"

### 4. **Teléfono** (`telefonoValido`)
- **Acepta**: Números, guiones, espacios, paréntesis (Ej: 123-456-7890, +1 (555) 123-4567)
- **Rechaza**: Letras, caracteres especiales inapropiados
- **Mensaje de error**: "Teléfono solo puede contener números, guiones y espacios"

### 5. **Email** (Validador nativo de Angular)
- **Acepta**: Formato de correo válido (usuario@dominio.com)
- **Rechaza**: Formatos inválidos
- **Mensaje de error**: "Campo de correo no es válido"

---

## 🎯 Campos Validados por Formulario

### **Formulario de Empleados** (`empleado-form.component.ts`)
| Campo | Validador | Ejemplo Válido | Ejemplo Inválido |
|-------|-----------|----------------|-----------------|
| **Nombres** | Solo Letras | Juan Carlos | Juan123 |
| **Apellidos** | Solo Letras | Pérez López | Pérez@López |
| **Cédula/DNI** | Documento | 12345678 | 123@456 |
| **Email** | Email | juan@empresa.com | juanempresa.com |
| **Teléfono** | Teléfono | 123-456-7890 | 123ABC4567 |
| **Sueldo** | Número | 460 | 460ABC |

### **Formulario de Perfil** (`perfil.component.ts`)
| Campo | Validador | Ejemplo Válido | Ejemplo Inválido |
|-------|-----------|----------------|-----------------|
| **Teléfono** | Teléfono | +1 (555) 123-4567 | 555CALL |

---

## 💡 Cómo Funciona

### Validación en Tiempo Real
- Mientras el usuario escribe, los validadores verifican el formato
- El mensaje de error aparece solo cuando el campo pierde el foco (touch)
- El botón "Guardar" se deshabilita si hay errores

### Mensajes de Error Específicos
Cada error muestra un mensaje claro indicando:
- ✗ Qué campo tiene el error
- ✗ Por qué es inválido
- ✗ Qué tipo de datos se aceptan

Ejemplo:
```
⚠️ Nombres solo puede contener letras
⚠️ Teléfono solo puede contener números, guiones y espacios
⚠️ Documento solo puede contener letras, números y guiones
```

---

## 🎨 Indicadores Visuales

### Campo Válido ✅
- Icono de círculo de confirmación
- Borde normal
- Sin mensaje de error

### Campo Inválido ❌
- Icono de exclamación rojo
- Mensaje de error en rojo
- Borde con enfoque en rojo

### Ejemplo en HTML:
```html
<input formControlName="nombres" placeholder="Ej. Juan Carlos">
<p *ngIf="empleadoForm.get('nombres')?.invalid && empleadoForm.get('nombres')?.touched" 
   class="text-xs text-red-500 mt-1 flex items-center gap-1">
  <i class="bi bi-exclamation-circle"></i> 
  {{ getErrorMessage('Nombres', 'nombres') }}
</p>
```

---

## 📁 Archivos Modificados

### Nuevos
- `src/app/services/custom-validators.ts` - Validadores personalizados

### Actualizados
- `src/app/components/empleado-form/empleado-form.component.ts` - Agregados validadores
- `src/app/components/empleado-form/empleado-form.component.html` - Mensajes de error
- `src/app/components/perfil/perfil.component.ts` - Agregados validadores
- `src/app/components/perfil/perfil.component.html` - Mensajes de error

---

## 🧪 Ejemplos de Uso

### Nombres (Solo Letras)
```
✅ Juan Carlos
✅ María José
✅ José María López
❌ Juan123
❌ María@José
```

### Documento (Letras, Números, Guiones)
```
✅ 12345678
✅ ABC-123456
✅ 1234567-8
❌ 12345@78
❌ 123 456 78
```

### Teléfono (Números, Guiones, Espacios, Paréntesis)
```
✅ 123-456-7890
✅ +1 (555) 123-4567
✅ 555 123 4567
❌ 123-ABC-7890
❌ Call: 123-456-7890
```

---

## ⚡ Comportamiento

1. **Usuario escribe**: Validador verifica en tiempo real
2. **Campo pierde foco**: Si hay error, aparece el mensaje
3. **Usuario corrige**: El error desaparece automáticamente
4. **Guardar**: Solo habilitado si todos los campos son válidos

---

## 🔐 Beneficios

✅ **Previene errores de datos**: Solo datos válidos se guardan
✅ **Mejor UX**: Feedback claro y en tiempo real
✅ **Consistencia**: Validación en cliente y servidor
✅ **Accesibilidad**: Iconos + texto para usuarios con discapacidades visuales
✅ **Reutilizable**: Los validadores se pueden usar en otros formularios
