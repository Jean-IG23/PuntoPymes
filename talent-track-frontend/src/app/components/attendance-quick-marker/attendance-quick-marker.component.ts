import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-attendance-quick-marker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attendance-quick-marker.component.html',
  styleUrl: './attendance-quick-marker.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceQuickMarkerComponent implements OnInit, OnDestroy {

  // Output para notificar al padre cuando se marca asistencia
  @Output() asistenciaMarcada = new EventEmitter<any>();

  // Estado de la jornada
  jornadaAbierta: boolean = false;
  horaActual: string = '';
  
  // Estado del GPS
  ubicacion: { lat: number, lng: number } | null = null;
  gpsError: string = '';
  cargandoUbicacion = true;
  procesandoMarca = false;

  // Datos del usuario
  empleado: any = null;
  
  // Timers
  private relojTimer: any;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.actualizarReloj();
  }

  ngOnInit() {
    this.empleado = this.auth.getUser();
    this.cdr.markForCheck();
    this.relojTimer = setInterval(() => {
      this.actualizarReloj();
      this.cdr.markForCheck();
    }, 1000);
    this.obtenerUbicacion();
  }

  ngOnDestroy() {
    if (this.relojTimer) clearInterval(this.relojTimer);
  }

  actualizarReloj() {
    const now = new Date();
    this.horaActual = now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  obtenerUbicacion() {
    this.cargandoUbicacion = true;
    this.gpsError = '';
    this.cdr.markForCheck();

    if (!navigator.geolocation) {
      this.gpsError = 'Tu navegador no soporta geolocalización.';
      this.cargandoUbicacion = false;
      this.cdr.markForCheck();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ubicacion = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        this.cargandoUbicacion = false;
        this.cdr.markForCheck();
      },
      (error) => {
        console.error('GPS Error:', error);
        this.cargandoUbicacion = false;
        this.cdr.markForCheck();
        switch(error.code) {
            case error.PERMISSION_DENIED:
                this.gpsError = 'Permiso de ubicación denegado. Actívalo en tu navegador.';
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
        this.cdr.markForCheck();
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
    this.cdr.markForCheck();

    this.api.marcarAsistencia(this.ubicacion.lat, this.ubicacion.lng).subscribe({
        next: (res: any) => {
            this.procesandoMarca = false;
            const tipo = res.tipo === 'ENTRADA' ? 'Entrada' : 'Salida';
            const hora = res.hora || new Date().toLocaleTimeString();
            
            // Actualizar estado de jornada
            this.jornadaAbierta = res.tipo === 'ENTRADA';
            this.cdr.markForCheck();
            
            // Emitir evento para que el dashboard se actualice
            this.asistenciaMarcada.emit({ tipo: res.tipo, hora: hora });
            
            Swal.fire({
                title: res.tipo === 'ENTRADA' ? '¡Bienvenido!' : '¡Hasta pronto!',
                text: `${tipo} registrada a las ${hora}`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            });
        },
        error: (err) => {
            this.procesandoMarca = false;
            this.cdr.markForCheck();
            const errorMsg = err.error?.error || err.error?.mensaje || 'Error de conexión con el servidor.';
            Swal.fire('Error', errorMsg, 'error');
        }
    });
  }

  reintentar() {
    this.gpsError = '';
    this.obtenerUbicacion();
  }
}
