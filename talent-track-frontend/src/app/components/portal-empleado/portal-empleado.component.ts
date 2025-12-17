import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-portal-empleado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portal-empleado.component.html',
  styleUrl: './portal-empleado.component.css'
})
export class PortalEmpleadoComponent implements OnInit, OnDestroy {
  
  horaActual: string = '';
  fechaActual: string = '';
  timer: any;
  nombreEmpresa: string = '';
  empleadoNombre: string = ''; // Para saludar
  cargando: boolean = false;

  constructor(
    private api: ApiService, 
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.actualizarReloj();
    this.timer = setInterval(() => this.actualizarReloj(), 1000);
    
    this.nombreEmpresa = localStorage.getItem('nombre_empresa') || 'Mi Trabajo';
    // Opcional: Podrías guardar el nombre del usuario en localStorage al login para mostrarlo aquí
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  actualizarReloj() {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString();
    this.fechaActual = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  marcar(tipo: 'ENTRADA' | 'SALIDA' | 'INICIO_ALMUERZO' | 'FIN_ALMUERZO') {
    if (this.cargando) return;
    
    // OJO: El tipo debe coincidir con lo que espera tu Backend (ENTRADA, SALIDA)
    // Ajustaremos esto si tu backend usa ingles (CHECK_IN)
    
    this.cargando = true;

    // Objeto Marca
    const marca = {
      tipo: tipo, // El backend debe soportar estos strings
      latitud: 0,
      longitud: 0
    };

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          marca.latitud = pos.coords.latitude;
          marca.longitud = pos.coords.longitude;
          this.enviar(marca);
        },
        () => this.enviar(marca) // Si falla GPS, envía igual
      );
    } else {
      this.enviar(marca);
    }
  }

  enviar(data: any) {
    this.api.registrarAsistencia(data).subscribe(
      (res: any) => {
        this.cargando = false;
        alert(`✅ Marca de ${data.tipo} registrada con éxito.`);
      },
      (err: any) => {
        this.cargando = false;
        console.error(err);
        alert('Error al registrar asistencia.');
      }
    );
  }

  salir() {
    this.auth.logout();
  }
}