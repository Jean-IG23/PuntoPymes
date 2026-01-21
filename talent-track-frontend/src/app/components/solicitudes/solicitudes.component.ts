import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './solicitudes.component.html',
  providers: [DatePipe]
})
export class SolicitudesComponent implements OnInit {
  
  // --- VARIABLES UI ---
  showModal = false;           
  showModalTipos = false;      
  isJefeOrRRHH = false;        
  loadingAction = false;       
  saldoVacaciones = 0; // Se actualizará automáticamente
  
  // --- DATOS ---
  misSolicitudes: any[] = [];
  pendientesDeAprobar: any[] = []; 
  tiposAusencia: any[] = [];
  
  // --- GESTIÓN DE TIPOS ---
  nuevoTipo = { nombre: '', afecta_sueldo: false };
  procesandoTipo = false;

  // --- FORMULARIO ---
  activeTab: 'MIS_SOLICITUDES' | 'EQUIPO' = 'MIS_SOLICITUDES';
  formSolicitud: FormGroup;
  minDate: string = '';
  diasCalculados: number = 0; 

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe
  ) {
    this.minDate = new Date().toISOString().split('T')[0];

    this.formSolicitud = this.fb.group({
      tipo_ausencia: ['', Validators.required],
      fecha_inicio: ['', Validators.required],
      fecha_fin: ['', Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  ngOnInit() {
    this.isJefeOrRRHH = this.auth.isManagement() || this.auth.isSuperAdmin();
    this.cargarDatos(); // Aquí ocurre la magia

    // Listener para calcular días en tiempo real
    this.formSolicitud.valueChanges.subscribe(val => {
      if (val.fecha_inicio && val.fecha_fin) {
        this.calcularDias(val.fecha_inicio, val.fecha_fin);
      }
    });
  }

  cargarDatos() {
    // Usamos forkJoin para pedir todo en paralelo usando tu servicio existente
    forkJoin({
        tipos: this.api.getTiposAusencia(),
        solicitudes: this.api.getSolicitudes(),
        stats: this.api.getStats() // <--- USAMOS TU ENDPOINT EXISTENTE
    }).subscribe({
        next: (res: any) => {
            // 1. ACTUALIZAR SALDO DESDE EL BACKEND (Dato Fresco)
            // Tu vista dashboard_stats devuelve 'saldo_vacaciones', lo leemos aquí:
            this.saldoVacaciones = res.stats.saldo_vacaciones || 0; 

            // 2. Procesar Tipos
            this.tiposAusencia = Array.isArray(res.tipos) ? res.tipos : res.tipos.results;
            
            // 3. Procesar Solicitudes
            const todas = Array.isArray(res.solicitudes) ? res.solicitudes : res.solicitudes.results;
            const userId = this.auth.getUser().id;

            // Filtrar MIS solicitudes
            this.misSolicitudes = todas.filter((s: any) => {
                const empId = s.empleado.id || s.empleado;
                return empId === userId;
            });

            // Filtrar PENDIENTES (Si soy jefe)
            if (this.isJefeOrRRHH) {
                this.pendientesDeAprobar = todas.filter((s: any) => {
                    const empId = s.empleado.id || s.empleado;
                    return s.estado === 'PENDIENTE' && empId !== userId;
                });
            }
        },
        error: (e) => console.error('Error cargando datos:', e)
    });
  }

  // --- CÁLCULO DE DÍAS ---
  calcularDias(inicio: string, fin: string) {
    const dInicio = new Date(inicio);
    const dFin = new Date(fin);

    if (dFin < dInicio) {
      this.diasCalculados = -1;
      return;
    }
    const diffTime = Math.abs(dFin.getTime() - dInicio.getTime());
    // +1 para incluir el día de inicio
    this.diasCalculados = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  }

  // --- CREAR SOLICITUD ---
  crearSolicitud() {
    if (this.formSolicitud.invalid) return;

    // Validación PRELIMINAR de Saldo (Front)
    const tipoId = this.formSolicitud.value.tipo_ausencia;
    const tipo = this.tiposAusencia.find(t => t.id == tipoId);
    
    // Detectar si es vacación por nombre o bandera
    const esVacaciones = tipo?.nombre.toLowerCase().includes('vacaciones') || tipo?.afecta_sueldo;

    if (esVacaciones && this.diasCalculados > this.saldoVacaciones) {
        Swal.fire('Saldo Insuficiente', `Solo tienes ${this.saldoVacaciones} días disponibles.`, 'error');
        return;
    }

    this.loadingAction = true;
    
    const payload = { 
        ...this.formSolicitud.value, 
        dias_solicitados: this.diasCalculados 
    };

    this.api.createSolicitud(payload)
      .pipe(finalize(() => { 
          this.loadingAction = false; 
          this.cdr.detectChanges(); 
      }))
      .subscribe({
        next: () => {
          Swal.fire('Enviado', 'Solicitud creada con éxito.', 'success');
          this.showModal = false;
          this.formSolicitud.reset();
          this.diasCalculados = 0;
          this.cargarDatos(); // Recarga y actualiza el saldo visible
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'No se pudo crear', 'error')
      });
  }

  // --- GESTIONAR (APROBAR/RECHAZAR) ---
  gestionar(solicitud: any, estado: 'APROBADA' | 'RECHAZADA') {
    if (estado === 'APROBADA') {
        Swal.fire({
            title: '¿Aprobar?',
            text: "Se descontarán los días y se notificará al empleado.",
            icon: 'warning', // Warning para que presten atención
            showCancelButton: true,
            confirmButtonColor: '#10B981', // Verde
            confirmButtonText: 'Sí, Aprobar'
        }).then((result) => {
            if (result.isConfirmed) this.enviarGestion(solicitud, estado);
        });
    } else {
        Swal.fire({
            title: 'Rechazar Solicitud',
            input: 'textarea',
            inputPlaceholder: 'Indica el motivo...',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', // Rojo
            confirmButtonText: 'Rechazar'
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                this.enviarGestion(solicitud, estado, result.value);
            }
        });
    }
  }

  enviarGestion(solicitud: any, estado: string, motivo: string = '') {
    this.loadingAction = true; // 1. Bloqueamos botones
    
    this.api.gestionarSolicitud(solicitud.id, estado, motivo)
      .pipe(finalize(() => {
          this.loadingAction = false; // 2. Desbloqueamos al terminar
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
            Swal.fire({
                title: 'Procesado', 
                text: res.status, 
                icon: 'success',
                timer: 1500 // Se cierra solo rápido
            });
            // 3. ESTA LÍNEA ES LA CLAVE: Trae el saldo nuevo
            this.cargarDatos(); 
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'Error', 'error')
      });
  }

  // --- TIPOS DE AUSENCIA ---
  guardarTipo() {
    if (!this.nuevoTipo.nombre) return;
    this.procesandoTipo = true;
    this.api.createTipoAusencia(this.nuevoTipo)
      .pipe(finalize(() => this.procesandoTipo = false))
      .subscribe(() => {
        Swal.fire('Creado', 'Tipo agregado.', 'success');
        this.nuevoTipo = { nombre: '', afecta_sueldo: false };
        this.cargarDatos();
      });
  }

  eliminarTipo(id: number) {
    Swal.fire({
        title: '¿Eliminar?',
        text: "No se podrá recuperar.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then((r) => {
        if(r.isConfirmed) {
            this.api.deleteTipoAusencia(id).subscribe({
                next: () => {
                    Swal.fire('Eliminado', 'Tipo borrado.', 'success');
                    this.cargarDatos();
                },
                error: () => Swal.fire('Error', 'Está en uso.', 'error')
            });
        }
    });
  }
}