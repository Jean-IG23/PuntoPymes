import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  
  credentials = { username: '', password: '' };

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    console.log('🔵 1. Botón presionado. Credenciales:', this.credentials);

    if (!this.credentials.username || !this.credentials.password) {
      alert('⚠️ Por favor escribe usuario y contraseña');
      return;
    }

    this.auth.login(this.credentials).subscribe({
      next: (response) => {
        // ... verificar token ...
        if (localStorage.getItem('auth_token')) {
          
          // LÓGICA DE ROLES PERFECTA:
          if (this.auth.isSuperAdmin()) {
             // 1. Super Admin -> Panel Global
             this.router.navigate(['/dashboard']);
          } 
          else if (this.auth.isCompanyAdmin()) { 
             // 2. Admin de Empresa -> Su Gestión
             this.router.navigate(['/mi-empresa']);
          } 
          else {
             // 3. Empleado Normal -> Su Reloj
             this.router.navigate(['/portal']);
          }
        }
      },
      error: (error) => {
        console.error('🔴 5. Error en la petición:', error);
        if (error.status === 400) {
          alert('Usuario o contraseña incorrectos.');
        } else if (error.status === 0) {
          alert('No hay conexión con el Backend (Django apagado).');
        } else {
          alert('Error desconocido: ' + error.status);
        }
      }
    });
  }
}