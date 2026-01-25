import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html',
  // Ya no necesitas CSS extra si usas Tailwind, pero mantenlo si tienes estilos custom
  styleUrl: './main-layout.component.css' 
})
export class MainLayoutComponent implements OnInit {

  sidebarOpen = true; // Por defecto abierto en escritorio

  // Datos del usuario
  userName: string = '';
  userRole: string = '';
  userEmpresa: string = '';
  userInitials: string = '';
  currentSection: string = 'Dashboard';

  constructor(public auth: AuthService, private router: Router) {
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

  ngOnInit() {
    // Track route changes to update current section
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.updateCurrentSection(event.url);
    });

    // Set initial section
    this.updateCurrentSection(this.router.url);
  }

  private updateCurrentSection(url: string) {
    if (url.includes('/dashboard')) {
      this.currentSection = 'Dashboard';
    } else if (url.includes('/reloj')) {
      this.currentSection = 'Asistencia';
    } else if (url.includes('/gestion/empleados')) {
      this.currentSection = 'Empleados';
    } else if (url.includes('/gestion/organizacion')) {
      this.currentSection = 'Organización';
    } else if (url.includes('/solicitudes')) {
      this.currentSection = 'Solicitudes';
    } else if (url.includes('/nomina')) {
      this.currentSection = 'Nómina';
    } else if (url.includes('/mi-perfil')) {
      this.currentSection = 'Mi Perfil';
    } else if (url.includes('/gestion')) {
      this.currentSection = 'Gestión';
    } else if (url.includes('/admin')) {
      this.currentSection = 'Administración';
    } else if (url.includes('/saas')) {
      this.currentSection = 'SaaS';
    } else {
      this.currentSection = 'Dashboard';
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

  // ========== CONTROL DE VISIBILIDAD POR ROL ==========
  
  // Visibilidad de secciones principales
  canSeePrincipal(): boolean {
    return true; // Todos ven la sección principal
  }

  canSeeReportes(): boolean {
    // Solo si eres management (Gerente+) o si tienes datos propios
    return this.auth.isManagement() || this.auth.isEmployee();
  }

  canSeeNomina(): boolean {
    // Todos pueden ver su propia nómina
    return true;
  }

  canSeeRanking(): boolean {
    // Solo management (jefes, admin, rrhh)
    return this.auth.isManagement();
  }

  canSeeTareas(): boolean {
    // Solo si eres management (asignas tareas) o empleado (tienes tareas)
    return true;
  }

  canSeeObjetivos(): boolean {
    // Todos pueden ver sus objetivos
    return true;
  }

  canSeeSolicitudes(): boolean {
    // Todos pueden hacer solicitudes
    return true;
  }

  isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }
}