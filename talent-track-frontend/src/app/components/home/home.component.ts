import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { AttendanceQuickMarkerComponent } from '../attendance-quick-marker/attendance-quick-marker.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, AttendanceQuickMarkerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userRole: string = '';
  userName: string = '';
  userEmpresa: string = '';
  loading = true;
  loadingStats = false;
  
  private destroy$ = new Subject<void>();

  // Estadísticas del sistema
  stats = {
    totalEmpleados: 0,
    presentesHoy: 0,
    solicitudesPendientes: 0,
    asistencia: 0
  };

  // Módulos según roles
  modulosEmpleado = [
    {
      icon: 'ri-time-line',
      titulo: 'Marcar Asistencia',
      descripcion: 'Registra tu entrada y salida del día',
      ruta: '/reloj',
      color: 'red'
    },
    {
      icon: 'ri-mail-send-line',
      titulo: 'Mis Solicitudes',
      descripcion: 'Solicita y gestiona tus permisos',
      ruta: '/solicitudes',
      color: 'orange'
    },
    {
      icon: 'ri-money-dollar-circle-line',
      titulo: 'Mi Nómina',
      descripcion: 'Consulta tu salario y descuentos',
      ruta: '/nomina',
      color: 'green'
    },
    {
      icon: 'ri-target-2-line',
      titulo: 'Mis Objetivos',
      descripcion: 'Define y realiza seguimiento de metas',
      ruta: '/objetivos',
      color: 'blue'
    },
    {
      icon: 'ri-user-line',
      titulo: 'Mi Perfil',
      descripcion: 'Edita tu información personal',
      ruta: '/mi-perfil',
      color: 'purple'
    },
    {
      icon: 'ri-check-list-line',
      titulo: 'Mis Tareas',
      descripcion: 'Gestiona tus actividades asignadas',
      ruta: '/tareas',
      color: 'indigo'
    }
  ];

  modulosJefe = [
    {
      icon: 'ri-team-line',
      titulo: 'Mi Equipo',
      descripcion: 'Gestiona y visualiza tus empleados',
      ruta: '/gestion/empleados',
      color: 'red'
    },
    {
      icon: 'ri-organization-chart',
      titulo: 'Organización',
      descripcion: 'Estructura empresarial y áreas',
      ruta: '/gestion/organizacion',
      color: 'blue'
    },
    {
      icon: 'ri-check-double-line',
      titulo: 'Asistencia',
      descripcion: 'Aprueba solicitudes de permisos',
      ruta: '/gestion/asistencia',
      color: 'orange'
    },
    {
      icon: 'ri-star-line',
      titulo: 'Evaluaciones',
      descripcion: 'Monitorea el desempeño del equipo',
      ruta: '/gestion/evaluaciones',
      color: 'green'
    },
    {
      icon: 'ri-bar-chart-line',
      titulo: 'Reportes',
      descripcion: 'Análisis de asistencia y nómina',
      ruta: '/reportes',
      color: 'purple'
    },
    {
      icon: 'ri-dashboard-line',
      titulo: 'Dashboard',
      descripcion: 'Panel de control del sistema',
      ruta: '/gestion/dashboard',
      color: 'indigo'
    }
  ];

  modulosSuperAdmin = [
    {
      icon: 'ri-building-line',
      titulo: 'Empresas',
      descripcion: 'Gestión de empresas del sistema',
      ruta: '/gestion/organizacion',
      color: 'red'
    },
    {
      icon: 'ri-shield-lock-line',
      titulo: 'Administración',
      descripcion: 'Control total del sistema',
      ruta: '/admin/configuracion',
      color: 'blue'
    },
    {
      icon: 'ri-line-chart-line',
      titulo: 'Analytics',
      descripcion: 'Estadísticas globales del SAAS',
      ruta: '/saas/dashboard',
      color: 'green'
    }
  ];

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkUserStatus();
    setTimeout(() => {
      this.loading = false;
    }, 500);
  }

  checkUserStatus(): void {
    this.isLoggedIn = this.auth.isLoggedIn();
    
    if (this.isLoggedIn) {
      const user = this.auth.getUser();
      this.userName = user?.nombres || user?.nombre || user?.username || 'Usuario';
      this.userRole = user?.rol || '';
      this.userEmpresa = localStorage.getItem('nombre_empresa') || '';
      
      // Cargar estadísticas solo si es management
      if (this.auth.isManagement()) {
        this.loadStats();
      }
    }
  }

  loadStats(): void {
    this.loadingStats = true;
    this.api.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          this.stats = {
            totalEmpleados: data.total_empleados || 0,
            presentesHoy: data.presentes_hoy || 0,
            solicitudesPendientes: data.solicitudes_pendientes || 0,
            asistencia: Math.round(data.porcentaje_asistencia || 0)
          };
          this.loadingStats = false;
        },
        error: (err) => {
          console.error('Error loading stats:', err);
          this.loadingStats = false;
        }
      });
  }

  get modulosVisibles() {
    if (this.auth.isSuperAdmin()) {
      return this.modulosSuperAdmin;
    } else if (this.auth.isManagement()) {
      return this.modulosJefe;
    } else {
      return this.modulosEmpleado;
    }
  }

  navigateTo(ruta: string): void {
    this.router.navigate([ruta]);
  }

  goToDashboard(): void {
    // Ir al dashboard del rol correspondiente
    if (this.auth.isSuperAdmin()) {
      this.router.navigate(['/saas/dashboard']);
    } else if (this.auth.isManagement()) {
      this.router.navigate(['/gestion/dashboard']);
    } else {
      this.router.navigate(['/reloj']);
    }
  }

  logout(): void {
    this.auth.logout();
    window.location.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
