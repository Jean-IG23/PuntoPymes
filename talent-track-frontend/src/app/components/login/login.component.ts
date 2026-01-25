import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// 1. CORRECCIÓN: Importamos ReactiveFormsModule y las herramientas necesarias
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  // 2. CORRECCIÓN: Agregamos ReactiveFormsModule aquí para que el HTML entienda [formGroup]
  imports: [CommonModule, ReactiveFormsModule], 
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  loginAttempts = 0;
  maxAttempts = 3;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // Definición del formulario con validaciones
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]], // Valida que sea email
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    // Si el formulario es inválido, no hacemos nada y mostramos errores visuales
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Esto hace que los campos se pongan rojos si hay error
      return;
    }

    // FIX: Prevenir múltiples clicks mientras se carga
    if (this.loading) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Llamamos al servicio Auth
    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        // Si todo sale bien, el servicio ya guardó el token y el user en localStorage
        this.loading = false;
        this.loginAttempts = 0; // Reset intentos
        // REDIRECCIÓN AL DASHBOARD
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.loginAttempts++;
        
        console.error('Login error:', err);
        
        // Manejo de diferentes tipos de error
        if (err.name === 'TimeoutError') {
          this.errorMessage = 'La conexión tardó demasiado. Intenta de nuevo.';
        } else if (err.status === 400 || err.status === 401) {
          this.errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (err.status === 0) {
          this.errorMessage = 'No se puede conectar con el servidor. Verifica tu conexión.';
        } else if (err.status >= 500) {
          this.errorMessage = 'Error del servidor. Intenta más tarde.';
        } else {
          this.errorMessage = 'Error al iniciar sesión. Por favor intenta de nuevo.';
        }
        
        // FIX: Si hay demasiados intentos, mostrar aviso adicional
        if (this.loginAttempts >= this.maxAttempts) {
          this.errorMessage += ` (Intento ${this.loginAttempts}/${this.maxAttempts})`;
        }
      }
    });
  }

  // FIX: Limpiar mensaje de error cuando el usuario escribe
  onInputChange() {
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }
}
