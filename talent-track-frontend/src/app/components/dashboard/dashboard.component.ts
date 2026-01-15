import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit, OnDestroy {

  // --- DATOS ---
  stats: any = {
    nombres: 'Usuario',
    rol: '',
    puesto: '',
    saldo_vacaciones: 0,
    solicitudes_pendientes: 0, // Para líderes (cuántas deben aprobar)
    es_lider: false,
    estado: '...'
  };

  // Datos específicos para EMPLEADOS (Auto-gestión)
  misUltimasSolicitudes: any[] = [];
  tiposAusencia: any[] = [];

  // --- UI & RELOJ ---
  fechaActual = new Date();
  horaActual = '';
  intervaloReloj: any;
  loading = true;

  // --- MODAL SOLICITUD ---
  showModalSolicitud = false;
  formSolicitud: FormGroup;
  procesandoSolicitud = false;

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Formulario para pedir vacaciones desde el Dashboard
    this.formSolicitud = this.fb.group({
      tipo_ausencia: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]]
    });

    // Recarga al navegar (mantiene datos frescos)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => this.cargarDashboard());
  }
  minDate: string = '';
  ngOnInit() {
    this.iniciarReloj();
    this.cargarDashboard();
    this.minDate = new Date().toISOString().split('T')[0];
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

  // ================================================================
  // 1. CARGA DE DATOS (INTELIGENTE SEGÚN ROL)
  // ================================================================
  cargarDashboard() {
    this.loading = true;
    this.api.getStats().subscribe({
      next: (res) => {
        this.stats = res;
        this.loading = false;
        
        // Si NO es líder (es Empleado base), cargamos sus herramientas personales
        if (!this.stats.es_lider) {
          this.cargarDatosEmpleado();
        }
        
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('Error dashboard:', e);
        this.loading = false;
      }
    });
  }

  cargarDatosEmpleado() {
    // 1. Tipos de ausencia para el select
    this.api.getTiposAusencia().subscribe((res: any) => {
      this.tiposAusencia = Array.isArray(res) ? res : res.results;
    });

    // 2. Historial reciente (limitado a 3)
    this.api.getSolicitudes().subscribe((res: any) => {
      // Como es empleado, el backend ya filtra las suyas en getSolicitudes
      const lista = Array.isArray(res) ? res : res.results;
      this.misUltimasSolicitudes = lista.slice(0, 3); // Solo las 3 últimas
    });
  }

  // ================================================================
  // 2. SOLICITUDES RÁPIDAS (NUEVO)
  // ================================================================
  abrirModalSolicitud() {
    this.showModalSolicitud = true;
    this.formSolicitud.reset();
  }

  enviarSolicitud() {
    if (this.formSolicitud.invalid) {
      Swal.fire('Formulario Incompleto', 'Por favor llena todos los campos correctamente.', 'warning');
      return;
    }

    this.procesandoSolicitud = true;
    this.api.createSolicitud(this.formSolicitud.value).subscribe({
      next: () => {
        this.procesandoSolicitud = false;
        this.showModalSolicitud = false; // Cerrar modal
        
        // Alerta de Éxito
        Swal.fire({
          icon: 'success',
          title: '¡Solicitud Enviada!',
          text: 'Tu solicitud ha sido registrada y tu jefe notificado.',
          timer: 2500,
          showConfirmButton: false
        });

        this.formSolicitud.reset();
        
        this.cargarDashboard(); 
      },
      error: (e) => {
        this.procesandoSolicitud = false;
        
        // Obtenemos el mensaje exacto que escribimos en Python
        const serverError = e.error?.error || 'Ocurrió un error inesperado.';
        
        Swal.fire({
          icon: 'error',
          title: 'Solicitud Rechazada',
          text: serverError, // Aquí se verá el mensaje detallado
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  // ================================================================
  // 3. ASISTENCIA (GEOLOCALIZACIÓN)
  // ================================================================
  marcarAsistencia(tipo: 'ENTRADA' | 'SALIDA') {
    Swal.fire({
      title: `¿Registrar ${tipo}?`,
      text: "Se guardará tu ubicación actual.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      confirmButtonColor: '#4F46E5'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarMarcaje(tipo);
      }
    });
  }

  ejecutarMarcaje(tipo: string) {
    if (!navigator.geolocation) {
      this.enviarAlBackend({ lat: 0, lng: 0, tipo });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.enviarAlBackend({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          tipo: tipo
        });
      },
      (err) => {
        console.warn('GPS falló, enviando sin ubicación');
        this.enviarAlBackend({ lat: 0, lng: 0, tipo });
      },
      { timeout: 5000 }
    );
  }

  enviarAlBackend(data: any) {
    this.api.registrarAsistencia(data).subscribe({
      next: (res) => {
        Swal.fire('Correcto', res.mensaje || 'Asistencia registrada', 'success');
        this.cargarDashboard(); // Actualizar estado visual
      },
      error: (e) => {
        Swal.fire('Error', e.error?.error || 'No se pudo registrar', 'error');
      }
    });
  }
}