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
  styleUrls: ['./solicitudes.component.css'],
  providers: [DatePipe]
})
export class SolicitudesComponent implements OnInit {
  
  // --- VARIABLES UI ---
  showModal = false;           
  showModalTipos = false;      
  isJefeOrRRHH = false;        
  loadingAction = false;       
  saldoVacaciones = 0;
  loading = false;
  
  // --- DATOS ---
  misSolicitudes: any[] = [];
  pendientesDeAprobar: any[] = []; 
  tiposAusencia: any[] = [];
  solicitudesFiltradas: any[] = [];
  
  // --- GESTIÓN DE TIPOS ---
  nuevoTipo = { nombre: '', afecta_sueldo: false };
  procesandoTipo = false;
  editandoTipo: any = null;

  // --- FORMULARIO ---
  activeTab: 'MIS_SOLICITUDES' | 'EQUIPO' = 'MIS_SOLICITUDES';
  formSolicitud: FormGroup;
  minDate: string = '';
  diasCalculados: number = 0;
  
  // --- FILTROS Y BÚSQUEDA ---
  filtroEstado = 'TODOS';
  filtroTipo = 'TODOS';
  busqueda = '';
  ordenarPor: 'fecha' | 'estado' | 'dias' = 'fecha'; 

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
    this.loading = true;
    forkJoin({
        tipos: this.api.getTiposAusencia(),
        solicitudes: this.api.getSolicitudes(),
        stats: this.api.getStats()
    }).pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (res: any) => {
            this.saldoVacaciones = res.stats.saldo_vacaciones || 0;
            
            // FIX: API retorna un arreglo directo, no dentro de .results
            if (Array.isArray(res.tipos)) {
              this.tiposAusencia = res.tipos;
            } else if (res.tipos?.results && Array.isArray(res.tipos.results)) {
              this.tiposAusencia = res.tipos.results;
            } else {
              this.tiposAusencia = [];
            }
            
            // FIX: Manejar solicitudes con el mismo patrón
            let todas: any[] = [];
            if (Array.isArray(res.solicitudes)) {
              todas = res.solicitudes;
            } else if (res.solicitudes?.results && Array.isArray(res.solicitudes.results)) {
              todas = res.solicitudes.results;
            }
            
            const userId = this.auth.getUser().id;

            this.misSolicitudes = todas.filter((s: any) => {
                const empId = s.empleado.id || s.empleado;
                return empId === userId;
            }).sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());

            if (this.isJefeOrRRHH) {
                this.pendientesDeAprobar = todas.filter((s: any) => {
                    const empId = s.empleado.id || s.empleado;
                    return s.estado === 'PENDIENTE' && empId !== userId;
                }).sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
            }
            
