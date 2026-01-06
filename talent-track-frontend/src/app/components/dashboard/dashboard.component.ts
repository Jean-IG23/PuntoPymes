import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

  empleado: any = null;
  loading: boolean = true;
  fechaHoy: Date = new Date();
  
  // Estado
  esAdmin: boolean = false;
  pendientesEquipo: number = 0;
  
  // Stats (Inicializados en 0 para evitar errores si no cargan)
  statsGlobales: any = {
    total_empleados: 0,
    presentes_hoy: 0,
    porcentaje_asistencia: 0,
    ausentes_hoy: 0
  };

  constructor(
    private api: ApiService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    const user = this.auth.getUser();
    
    // 1. Verificar Roles
    this.esAdmin = this.auth.canConfigCompany();

    // 2. Obtener Perfil Completo (Para ver saldo de vacaciones)
    // Usamos getEmpleados() que ya filtra por el usuario logueado en el backend
    this.api.getEmpleados().subscribe({
      next: (res: any) => {
        // Manejo robusto: si es array o paginación
        const lista = res.results || res;
        if (lista.length > 0) {
          this.empleado = lista[0];
        } else if (user) {
          // Fallback: usar datos del token si no hay ficha
          this.empleado = user; 
        }
        
        // Una vez tenemos al empleado, cargamos datos extra
        this.cargarDatosAdicionales();
      },
      error: (e) => {
        console.error('Error cargando perfil', e);
        this.loading = false;
      }
    });
  }

  cargarDatosAdicionales() {
    // A. Si es GERENTE/ADMIN: Contar solicitudes pendientes del equipo
    if (this.auth.isManagement()) {
      this.api.getSolicitudes().subscribe({
        next: (res: any) => {
          const todas = res.results || res;
          // Filtramos: Pendientes que NO son mías
          this.pendientesEquipo = todas.filter((s: any) => 
            s.estado === 'PENDIENTE' && s.empleado.id !== this.empleado.id
          ).length;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      this.loading = false;
    }

    // B. Si es ADMIN: Cargar Stats Globales (Simulamos por ahora si no existe el endpoint)
    if (this.esAdmin) {
       // Si creas el endpoint getStats en el futuro, descomenta esto:
       /* this.api.getStats().subscribe(data => {
          this.statsGlobales = data;
       }); 
       */
    }
  }

  // Helper para vista
  getPrimerNombre(): string {
    return this.empleado?.nombres ? this.empleado.nombres.split(' ')[0] : 'Colaborador';
  }
}