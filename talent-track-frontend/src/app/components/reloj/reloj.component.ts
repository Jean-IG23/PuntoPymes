import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reloj',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reloj.component.html',
  styleUrl: './reloj.component.css'
})
export class RelojComponent implements OnInit, OnDestroy {

  horaActual: string = '';
  fechaActual: string = '';
  private relojTimer: any;
  private limpiezaTimeouts: any[] = [];
  
  // Estado del GPS
  ubicacion: { lat: number, lng: number } | null = null;
  gpsError: string = '';
  cargandoUbicacion = true;
  procesandoMarca = false;

  // Estado del Usuario
  empleado: any = null;
  mensajeExito: string = '';
  mensajeError: string = '';

  constructor(private api: ApiService, private auth: AuthService) {
    this.actualizarReloj();
  }

  ngOnDestroy() {
    // Limpiar timer del reloj
    if (this.relojTimer) clearInterval(this.relojTimer);
    // Limpiar todos los timeouts pendientes
    this.limpiezaTimeouts.forEach(t => clearTimeout(t));
  }

  ngOnInit() {
    this.empleado = this.auth.getUser();
    this.relojTimer = setInterval(() => this.actualizarReloj(), 1000);
    this.obtenerUbicacion();
  }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString();
    this.fechaActual = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  obtenerUbicacion() {
    this.cargandoUbicacion = true;
    this.gpsError = '';

    if (!navigator.geolocation) {
      this.gpsError = 'Tu navegador no soporta geolocalización.';
      this.cargandoUbicacion = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ubicacion = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.cargandoUbicacion = false;
      },
      (error) => {
        console.error('GPS Error:', error);
        this.cargandoUbicacion = false;
        switch(error.code) {
            case error.PERMISSION_DENIED:
                this.gpsError = 'Permiso de ubicación denegado. Actívalo en tu navegador (Configuración > Privacidad).';
                break;
            case error.POSITION_UNAVAILABLE:
                this.gpsError = 'Tu ubicación no está disponible. Intenta en otra ubicación.';
                break;
            case error.TIMEOUT:
                this.gpsError = 'Tiempo agotado obteniendo ubicación. Intenta nuevamente.';
                break;
            default:
                this.gpsError = 'Error al obtener ubicación: ' + error.message;
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  marcar() {
    if (!this.ubicacion) {
        this.obtenerUbicacion();
        return;
    }

    this.procesandoMarca = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    this.api.marcarAsistencia(this.ubicacion.lat, this.ubicacion.lng).subscribe({
        next: (res: any) => {
            this.procesandoMarca = false;
            // Mostrar hora de marcado del backend o la hora actual
            const hora = res.hora || new Date().toLocaleTimeString();
            const tipo = res.tipo === 'ENTRADA' ? 'Entrada' : 'Salida';
            this.mensajeExito = `${tipo} registrada a las ${hora}`;
            // Limpiar mensaje después de 5 segundos
            const timeout = setTimeout(() => this.mensajeExito = '', 5000);
            this.limpiezaTimeouts.push(timeout);
        },
        error: (err) => {
            this.procesandoMarca = false;
            console.error(err);
            // El backend devuelve { error: "mensaje" } o { mensaje: "error" }
            const errorMsg = err.error?.error || err.error?.mensaje || 'Error de conexión con el servidor.';
            this.mensajeError = errorMsg;
            // Limpiar mensaje error después de 5 segundos
            const timeout = setTimeout(() => this.mensajeError = '', 5000);
            this.limpiezaTimeouts.push(timeout);
        }
    });
  }
}