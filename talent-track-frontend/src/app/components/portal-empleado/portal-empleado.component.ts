import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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
  
  usuarioNombre: string = '';
  empresaNombre: string = '';

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit() {
    // 1. Iniciar reloj
    this.actualizarReloj();
    this.timer = setInterval(() => this.actualizarReloj(), 1000);

    // 2. Obtener datos del usuario (desde localStorage o token)
    // Por simplicidad, tomamos lo que guardamos en el login
    this.empresaNombre = localStorage.getItem('nombre_empresa') || 'Mi Empresa';
    // Idealmente, haríamos una petición al backend para traer el nombre del empleado
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  actualizarReloj() {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString();
    this.fechaActual = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  marcar(tipo: 'CHECK_IN' | 'CHECK_OUT') {
    // Aquí necesitamos saber el ID del empleado logueado.
    // Como MVP, vamos a asumir que el backend es inteligente o enviamos un ID guardado.
    // *NOTA PARA TI:* Para que esto sea 100% real, el login debe devolver el 'empleado_id'.
    
    // Simularemos la marca exitosa visualmente por ahora
    alert(`✅ Marcación de ${tipo === 'CHECK_IN' ? 'ENTRADA' : 'SALIDA'} registrada a las ${this.horaActual}`);
    
    /* Código real para conectar con API:
    const marca = {
      tipo: tipo,
      registrado_el: new Date().toISOString(),
      latitud: 0, // Aquí usaríamos geolocalización del navegador
      longitud: 0,
      fuente: 'WEB'
    };
    this.api.saveMarca(marca).subscribe(...);
    */
  }
}