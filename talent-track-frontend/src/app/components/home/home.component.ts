import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { AttendanceQuickMarkerComponent } from '../attendance-quick-marker/attendance-quick-marker.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, AttendanceQuickMarkerComponent],
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
      icono: 'ri-time-line',
      nombre: 'Marcar Asistencia',
      descripcion: 'Registra tu entrada y salida del día',
      ruta: '/reloj',
      color: 'red'
    },
    {
      icono: 'ri-mail-send-line',
      nombre: 'Mis Solicitudes',
      descripcion: 'Solicita y gestiona tus permisos',
      ruta: '/solicitudes',
      color: 'orange'
    },
    {
      icono: 'ri-money-dollar-circle-line',
      nombre: 'Mi Nómina',
      descripcion: 'Consulta tu salario y descuentos',
      ruta: '/nomina',
      color: 'green'
    },
    {
      icono: 'ri-target-2-line',
      nombre: 'Mis Objetivos',
      descripcion: 'Define y realiza seguimiento de metas',
      ruta: '/objetivos',
      color: 'blue'
    },
    {
      icono: 'ri-user-line',
      nombre: 'Mi Perfil',
      descripcion: 'Edita tu información personal',
      ruta: '/mi-perfil',
      color: 'purple'
    },
    {
      icono: 'ri-check-list-line',
      nombre: 'Mis Tareas',
      descripcion: 'Gestiona tus actividades asignadas',
      ruta: '/tareas',
      color: 'indigo'
    }
  ];

  modulosJefe = [
    {
      icono: 'ri-team-line',
      nombre: 'Mi Equipo',
      descripcion: 'Gestiona y visualiza tus empleados',
      ruta: '/gestion/empleados',
      color: 'red'
    },
    {
      icono: 'ri-building-2-line',
      nombre: 'Organización',
      descripcion: 'Estructura empresarial y áreas',
      ruta: '/gestion/organizacion',
      color: 'blue'
    },
    {
      icono: 'ri-check-double-line',
      nombre: 'Asistencia',
      descripcion: 'Aprueba solicitudes de permisos',
      ruta: '/gestion/asistencia',
      color: 'orange'
    },
    {
      icono: 'ri-star-line',
      nombre: 'Evaluaciones',
      descripcion: 'Monitorea el desempeño del equipo',
      ruta: '/gestion/evaluaciones',
      color: 'green'
    },
    {
      icono: 'ri-bar-chart-line',
      nombre: 'Reportes',
      descripcion: 'Análisis de asistencia y nómina',
      ruta: '/reportes',
      color: 'purple'
    },
    {
      icono: 'ri-dashboard-line',
      nombre: 'Dashboard',
      descripcion: 'Panel de control del sistema',
      ruta: '/gestion/dashboard',
      color: 'indigo'
    }
  ];

  modulosSuperAdmin = [
    {
      icono: 'ri-building-line',
      nombre: 'Empresas',
      descripcion: 'Gestión de empresas del sistema',
      ruta: '/gestion/organizacion',
      color: 'red'
    },
    {
      icono: 'ri-shield-lock-line',
      nombre: 'Administración',
      descripcion: 'Control total del sistema',
      ruta: '/admin/configuracion',
      color: 'blue'
    },
    {
      icono: 'ri-line-chart-line',
      nombre: 'Analytics',
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
