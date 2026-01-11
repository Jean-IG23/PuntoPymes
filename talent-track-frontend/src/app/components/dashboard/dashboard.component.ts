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
  
  // Estados para la vista
  esAdmin: boolean = false; // Admin de empresa (RRHH)
  pendientesEquipo: number = 0;

  constructor(
    private api: ApiService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.cargarDatos();
  }

  // Helper para mostrar nombre corto en el HTML
  getPrimerNombre(): string {
    return this.empleado?.nombres ? this.empleado.nombres.split(' ')[0] : 'Usuario';
  }

  cargarDatos() {
    this.loading = true;
    const user = this.auth.getUser();
    
    // 1. Verificamos si es Admin de Empresa (RRHH)
    this.esAdmin = this.auth.canConfigCompany();

    // 2. Intentamos cargar el perfil de empleado
    this.api.getEmpleados().subscribe({
      next: (res: any) => {
        const lista = res.results || res;
        
        if (lista.length > 0) {
          this.empleado = lista[0];
        } else if (user) {
          // Si no tiene ficha (ej. SuperUser nuevo), usamos datos básicos del token
          this.empleado = user; 
        }
        
        this.cargarDatosAdicionales();
      },
      error: (e) => {
        console.error('Error cargando perfil', e);
        this.loading = false;
      }
    });
  }

  cargarDatosAdicionales() {
    // Si es Gerente, buscamos si tiene solicitudes pendientes de aprobar
    if (this.auth.isManagement()) {
      this.api.getSolicitudes().subscribe({
        next: (res: any) => {
          const todas = res.results || res;
          // Filtramos: Pendientes que NO son mías
          this.pendientesEquipo = todas.filter((s: any) => 
            s.estado === 'PENDIENTE' && s.empleado?.id !== this.empleado?.id
          ).length;
          this.loading = false;
        },
        error: () => this.loading = false
      });
    } else {
      this.loading = false;
    }
  }
}