            this.cdr.markForCheck();
            this.aplicarFiltros();
        },
        error: (e) => {
            console.error('Error cargando datos:', e);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        }
    });
  }

  // --- FILTROS Y BÚSQUEDA ---
  aplicarFiltros() {
    let datos = this.activeTab === 'MIS_SOLICITUDES' ? this.misSolicitudes : this.pendientesDeAprobar;
    
    // Filtrar por estado
    if (this.filtroEstado !== 'TODOS') {
      datos = datos.filter(s => s.estado === this.filtroEstado);
    }
    
    // Filtrar por tipo
    if (this.filtroTipo !== 'TODOS') {
      datos = datos.filter(s => s.tipo_ausencia == this.filtroTipo);
    }
    
    // Búsqueda por motivo o empleado
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase();
      datos = datos.filter(s => 
        (s.motivo?.toLowerCase() || '').includes(q) ||
        (s.empleado_nombre?.toLowerCase() || '').includes(q) ||
        (s.nombre_tipo?.toLowerCase() || '').includes(q)
      );
    }
    
    // Ordenar
    datos.sort((a, b) => {
      if (this.ordenarPor === 'fecha') {
        return new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime();
      } else if (this.ordenarPor === 'estado') {
        return a.estado.localeCompare(b.estado);
      } else if (this.ordenarPor === 'dias') {
        return (b.dias_solicitados || 0) - (a.dias_solicitados || 0);
      }
      return 0;
    });
    
    this.solicitudesFiltradas = datos;
  }

  // Métodos helper para filtros
  getTiposUnicos() {
    return [...new Set(this.tiposAusencia.map(t => t.id))];
  }

  getNombreTipo(tipoId: number): string {
    return this.tiposAusencia.find(t => t.id === tipoId)?.nombre || 'Desconocido';
  }

  getColorEstado(estado: string): string {
    const colores: {[key: string]: string} = {
      'PENDIENTE': 'text-yellow-600 bg-yellow-50 border border-yellow-200',
      'APROBADA': 'text-green-600 bg-green-50 border border-green-200',
      'RECHAZADA': 'text-red-600 bg-red-50 border border-red-200'
    };
    return colores[estado] || 'text-gray-600 bg-gray-50 border border-gray-200';
  }

  getColorTipo(tipoId: number): string {
    const tipo = this.tiposAusencia.find(t => t.id === tipoId);
    if (!tipo) return 'bg-gray-400';
    
    if (tipo.nombre.toLowerCase().includes('vacaciones')) return 'bg-yellow-400';
    if (tipo.nombre.toLowerCase().includes('enfermedad') || tipo.nombre.toLowerCase().includes('licencia')) return 'bg-red-400';
    if (tipo.nombre.toLowerCase().includes('calamidad') || tipo.nombre.toLowerCase().includes('emergencia')) return 'bg-orange-400';
    return 'bg-blue-400';
  }

  getIconoTipo(tipoId: number): string {
    const tipo = this.tiposAusencia.find(t => t.id === tipoId);
    if (!tipo) return 'bi-calendar-x';
    
    if (tipo.nombre.toLowerCase().includes('vacaciones')) return 'bi-sun-fill';
    if (tipo.nombre.toLowerCase().includes('enfermedad') || tipo.nombre.toLowerCase().includes('licencia')) return 'bi-hospital';
    if (tipo.nombre.toLowerCase().includes('calamidad') || tipo.nombre.toLowerCase().includes('emergencia')) return 'bi-exclamation-circle-fill';
    return 'bi-calendar-event';
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
            title: '✅ Aprobar Solicitud',
            html: `<div class="text-left">
              <p><strong>${solicitud.empleado_nombre || 'Empleado'}</strong></p>
              <p class="text-sm text-gray-600 mt-2">Tipo: <strong>${solicitud.nombre_tipo}</strong></p>
              <p class="text-sm text-gray-600">Duración: <strong>${solicitud.dias_solicitados} días</strong></p>
              <p class="text-sm text-gray-600 mt-3">Se descontarán los días del saldo disponible.</p>
            </div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10B981',
            cancelButtonColor: '#6B7280',
            confirmButtonText: '<i class="bi bi-check-lg"></i> Sí, Aprobar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) this.enviarGestion(solicitud, estado);
        });
    } else {
        Swal.fire({
            title: '❌ Rechazar Solicitud',
            html: `<div class="text-left">
              <p><strong>${solicitud.empleado_nombre || 'Empleado'}</strong></p>
              <p class="text-sm text-gray-600 mt-2">Tipo: <strong>${solicitud.nombre_tipo}</strong></p>
            </div>`,
            input: 'textarea',
            inputPlaceholder: 'Indica el motivo del rechazo...',
            inputAttributes: { 'class': 'swal-input-custom', required: 'true' },
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: '<i class="bi bi-x-lg"></i> Rechazar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed && result.value && result.value.trim()) {
                this.enviarGestion(solicitud, estado, result.value);
            } else if (result.isConfirmed) {
                Swal.fire('Error', 'Debes indicar un motivo de rechazo', 'error');
            }
        });
    }
  }

  enviarGestion(solicitud: any, estado: string, motivo: string = '') {
    this.loadingAction = true;
    
    this.api.gestionarSolicitud(solicitud.id, estado, motivo)
      .pipe(finalize(() => {
          this.loadingAction = false;
          this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
            Swal.fire({
                title: estado === 'APROBADA' ? '✅ Aprobada' : '❌ Rechazada', 
                text: estado === 'APROBADA' ? 'Solicitud procesada correctamente.' : 'Solicitud rechazada y notificada.',
                icon: 'success',
                timer: 1500
            });
            this.cargarDatos();
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'Error al procesar solicitud', 'error')
      });
  }

  // --- TIPOS DE AUSENCIA ---
  guardarTipo() {
    if (!this.nuevoTipo.nombre || this.nuevoTipo.nombre.trim() === '') {
      Swal.fire('Error', 'El nombre del tipo es requerido', 'error');
      return;
    }

    this.procesandoTipo = true;
    this.api.createTipoAusencia(this.nuevoTipo)
      .pipe(finalize(() => this.procesandoTipo = false))
      .subscribe({
        next: () => {
          Swal.fire('✅ Creado', 'Tipo de ausencia agregado correctamente.', 'success');
          this.nuevoTipo = { nombre: '', afecta_sueldo: false };
          this.cargarDatos();
        },
        error: (e) => Swal.fire('Error', e.error?.error || 'No se pudo crear el tipo', 'error')
      });
  }

  eliminarTipo(id: number) {
    const tipo = this.tiposAusencia.find(t => t.id === id);
    if (tipo?.nombre.toLowerCase().includes('vacaciones')) {
      Swal.fire('Advertencia', 'No puedes eliminar el tipo "Vacaciones"', 'warning');
      return;
    }

    Swal.fire({
        title: '¿Eliminar tipo de ausencia?',
        text: `"${tipo?.nombre}" será eliminado permanentemente.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: '<i class="bi bi-trash-fill"></i> Sí, Eliminar',
        cancelButtonText: 'Cancelar'
    }).then((r) => {
        if(r.isConfirmed) {
            this.api.deleteTipoAusencia(id).subscribe({
                next: () => {
                    Swal.fire('✅ Eliminado', 'Tipo borrado correctamente.', 'success');
                    this.cargarDatos();
                },
                error: (e) => Swal.fire('Error', e.error?.error || 'No se pudo eliminar (está en uso)', 'error')
            });
        }
    });
  }

  // --- MÉTODOS DE ESTADO Y VALIDACIÓN ---
  puedeGestionar(solicitud: any): boolean {
    return solicitud.estado === 'PENDIENTE' && (this.isJefeOrRRHH || this.auth.isSuperAdmin());
  }

  obtenerEstadoBadge(estado: string) {
    const badges: {[key: string]: {texto: string, icono: string}} = {
      'PENDIENTE': { texto: 'Pendiente', icono: 'bi-hourglass-split' },
      'APROBADA': { texto: 'Aprobada', icono: 'bi-check-circle-fill' },
      'RECHAZADA': { texto: 'Rechazada', icono: 'bi-x-circle-fill' }
    };
    return badges[estado] || { texto: estado, icono: 'bi-calendar' };
  }

  obtenerDiasTexto(dias: number): string {
    if (dias === 1) return '1 día';
    return `${dias} días`;
  }

  esSolicitudReciente(fecha: string): boolean {
    const diff = new Date().getTime() - new Date(fecha).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000; // Menos de una semana
  }

  // --- NAVEGACIÓN Y MODALES ---
  cambiarTab(tab: 'MIS_SOLICITUDES' | 'EQUIPO') {
    this.activeTab = tab;
    this.filtroEstado = 'TODOS';
    this.filtroTipo = 'TODOS';
    this.busqueda = '';
    this.aplicarFiltros();
  }

  abrirModalNueva() {
    this.formSolicitud.reset();
    this.diasCalculados = 0;
    this.showModal = true;
  }

  cerrarModal() {
    this.showModal = false;
    this.formSolicitud.reset();
    this.diasCalculados = 0;
  }
}