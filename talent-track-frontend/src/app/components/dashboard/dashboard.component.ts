import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  empleado: any = null;
  resumenAsistencia: any = null;
  objetivosPendientes: number = 0;
  
  // Variables para MODO ADMIN
  esAdmin: boolean = false;
  statsGlobales: any = null;
  
  loading: boolean = true;
  fechaHoy: Date = new Date();

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cd: ChangeDetectorRef // <--- CORREGIDO: private cd: ...
  ) {}

  ngOnInit() {
    // 1. CARGA INSTANTÁNEA (Datos de memoria)
    const user = this.auth.getUser();
    if (user) {
        this.empleado = user; 
        this.esAdmin = this.auth.isCompanyAdmin() || this.auth.isSuperAdmin();
    }

    // 2. CARGA ASÍNCRONA (Datos frescos del servidor)
    this.cargarDatosDelServidor();
  }

  cargarDatosDelServidor() {
    this.loading = true;

    // A. Estadísticas Globales (Solo Admin)
    if (this.esAdmin) {
      this.api.getStats().subscribe({
        next: (data) => {
            this.statsGlobales = data;
            this.cd.detectChanges(); // Forzar actualización visual
        },
        error: () => console.warn('No se pudieron cargar stats')
      });
    }

    // B. Datos Operativos (Asistencia y Objetivos)
    if (this.empleado && this.empleado.id) {
        
        // Asistencia
        this.api.getHistorialAsistencia().subscribe((data: any) => {
            const marcas = data.results || data;
            if (marcas.length > 0) this.resumenAsistencia = marcas[0];
            this.cd.detectChanges();
        });

        // Objetivos
        this.api.getObjetivos(this.empleado.id).subscribe((data: any) => {
            const lista = data.results || data;
            this.objetivosPendientes = lista.filter((o: any) => o.estado === 'PENDIENTE').length;
            
            this.loading = false;
            this.cd.detectChanges();
        });

    } else {
        // Plan B: Si no hay usuario en memoria, buscamos perfil completo
        this.api.getEmpleados().subscribe({
            next: (data: any) => {
                const miPerfil = Array.isArray(data) ? data[0] : (data.results ? data.results[0] : data);
                this.empleado = miPerfil;
                
                // Si encontramos perfil, volvemos a llamar para cargar sus datos operativos
                if (this.empleado) {
                    this.cargarDatosDelServidor(); 
                } else {
                    this.loading = false;
                    this.cd.detectChanges();
                }
            },
            error: () => {
                this.loading = false;
                this.cd.detectChanges();
            }
        });
    }
  }

  getEstadoAsistencia(): string {
    if (!this.resumenAsistencia) return 'SIN_REGISTRO';
    return this.resumenAsistencia.tipo;
  }
}