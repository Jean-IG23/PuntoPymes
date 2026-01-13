import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  // Ya no necesitas CSS extra si usas Tailwind, pero mantenlo si tienes estilos custom
  styleUrl: './main-layout.component.css' 
})
export class MainLayoutComponent {
  
  sidebarOpen = true; // Por defecto abierto en escritorio
  
  // Datos del usuario
  userName: string = '';
  userRole: string = '';
  userEmpresa: string = '';
  userInitials: string = '';

  constructor(public auth: AuthService) {
    const user = this.auth.getUser();
    
    if (user) {
      this.userName = `${user.nombres} ${user.apellidos || ''}`.trim();
      this.userRole = this.formatRole(user.rol);
      this.userInitials = (user.nombres[0] || '') + (user.apellidos?.[0] || '');
    }

    this.userEmpresa = localStorage.getItem('nombre_empresa') || '';
    
    // Si la pantalla es pequeña, iniciar con sidebar cerrado
    if (window.innerWidth < 1024) {
      this.sidebarOpen = false;
    }
  }

  logout() {
    if(confirm('¿Cerrar sesión?')) {
      this.auth.logout();
    }
  }

  // Helper para que el rol se vea bonito
  private formatRole(role: string): string {
    const roles: any = {
      'SUPERADMIN': 'SaaS Admin',
      'ADMIN': 'Administrador',
      'RRHH': 'Recursos Humanos',
      'GERENTE': 'Gerente de Área',
      'EMPLEADO': 'Colaborador'
    };
    return roles[role] || role;
  }
}