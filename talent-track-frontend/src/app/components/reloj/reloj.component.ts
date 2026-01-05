import { Component, OnInit } from '@angular/core';
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
export class RelojComponent implements OnInit {

  horaActual: string = '';
  fechaActual: string = '';
  
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

  ngOnInit() {
    this.empleado = this.auth.getUser();
    setInterval(() => this.actualizarReloj(), 1000);
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
        console.error(error);
        this.cargandoUbicacion = false;
        switch(error.code) {
            case error.PERMISSION_DENIED:
                this.gpsError = 'Permiso de ubicación denegado. Actívalo en el navegador.';
                break;
            case error.POSITION_UNAVAILABLE:
                this.gpsError = 'La ubicación no está disponible.';
                break;
            case error.TIMEOUT:
                this.gpsError = 'Se agotó el tiempo para obtener ubicación.';
                break;
            default:
                this.gpsError = 'Error desconocido de GPS.';
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
            this.mensajeExito = `✅ ${res.mensaje} a las ${res.hora}`;
        },
        error: (err) => {
            this.procesandoMarca = false;
            console.error(err);
            // El backend devuelve { error: "mensaje" }
            this.mensajeError = err.error?.error || 'Error de conexión con el servidor.';
        }
    });
  }
}