import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface MenuItem {
  label: string;
  link: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  sidebarOpen = signal(false);
  userMenuOpen = signal(false);
  
  user = signal({
    name: 'Usuario',
    rol: 'Rol',
    avatar: 'https://ui-avatars.com/api/?name=Usuario&background=random',
  });
  
  notificationCount = signal(2);

  // Menú navegación principal - Dinámico por rol
  menuItems = computed(() => {
    const userRole = this.auth.getRole();
    const items: MenuItem[] = [
      {
        label: 'Dashboard',
        link: '/dashboard',
        icon: 'ri-home-4-line',
      },
      {
        label: 'Reloj',
        link: '/reloj',
        icon: 'ri-time-line',
      },
    ];

    // Items según rol
    if (['SUPERADMIN', 'ADMIN', 'RRHH', 'GERENTE'].includes(userRole)) {
      items.push({
        label: 'Empleados',
        link: '/gestion/empleados',
        icon: 'ri-team-line',
      });

      items.push({
        label: 'Solicitudes',
        link: '/solicitudes',
        icon: 'ri-mail-line',
        badge: 2,
      });

      items.push({
        label: 'Asistencia',
        link: '/gestion/asistencia',
        icon: 'ri-check-double-line',
      });
    }

    if (['SUPERADMIN', 'ADMIN', 'RRHH'].includes(userRole)) {
      items.push({
        label: 'Nómina',
        link: '/nomina',
        icon: 'ri-money-dollar-circle-line',
      });

      items.push({
        label: 'Reportes',
        link: '/reportes',
        icon: 'ri-bar-chart-2-line',
      });
    }

    return items;
  });

  constructor() {
    this.loadUserInfo();
    this.router.events.subscribe(() => {
      this.closeSidebar();
      this.closeUserMenu();
    });
  }

  private loadUserInfo() {
    const userData = this.auth.getUser();
    if (userData) {
      this.user.set({
        name: userData.nombre || userData.name || 'Usuario',
        rol: this.getRoleLabel(userData.rol || this.auth.getRole()),
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=${userData.nombre || userData.name}&background=random`,
      });
    }
  }

  private getRoleLabel(role: string): string {
    const roleMap: { [key: string]: string } = {
      'SUPERADMIN': 'Administrador',
      'ADMIN': 'Administrador',
      'RRHH': 'Recursos Humanos',
      'GERENTE': 'Gerente',
      'EMPLEADO': 'Empleado',
    };
    return roleMap[role] || role;
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(open => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update(open => !open);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  goHome(): void {
    this.router.navigate(['/dashboard']);
    this.closeSidebar();
  }

  goToPerfil(): void {
    this.router.navigate(['/mi-perfil']);
    this.closeUserMenu();
  }

  logout(): void {
    if (confirm('¿Deseas cerrar sesión?')) {
      this.auth.logout();
      this.router.navigate(['/login']);
    }
  }

  openNotifications(): void {
    console.log('Abrir notificaciones');
  }

  navigateTo(link: string): void {
    this.router.navigate([link]);
    this.closeSidebar();
  }
}
