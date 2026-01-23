import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validadores personalizados para validación de campos
 */

// Solo números enteros (para cédula/documento)
export function soloNumeros(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const regex = /^\d+$/; // Solo dígitos, sin puntos ni comas
    return regex.test(control.value) ? null : { soloNumeros: true };
  };
}

// Solo letras y espacios
export function soloLetras(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const regex = /^[a-záéíóúñ\s]+$/i;
    return regex.test(control.value) ? null : { soloLetras: true };
  };
}

// Solo letras, números y guiones (para documentos)
export function documentoValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const regex = /^[a-z0-9\-]+$/i;
    return regex.test(control.value) ? null : { documentoValido: true };
  };
}

// Solo teléfono (números, guiones, espacios, paréntesis)
export function telefonoValido(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;
    const regex = /^[0-9\s\-\(\)\+]+$/;
    return regex.test(control.value) ? null : { telefonoValido: true };
  };
}

// Mensaje de error amigable
export function getErrorMessage(controlName: string, errors: ValidationErrors | null): string {
  if (!errors) return '';

  if (errors['required']) return `${controlName} es requerido`;
  if (errors['minlength']) return `${controlName} debe tener mínimo ${errors['minlength'].requiredLength} caracteres`;
  if (errors['maxlength']) return `${controlName} no puede exceder ${errors['maxlength'].requiredLength} caracteres`;
  if (errors['email']) return 'El correo electrónico no es válido';
  if (errors['min']) return `El valor debe ser mayor a ${errors['min'].min}`;
  if (errors['max']) return `El valor no puede ser mayor a ${errors['max'].max}`;
  if (errors['soloNumeros']) return `${controlName} solo puede contener números`;
  if (errors['soloLetras']) return `${controlName} solo puede contener letras`;
  if (errors['documentoValido']) return `${controlName} solo puede contener letras, números y guiones`;
  if (errors['telefonoValido']) return `${controlName} solo puede contener números, guiones y espacios`;
  if (errors['notSame']) return 'Las contraseñas no coinciden';

  return 'Campo inválido';
}
