import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {

  // Datos del Dashboard
  stats: any = {
    nombres: 'Usuario', // Valor por defecto para que no se vea vacío
    rol: '',
    puesto: '',
    saldo_vacaciones: 0,
    solicitudes_pendientes: 0,
    es_lider: false,
    estado: '...'
  };

  // Variables de UI (Solo fecha y reloj)
  fechaActual = new Date();
  horaActual = '';
  intervaloReloj: any;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    // Recarga datos al navegar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.cargarDashboard();
    });
  }

  ngOnInit() {
    this.iniciarReloj();
    this.cargarDashboard();
  }

  ngOnDestroy() {
    if (this.intervaloReloj) clearInterval(this.intervaloReloj);
  }

  iniciarReloj() {
    this.intervaloReloj = setInterval(() => {
      const now = new Date();
      this.horaActual = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 1000);
  }

  cargarDashboard() {
    // Llamada directa sin activar spinners
    this.api.getStats().subscribe({
      next: (res) => {
        this.stats = res;
        this.cdr.detectChanges(); // Forzamos actualización visual inmediata
      },
      error: (e) => {
        console.error('Error dashboard:', e);
        this.cdr.detectChanges(); // Actualizamos aunque falle
      }
    });
  }

  marcarAsistencia(tipo: 'ENTRADA' | 'SALIDA') {
    if (!confirm(`¿Confirmar registro de ${tipo}?`)) return;

    // Obtenemos ubicación
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const payload = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            tipo: tipo 
        };
        this.enviarMarcaje(payload);
      },
      (err) => {
        // Si falla GPS, enviamos 0,0
        this.enviarMarcaje({ lat: 0, lng: 0, tipo: tipo });
      }
    );
  }

  enviarMarcaje(data: any) {
    // Llamada al API
    this.api.registrarAsistencia(data).subscribe({
        next: (res) => {
            alert(`✅ ${res.mensaje || 'Asistencia registrada.'}`);
        },
        error: (e) => {
            alert('⛔ Error: ' + (e.error?.error || e.message));
        }
    });
  }
}