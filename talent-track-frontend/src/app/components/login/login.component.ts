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

    this.loading = true;
    this.errorMessage = '';

    // Llamamos al servicio Auth
    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        // Si todo sale bien, el servicio ya guardó el token y el user en localStorage
        this.loading = false;
        // REDIRECCIÓN AL HOME
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        
        // Mensaje amigable según el error
        if (err.status === 400 || err.status === 401) {
            this.errorMessage = 'Credenciales incorrectas.';
        } else {
            this.errorMessage = 'Error de conexión con el servidor.';
        }
      }
    });
  }
}