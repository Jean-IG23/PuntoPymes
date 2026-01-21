import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Agregado DatePipe
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { filter, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  providers: [DatePipe] // Proveedor necesario para fechas
})
export class DashboardComponent implements OnInit, OnDestroy {

  // --- DATOS ---
  stats: any = {
    nombres: 'Usuario',
    rol: '',
    puesto: '',
    saldo_vacaciones: 0, // CRÍTICO para la validación
    solicitudes_pendientes: 0,
    es_lider: false,
    estado: '...'
  };

  // Datos específicos para EMPLEADOS
  misUltimasSolicitudes: any[] = [];
  tiposAusencia: any[] = [];

  // --- UI & RELOJ ---
  fechaActual = new Date();
  horaActual = '';
  intervaloReloj: any;
  loading = true;

  // --- MODAL SOLICITUD & VALIDACIÓN (LO QUE FALTABA) ---
  showModalSolicitud = false;
  formSolicitud: FormGroup;
  procesandoSolicitud = false;
  minDate: string = '';
  diasCalculados: number = 0; // <--- FALTABA ESTO

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private fb: FormBuilder
  ) {
    // Inicializar fecha mínima para el HTML
    this.minDate = new Date().toISOString().split('T')[0];

    // Formulario
    this.formSolicitud = this.fb.group({
      tipo_ausencia: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]]
    });

    // Recarga al navegar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => this.cargarDashboard());
  }

  ngOnInit() {
    this.iniciarReloj();
    this.cargarDashboard();
    
    // --- ESCUCHA ACTIVA DE FECHAS (NUEVO) ---
    // Esto calcula los días automáticamente cuando el usuario cambia las fechas
    this.formSolicitud.valueChanges.subscribe(val => {
      if (val.fecha_inicio && val.fecha_fin) {
        this.calcularDias(val.fecha_inicio, val.fecha_fin);
      }
    });
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
  // 1. CARGA DE DATOS
  // ================================================================
  cargarDashboard() {
    this.loading = true;
    this.api.getStats().subscribe({
      next: (res) => {
        this.stats = res;
        this.loading = false;
        
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
    this.api.getTiposAusencia().subscribe((res: any) => {
      this.tiposAusencia = Array.isArray(res) ? res : res.results;
    });

    this.api.getSolicitudes().subscribe((res: any) => {
      const lista = Array.isArray(res) ? res : res.results;
      this.misUltimasSolicitudes = lista.slice(0, 3);
    });
  }

  // ================================================================
  // 2. LÓGICA DE CÁLCULO DE DÍAS (NUEVO - REQUERIDO POR HTML)
  // ================================================================
  calcularDias(inicio: string, fin: string) {
    const dInicio = new Date(inicio);
    const dFin = new Date(fin);

    // Si fecha fin es menor que inicio, error
    if (dFin < dInicio) {
      this.diasCalculados = -1; 
      return;
    }

    const diffTime = Math.abs(dFin.getTime() - dInicio.getTime());
    // +1 para incluir el día de inicio
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    
    this.diasCalculados = diffDays;
  }

  // ================================================================
  // 3. SOLICITUDES (CON VALIDACIÓN DE SALDO)
  // ================================================================
  abrirModalSolicitud() {
    this.showModalSolicitud = true;
    this.formSolicitud.reset();
    this.diasCalculados = 0; // Reiniciar contador
  }

  enviarSolicitud() {
    if (this.formSolicitud.invalid) {
      Swal.fire('Formulario Incompleto', 'Por favor llena todos los campos.', 'warning');
      return;
    }

    // --- VALIDACIÓN DE NEGOCIO (NUEVO) ---
    // Verificar si pide más días de los que tiene
    const tipoId = this.formSolicitud.value.tipo_ausencia;
    const tipo = this.tiposAusencia.find(t => t.id == tipoId);
    
    // Asumimos que si contiene "Vacaciones" o tiene un flag 'afecta_sueldo'
    const esVacaciones = tipo?.nombre.toLowerCase().includes('vacaciones') || tipo?.afecta_sueldo;

    if (esVacaciones && this.diasCalculados > this.stats.saldo_vacaciones) {
       Swal.fire('Saldo Insuficiente', `Solo tienes ${this.stats.saldo_vacaciones} días disponibles.`, 'error');
       return;
    }
    // -------------------------------------

    this.procesandoSolicitud = true;
    
    // Inyectamos dias_solicitados
    const payload = { 
        ...this.formSolicitud.value, 
        dias_solicitados: this.diasCalculados 
    };

    this.api.createSolicitud(payload)
      .pipe(finalize(() => {
          this.procesandoSolicitud = false;
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.showModalSolicitud = false;
          
          Swal.fire({
            icon: 'success',
            title: '¡Solicitud Enviada!',
            text: 'Tu solicitud ha sido registrada.',
            timer: 2000,
            showConfirmButton: false
          });

          this.formSolicitud.reset();
          this.diasCalculados = 0;
          this.cargarDashboard(); 
        },
        error: (e) => {
          const serverError = e.error?.error || 'Ocurrió un error inesperado.';
          Swal.fire({
            icon: 'error',
            title: 'Solicitud Rechazada',
            text: serverError,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#d33'
          });
        }
      });
  }

  // ================================================================
  // 4. ASISTENCIA
  // ================================================================
  marcarAsistencia(tipo: string) { 
    Swal.fire({
      title: `¿Registrar ${tipo}?`, // <--- Usamos la variable aquí para el UX
      text: "Se validará tu ubicación GPS.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      confirmButtonColor: '#4F46E5',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarMarcaje(); // Al backend no le enviamos el tipo, él es inteligente y sabe qué toca.
      }
    });
  }

  ejecutarMarcaje() {
    // Feedback visual de carga
    Swal.fire({
      title: 'Localizando...',
      text: 'Buscando señal GPS',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    if (!navigator.geolocation) {
      Swal.fire('Error', 'Tu navegador no soporta GPS.', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        // Enviamos solo coordenadas, el backend calcula si es Entrada o Salida
        this.api.marcarAsistencia(lat, lng).subscribe({
          next: (res: any) => {
            Swal.fire({
              icon: 'success',
              title: res.mensaje, // "Entrada registrada" o "Salida registrada"
              text: `Ubicación: ${res.sucursal || 'Detectada'} | Distancia: ${res.distancia || 'OK'}`,
              timer: 3000
            });
            this.cargarDashboard(); // Actualizamos las tarjetas del dashboard
          },
          error: (e) => {
            Swal.fire('Error', e.error?.error || 'No se pudo registrar la marca.', 'error');
          }
        });
      },
      (err) => {
        let msg = 'Error de GPS.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado.';
        if (err.code === 2) msg = 'Ubicación no disponible.';
        if (err.code === 3) msg = 'Tiempo de espera agotado.';
        Swal.fire('Error GPS', msg, 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  enviarAlBackend(data: any) {
    this.api.registrarAsistencia(data).subscribe({
      next: (res) => {
        Swal.fire('Correcto', res.mensaje || 'Asistencia registrada', 'success');
        this.cargarDashboard();
      },
      error: (e) => {
        Swal.fire('Error', e.error?.error || 'No se pudo registrar', 'error');
      }
    });
  }
}